import writePool, { readPool } from "../config/database.js";
import ResponseError from "../utils/customError.js";
import redisConnection from "../config/redis.js";

const MILESTONE_COLLECTED_TTL_SECONDS = 60;
const MILESTONE_COLLECTED_KEY_PREFIX = "milestone:v1:collected";

function buildMilestoneCollectedKey(milestoneId) {
  return `${MILESTONE_COLLECTED_KEY_PREFIX}:${milestoneId}`;
}

async function getEscrowSnapshotsForMilestones(milestoneIds) {
  if (!milestoneIds.length) return new Map();

  const snapshots = new Map();
  const keys = milestoneIds.map((id) => buildMilestoneCollectedKey(id));
  const missingMilestoneIds = [];

  try {
    const cachedValues = await redisConnection.mget(keys);
    cachedValues.forEach((cached, index) => {
      if (cached) {
        snapshots.set(milestoneIds[index], JSON.parse(cached));
      } else {
        missingMilestoneIds.push(milestoneIds[index]);
      }
    });
  } catch (error) {
    console.warn("[Cache] Failed reading milestone collected cache:", error.message);
    missingMilestoneIds.push(...milestoneIds);
  }

  if (missingMilestoneIds.length) {
    const { rows } = await readPool.query(
      `SELECT milestone_id, locked_amount, status
       FROM escrow_accounts
       WHERE milestone_id = ANY($1::uuid[])`,
      [missingMilestoneIds],
    );

    const dbSnapshotMap = new Map(
      rows.map((row) => [
        row.milestone_id,
        { locked_amount: row.locked_amount, escrow_status: row.status },
      ]),
    );

    for (const milestoneId of missingMilestoneIds) {
      const snapshot = dbSnapshotMap.get(milestoneId) || {
        locked_amount: "0.00",
        escrow_status: "Locked",
      };
      snapshots.set(milestoneId, snapshot);

      try {
        await redisConnection.set(
          buildMilestoneCollectedKey(milestoneId),
          JSON.stringify(snapshot),
          "EX",
          MILESTONE_COLLECTED_TTL_SECONDS,
        );
      } catch (error) {
        console.warn("[Cache] Failed writing milestone collected cache:", error.message);
      }
    }
  }

  return snapshots;
}

export async function invalidateMilestoneCollectedCache(milestoneId) {
  try {
    await redisConnection.del(buildMilestoneCollectedKey(milestoneId));
  } catch (error) {
    console.warn("[Cache] Failed invalidating milestone collected cache:", error.message);
  }
}

export async function createMilestone(campaignId, creatorId, data) {
  const { title, description, target_amount, deadline } = data;

  // Verify campaign exists and belongs to the creator
  const campaignCheck = await readPool.query(
    "SELECT * FROM campaigns WHERE id = $1 AND creator_id = $2",
    [campaignId, creatorId]
  );

  if (campaignCheck.rows.length === 0) {
    throw new ResponseError("Campaign not found or you are not the owner", 404);
  }

  const client = await writePool.connect();
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
  const result = await readPool.query(
    `SELECT m.*
     FROM milestones m
     WHERE m.campaign_id = $1
     ORDER BY m.created_at ASC`,
    [campaignId]
  );

  const milestoneIds = result.rows.map((row) => row.id);
  const escrowSnapshots = await getEscrowSnapshotsForMilestones(milestoneIds);

  return result.rows.map((milestone) => {
    const snapshot = escrowSnapshots.get(milestone.id) || {
      locked_amount: "0.00",
      escrow_status: "Locked",
    };

    return {
      ...milestone,
      locked_amount: snapshot.locked_amount,
      escrow_status: snapshot.escrow_status,
    };
  });
}

export async function updateMilestoneStatus(milestoneId, creatorId, newStatus) {
  // First, verify the milestone belongs to a campaign owned by the creator
  const checkResult = await readPool.query(
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
  const updateResult = await writePool.query(
    "UPDATE milestones SET status = $1 WHERE id = $2 RETURNING *",
    [newStatus, milestoneId]
  );

  return updateResult.rows[0];
}

export async function reviewMilestone(milestoneId, action) {
  const checkResult = await readPool.query(
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

  const updateResult = await writePool.query(
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
  const result = await readPool.query(
    "SELECT DISTINCT donor_id FROM donations WHERE milestone_id = $1",
    [milestoneId]
  );
  return result.rows.map(row => row.donor_id);
}
