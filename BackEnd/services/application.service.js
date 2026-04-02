import pool from "../config/database.js";
import ResponseError from "../utils/customError.js";

// 🟩 Submit a new application
export async function submitApplication(userId, data) {
  // Check if user already has a pending application
  const existingCheck = await pool.query(
    "SELECT * FROM role_applications WHERE user_id = $1 AND status = $2",
    [userId, "Pending"]
  );

  if (existingCheck.rows.length > 0) {
    throw new ResponseError("You already have a pending application", 409);
  }

  const result = await pool.query(
    "INSERT INTO role_applications (user_id, phone, work_email, address, facebook_url, instagram_url, linkedin_url, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *",
    [userId, data.phone, data.work_email, data.address, data.facebook_url || null, data.instagram_url || null, data.linkedin_url || null, "Pending"]
  );

  return result.rows[0];
}

// 🟦 Get my applications
export async function getMyApplications(userId) {
  const result = await pool.query(
    "SELECT * FROM role_applications WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );

  return result.rows;
}

// 🟨 Get all applications (admin only)
export async function getAllApplications() {
  const result = await pool.query(
    "SELECT ra.*, u.email, u.id as user_id FROM role_applications ra LEFT JOIN users u ON ra.user_id = u.id ORDER BY ra.created_at DESC"
  );

  return result.rows;
}

// 🟧 Approve or reject application (admin only)
export async function approveOrRejectApplication(applicationId, data) {
  const appCheck = await pool.query(
    "SELECT * FROM role_applications WHERE id = $1",
    [applicationId]
  );

  if (appCheck.rows.length === 0) {
    throw new ResponseError("Application doesn't exist", 404);
  }

  const application = appCheck.rows[0];
  const status = data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase();

  const result = await pool.query(
    "UPDATE role_applications SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *",
    [status, data.reviewed_by || null, applicationId]
  );

  // If approved, add Creator role to user
  if (status === "Approved") {
    try {
      await pool.query(
        "INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, role_id) DO NOTHING",
        [application.user_id, 2] // role_id 2 = Creator
      );
    } catch (err) {
      // User might already have this role, continue anyway
      console.log("Role assignment:", err.message);
    }
  }

  return result.rows[0];
}
