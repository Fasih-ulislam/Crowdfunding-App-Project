import cron from "node-cron";
import pool from "../config/database.js";

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

  console.log("Cron jobs started...");
}
