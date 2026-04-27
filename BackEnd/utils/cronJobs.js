import cron from "node-cron";
import writePool from "../config/database.js";
import { queueNotificationJob } from "../services/queueService.js";

export function startCronJobs() {
  // Check for milestones that have been in UnderReview for 24 hours
  cron.schedule("* * * * *", async () => {
    try {
      const { rows } = await writePool.query(
        `SELECT m.id, m.title, c.creator_id 
         FROM milestones m
         JOIN campaigns c ON c.id = m.campaign_id
         WHERE m.status = $1
         AND m.created_at <= NOW() - INTERVAL '24 hours'`,
        ["UnderReview"]
      );

      for (const milestone of rows) {
        // 1. Close voting in PostgreSQL
        await writePool.query(`CALL close_voting($1)`, [milestone.id]);

        // 2. Fetch the outcome
        const { rows: resultRows } = await writePool.query(
          `SELECT yes_count, no_count, outcome FROM vote_results WHERE milestone_id = $1`,
          [milestone.id]
        );

        if (resultRows.length > 0) {
          const { yes_count, no_count, outcome } = resultRows[0];
          const statusText = outcome ? "Approved" : "Rejected";

          // 3. Notify Creator
          await queueNotificationJob("MILESTONE_VOTE_RESULT", {
            userId: milestone.creator_id,
            type: "SYSTEM_ALERT",
            message: `Voting closed for your milestone "${milestone.title}". Outcome: ${statusText}. (Yes: ${yes_count}, No: ${no_count})`,
            metadata: { milestoneId: milestone.id, outcome, yes_count, no_count },
          });

          // 4. Notify all Donors
          const { rows: donorRows } = await writePool.query(
            "SELECT DISTINCT donor_id FROM donations WHERE milestone_id = $1",
            [milestone.id]
          );

          for (const donor of donorRows) {
            await queueNotificationJob("MILESTONE_VOTE_RESULT", {
              userId: donor.donor_id,
              type: "SYSTEM_ALERT",
              message: `Voting has closed for milestone "${milestone.title}". The funds have been ${outcome ? 'released' : 'marked for refund'}.`,
              metadata: { milestoneId: milestone.id, outcome },
            });
          }
        }

        console.log(`Closed voting and sent notifications for milestone: ${milestone.id}`);
      }
    } catch (err) {
      console.error("Cron job error:", err.message);
    }
  });

  console.log("Cron jobs started...");
}
