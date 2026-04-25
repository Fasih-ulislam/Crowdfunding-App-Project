import pool from "../config/database.js";

export async function getUserNotifications(userId, limit = 50, offset = 0) {
  const { rows } = await pool.query(
    `SELECT id, type, title, message, is_read, created_at 
     FROM notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}

export async function markNotificationAsRead(userId, notificationId) {
  const { rows } = await pool.query(
    `UPDATE notifications 
     SET is_read = TRUE 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [notificationId, userId]
  );
  return rows[0] || null;
}

export async function markAllNotificationsAsRead(userId) {
  const { rowCount } = await pool.query(
    `UPDATE notifications 
     SET is_read = TRUE 
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rowCount;
}
