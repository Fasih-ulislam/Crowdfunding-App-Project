import pool from "../config/database.js";
import bcrypt from "bcrypt";

// 🟩 Create a new user (used for manual signup or admin panel)
export async function createUser(data) {
  const { email, password, ...rest } = data;

  let hashedPassword;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *",
    [email, hashedPassword]
  );

  return result.rows[0];
}

// 🟦 Get all users (admin-only)
export async function getAllUsers() {
  const result = await pool.query(
    `SELECT u.*, up.display_name, up.bio, cp.stripe_account_id
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     LEFT JOIN creator_profiles cp ON u.id = cp.user_id`
  );
  return result.rows;
}

// 🟨 Get user by ID
export async function getUserById(id) {
  const result = await pool.query(
    `SELECT u.*, up.display_name, up.bio, up.profile_picture_url, up.location, up.phone, cp.stripe_account_id
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     LEFT JOIN creator_profiles cp ON u.id = cp.user_id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0];
}

// 🟧 Get user by email (useful for login)
export async function getUserByEmail(email) {
  const result = await pool.query(
    `SELECT u.*, up.display_name, up.bio, up.profile_picture_url, up.location, up.phone, cp.stripe_account_id
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     LEFT JOIN creator_profiles cp ON u.id = cp.user_id
     WHERE u.email = $1`,
    [email]
  );
  return result.rows[0];
}

// 🟥 Update user info
export async function updateUser(email, data) {
  if (data.password) {
    data.password_hash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }

  const keys = Object.keys(data);
  const values = Object.values(data);

  if (keys.length === 0) return null;

  const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");

  const result = await pool.query(
    `UPDATE users SET ${setClause} WHERE email = $${keys.length + 1} RETURNING *`,
    [...values, email]
  );

  return result.rows[0];
}

// ⬛ Delete user
export async function deleteUser(email) {
  const result = await pool.query(
    "DELETE FROM users WHERE email = $1 RETURNING *",
    [email]
  );
  return result.rows[0];
}
