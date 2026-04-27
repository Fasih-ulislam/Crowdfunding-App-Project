import writePool, { readPool } from "../config/database.js";

export async function submitVote(donorId, milestoneId, vote) {
  const { rows } = await writePool.query(
    `INSERT INTO votes (donor_id, milestone_id, vote)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [donorId, milestoneId, vote]
  );
  return rows[0];
}

export async function getVoteResults(milestoneId) {
  const { rows } = await readPool.query(
    `SELECT * FROM vote_results WHERE milestone_id = $1`,
    [milestoneId]
  );
  return rows[0] || null;
}

export async function getLiveVoteCounts(milestoneId) {
  // Check if the milestone exists and is currently under review
  const milestoneCheck = await readPool.query(
    `SELECT id, status FROM milestones WHERE id = $1`,
    [milestoneId]
  );

  if (milestoneCheck.rows.length === 0) {
    return { error: "Milestone not found", status: 404 };
  }

  const milestone = milestoneCheck.rows[0];

  // If voting is already closed, return the final results instead
  if (milestone.status === "Approved" || milestone.status === "Rejected") {
    const finalResult = await getVoteResults(milestoneId);
    return {
      milestoneId,
      status: milestone.status,
      votingClosed: true,
      finalResult,
    };
  }

  // If milestone isn't UnderReview, voting hasn't started
  if (milestone.status !== "UnderReview") {
    return {
      milestoneId,
      status: milestone.status,
      votingClosed: false,
      message: "Voting has not started for this milestone",
    };
  }

  // Live aggregate from votes table
  const { rows } = await readPool.query(
    `SELECT
       COUNT(*) FILTER (WHERE vote = TRUE)  AS yes_count,
       COUNT(*) FILTER (WHERE vote = FALSE) AS no_count,
       COUNT(*)                             AS total_votes
     FROM votes
     WHERE milestone_id = $1`,
    [milestoneId]
  );

  const { yes_count, no_count, total_votes } = rows[0];
  const yesPercentage = total_votes > 0
    ? Math.round((yes_count / total_votes) * 10000) / 100
    : 0;

  return {
    milestoneId,
    status: "UnderReview",
    votingClosed: false,
    yes_count: parseInt(yes_count),
    no_count: parseInt(no_count),
    total_votes: parseInt(total_votes),
    yes_percentage: yesPercentage,
  };
}
