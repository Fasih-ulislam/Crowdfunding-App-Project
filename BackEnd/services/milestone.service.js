import pool from "../config/database.js";
import ResponseError from "../utils/customError.js";

export async function createMilestone(campaignId, creatorId, data) {
  const { title, description, target_amount, deadline } = data;

  // Verify campaign exists and belongs to the creator
  const campaignCheck = await pool.query(
    "SELECT * FROM campaigns WHERE id = $1 AND creator_id = $2",
    [campaignId, creatorId]
  );

  if (campaignCheck.rows.length === 0) {
    throw new ResponseError("Campaign not found or you are not the owner", 404);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create the milestone
    const milestoneResult = await client.query(
      `INSERT INTO milestones (campaign_id, title, description, target_amount, deadline, status)
       VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING *`,
      [campaignId, title, description, target_amount, deadline]
    );

    const milestone = milestoneResult.rows[0];

    // Create the corresponding escrow account for this milestone
    await client.query(
      `INSERT INTO escrow_accounts (milestone_id, locked_amount, status)
       VALUES ($1, 0, 'Locked')`,
      [milestone.id]
    );

    await client.query("COMMIT");
    return milestone;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getMilestonesByCampaign(campaignId) {
  // We can also join with escrow_accounts to show how much is locked
  const result = await pool.query(
    `SELECT m.*, e.locked_amount, e.status AS escrow_status 
     FROM milestones m
     LEFT JOIN escrow_accounts e ON m.id = e.milestone_id
     WHERE m.campaign_id = $1
     ORDER BY m.created_at ASC`,
    [campaignId]
  );
  return result.rows;
}

export async function updateMilestoneStatus(milestoneId, creatorId, newStatus) {
  // First, verify the milestone belongs to a campaign owned by the creator
  const checkResult = await pool.query(
    `SELECT m.id FROM milestones m
     JOIN campaigns c ON m.campaign_id = c.id
     WHERE m.id = $1 AND c.creator_id = $2`,
    [milestoneId, creatorId]
  );

  if (checkResult.rows.length === 0) {
    throw new ResponseError("Milestone not found or you are not the campaign owner", 404);
  }

  // Update status
  const updateResult = await pool.query(
    "UPDATE milestones SET status = $1 WHERE id = $2 RETURNING *",
    [newStatus, milestoneId]
  );

  return updateResult.rows[0];
}
