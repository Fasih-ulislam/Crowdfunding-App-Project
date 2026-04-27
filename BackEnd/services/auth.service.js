import writePool, { readPool } from "../config/database.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import ResponseError from "../utils/customError.js";
import { transporter, mailOptions } from "../config/nodemailer.js";

// ── Generate OTP (6 digits) ──────────────────────────────────
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Send OTP email ───────────────────────────────────────────
async function sendOtpEmail(email, otp) {
  await transporter.sendMail(
    mailOptions(
      email,
      "Your OTP Code",
      `Your OTP is ${otp}`,
      `<p>Your OTP code is <b>${otp}</b>. It will expire in 10 minutes.</p>`,
    ),
  );
}

// ─────────────────────────────────────────────────────────────
// 🔐 LOGIN USER
// ─────────────────────────────────────────────────────────────
export async function loginUser({ email, password, activeRole }) {
  // Get user
  const { rows } = await readPool.query(`SELECT * FROM users WHERE email = $1`, [
    email,
  ]);

  const user = rows[0];
  if (!user) throw new ResponseError("Invalid Credentials", 401);

  // Verify password
  if (!(await bcrypt.compare(password, user.password_hash)))
    throw new ResponseError("Invalid Credentials", 401);

  // Verify user actually has the requested role
  const { rows: roleRows } = await readPool.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1 AND r.name = $2`,
    [user.id, activeRole],
  );

  if (roleRows.length === 0)
    throw new ResponseError(`You do not have the ${activeRole} role.`, 403);

  return { ...user, role: activeRole };
}

// ─────────────────────────────────────────────────────────────
// 🟨 REGISTER USER
// ─────────────────────────────────────────────────────────────
export async function registerUser({ email, password }) {
  // Check if already a verified user
  const { rows: existing } = await readPool.query(
    `SELECT id FROM users WHERE email = $1`,
    [email],
  );
  if (existing.length > 0) throw new ResponseError("User already exists", 409);

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  console.log(otp);

  // Atomic: delete old pending + insert new pending
  const client = await writePool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM pending_users WHERE email = $1`, [email]);

    await client.query(
      `INSERT INTO pending_users (email, password_hash, otp_code, otp_expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, hashedPassword, otp, otpExpiry],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await sendOtpEmail(email, otp);

  return { message: "OTP sent to email" };
}

// ─────────────────────────────────────────────────────────────
// 🟩 VERIFY OTP
// ─────────────────────────────────────────────────────────────
export async function verifyOtp({ email, otp }) {
  const { rows } = await readPool.query(
    `SELECT * FROM pending_users WHERE email = $1`,
    [email],
  );

  const pendingUser = rows[0];
  if (!pendingUser) throw new ResponseError("No pending user found", 404);

  // Check expiry
  if (new Date() > new Date(pendingUser.otp_expires_at)) {
    await writePool.query(`DELETE FROM pending_users WHERE email = $1`, [email]);
    throw new ResponseError("OTP expired. Please register again.", 401);
  }

  // Timing-safe OTP comparison
  const otpBuffer = Buffer.from(otp.padEnd(6, "0"));
  const storedOtpBuffer = Buffer.from(pendingUser.otp_code.padEnd(6, "0"));
  const isValidOtp = crypto.timingSafeEqual(otpBuffer, storedOtpBuffer);

  if (!isValidOtp) throw new ResponseError("Invalid OTP", 401);

  // Atomic: create user + delete pending
  // DB trigger auto-creates user_profile + assigns Donor role on INSERT
  const client = await writePool.connect();
  try {
    await client.query("BEGIN");

    const { rows: created } = await client.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, trust_score, created_at`,
      [pendingUser.email, pendingUser.password_hash],
    );

    await client.query(`DELETE FROM pending_users WHERE email = $1`, [email]);

    await client.query("COMMIT");

    return created[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
