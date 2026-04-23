import pool from "../config/database.js";

export async function submitVote(donorId, milestoneId, vote) {
  const { rows } = await pool.query(
    `INSERT INTO votes (donor_id, milestone_id, vote)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [donorId, milestoneId, vote]
  );
  return rows[0];
}

export async function getVoteResults(milestoneId) {
  const { rows } = await pool.query(
    `SELECT * FROM vote_results WHERE milestone_id = $1`,
    [milestoneId]
  );
  return rows[0] || null;
}
