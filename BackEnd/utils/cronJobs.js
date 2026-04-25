import cron from "node-cron";
import pool from "../config/database.js";
import { sendEmail } from "./email.service.js";

export function startCronJobs() {
  cron.schedule("* * * * *", async () => {
    try {
      const { rows } = await pool.query(
        `SELECT id FROM milestones
         WHERE status = $1
         AND created_at <= NOW() - INTERVAL '24 hours'`,
        ["UnderReview"]
      );

      for (const milestone of rows) {
        await pool.query(`CALL close_voting($1)`, [milestone.id]);
        console.log(`Closed voting for milestone: ${milestone.id}`);
      }
    } catch (err) {
      console.error("Cron job error:", err.message);
    }
  });

  // Email Notification Worker
  setInterval(async () => {
    try {
      const { rows } = await pool.query(
        `SELECT n.*, u.email
         FROM notifications n
         JOIN users u ON u.id = n.user_id
         WHERE n.email_sent = FALSE AND n.failed_attempts < 3
         ORDER BY n.created_at ASC
         LIMIT 50`
      );

      for (const notification of rows) {
        try {
          await sendEmail(notification.email, notification.title, notification.message);
          await pool.query(`UPDATE notifications SET email_sent = TRUE WHERE id = $1`, [notification.id]);
        } catch (emailErr) {
          await pool.query(`UPDATE notifications SET failed_attempts = failed_attempts + 1 WHERE id = $1`, [notification.id]);
        }
      }
    } catch (err) {
      console.error("Email worker error:", err.message);
    }
  }, 10000); // Run every 10 seconds

  console.log("Cron jobs and workers started...");
}
