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
    `SELECT m.id, m.status FROM milestones m
     JOIN campaigns c ON m.campaign_id = c.id
     WHERE m.id = $1 AND c.creator_id = $2`,
    [milestoneId, creatorId]
  );

  if (checkResult.rows.length === 0) {
    throw new ResponseError("Milestone not found or you are not the campaign owner", 404);
  }

  const currentStatus = checkResult.rows[0].status;
  if (currentStatus !== "Active") {
    throw new ResponseError(
      `Cannot submit milestone for review. Milestone must be 'Active' (current status: '${currentStatus}')`,
      400
    );
  }

  // Update status
  const updateResult = await pool.query(
    "UPDATE milestones SET status = $1 WHERE id = $2 RETURNING *",
    [newStatus, milestoneId]
  );

  return updateResult.rows[0];
}

export async function reviewMilestone(milestoneId, action) {
  const checkResult = await pool.query(
    `SELECT id, status FROM milestones WHERE id = $1`,
    [milestoneId]
  );

  if (checkResult.rows.length === 0) {
    throw new ResponseError("Milestone not found", 404);
  }

  const currentStatus = checkResult.rows[0].status;

  if (currentStatus !== "Pending") {
    throw new ResponseError(
      `Cannot review milestone. Milestone must be 'Pending' (current status: '${currentStatus}')`,
      400
    );
  }

  const newStatus = action === "approve" ? "Active" : "Rejected";

  const updateResult = await pool.query(
    `UPDATE milestones m
     SET status = $1 
     FROM campaigns c
     WHERE m.campaign_id = c.id AND m.id = $2
     RETURNING m.*, c.creator_id`,
    [newStatus, milestoneId]
  );

  return updateResult.rows[0];
}

export async function getMilestoneDonors(milestoneId) {
  const result = await pool.query(
    "SELECT DISTINCT donor_id FROM donations WHERE milestone_id = $1",
    [milestoneId]
  );
  return result.rows.map(row => row.donor_id);
}
