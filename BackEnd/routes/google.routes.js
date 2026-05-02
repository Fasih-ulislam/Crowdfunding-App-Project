import { Router } from "express";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";
import dotenv from "dotenv";
dotenv.config();

const router = Router();

// Redirect to Google
router.get(
  "/google",
  passport.authenticate("google", { 
    scope: ["profile", "email"], 
    session: false,
    prompt: "select_account"
  })
);

// Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    const user = req.user;
    const roles = user.roles || ["Donor"];

    // Always create temp token → always redirect to login page for role selection
    const tempToken = jwt.sign(
      { google_id: user.google_id, email: user.email, roles },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/login?temp_token=${tempToken}`
    );
  }
);

// Role selection endpoint
router.post("/google/select-role", async (req, res) => {
  try {
    const { temp_token, role } = req.body;

    // Verify temp token
    const decoded = jwt.verify(temp_token, process.env.JWT_SECRET);

    // Make sure selected role is in their roles
    if (!decoded.roles.includes(role)) {
      return res.status(403).json({ message: "Invalid role selection" });
    }

    // Get full user from DB
    const { rows } = await pool.query(
      `SELECT u.*, up.display_name, up.profile_picture_url
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.google_id = $1`,
      [decoded.google_id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    const token = generateRealToken(user, role);
    setTokenCookie(res, token);

    res.json({ success: true, dashboard: getDashboard(role) });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// Helpers
function generateRealToken(user, role) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role,
      name: user.display_name,
      avatar: user.profile_picture_url,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 60 * 60 * 1000,
  });
}

function getDashboard(role) {
  const dashboards = {
    Donor: "/donor/dashboard",
    Creator: "/creator/dashboard",
    Admin: "/admin",
  };
  return dashboards[role] || "/donor/dashboard";
}

export default router;