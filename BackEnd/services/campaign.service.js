import pool from "../config/database.js";
import ResponseError from "../utils/customError.js";
import fs from "fs";

export async function getAllCampaigns({ status, category_id, creator_id } = {}) {
  let query = `SELECT c.*, u.email AS creator_email, cc.name AS category_name FROM campaigns c JOIN users u ON c.creator_id = u.id LEFT JOIN campaign_categories cc ON c.category_id = cc.id WHERE 1=1`;
  const params = [];
  if (status) { params.push(status); query += ` AND c.status = $${params.length}`; }
  if (category_id) { params.push(category_id); query += ` AND c.category_id = $${params.length}`; }
  if (creator_id) { params.push(creator_id); query += ` AND c.creator_id = $${params.length}`; }
  query += ` ORDER BY c.created_at DESC`;
  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getCampaignById(id) {
  const { rows } = await pool.query(
    `SELECT c.*, u.email AS creator_email, cc.name AS category_name FROM campaigns c JOIN users u ON c.creator_id = u.id LEFT JOIN campaign_categories cc ON c.category_id = cc.id WHERE c.id = $1`,
    [id]
  );
  if (!rows[0]) throw new ResponseError("Campaign not found", 404);
  return rows[0];
}

export async function createCampaign({ creator_id, title, description, total_goal, deadline, category_id }) {
  const { rows } = await pool.query(
    `INSERT INTO campaigns (creator_id, title, description, total_goal, deadline, category_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [creator_id, title, description, total_goal, deadline, category_id]
  );
  return rows[0];
}

export async function updateCampaign(id, creator_id, { title, description, total_goal, deadline, category_id }) {
  const { rows: existing } = await pool.query(`SELECT id FROM campaigns WHERE id = $1`, [id]);
  if (!existing[0]) throw new ResponseError("Campaign not found", 404);
  const { rows: owned } = await pool.query(`SELECT id FROM campaigns WHERE id = $1 AND creator_id = $2`, [id, creator_id]);
  if (!owned[0]) throw new ResponseError("You are not the owner of this campaign", 403);
  const { rows } = await pool.query(
    `UPDATE campaigns SET title = COALESCE($1, title), description = COALESCE($2, description), total_goal = COALESCE($3, total_goal), deadline = COALESCE($4, deadline), category_id = COALESCE($5, category_id) WHERE id = $6 RETURNING *`,
    [title, description, total_goal, deadline, category_id, id]
  );
  return rows[0];
}

export async function deleteCampaign(id, creator_id) {
  const { rows: existing } = await pool.query(`SELECT id FROM campaigns WHERE id = $1`, [id]);
  if (!existing[0]) throw new ResponseError("Campaign not found", 404);
  const { rows: owned } = await pool.query(`SELECT id FROM campaigns WHERE id = $1 AND creator_id = $2`, [id, creator_id]);
  if (!owned[0]) throw new ResponseError("You are not the owner of this campaign", 403);
  await pool.query(`DELETE FROM campaigns WHERE id = $1`, [id]);
  return { message: "Campaign deleted successfully" };
}

export async function getCategories() {
  const { rows } = await pool.query(`SELECT * FROM campaign_categories ORDER BY name`);
  return rows;
}

export async function followCampaign(campaign_id, user_id) {
  const { rows: campaign } = await pool.query(`SELECT id FROM campaigns WHERE id = $1`, [campaign_id]);
  if (!campaign[0]) throw new ResponseError("Campaign not found", 404);
  const { rows: existing } = await pool.query(
    `SELECT user_id FROM campaign_followers WHERE campaign_id = $1 AND user_id = $2`,
    [campaign_id, user_id]
  );
  if (existing[0]) throw new ResponseError("You are already following this campaign", 409);
  await pool.query(`INSERT INTO campaign_followers (campaign_id, user_id) VALUES ($1, $2)`, [campaign_id, user_id]);
  return { message: "Campaign followed successfully" };
}

export async function unfollowCampaign(campaign_id, user_id) {
  const { rows: existing } = await pool.query(
    `SELECT user_id FROM campaign_followers WHERE campaign_id = $1 AND user_id = $2`,
    [campaign_id, user_id]
  );
  if (!existing[0]) throw new ResponseError("You are not following this campaign", 404);
  await pool.query(`DELETE FROM campaign_followers WHERE campaign_id = $1 AND user_id = $2`, [campaign_id, user_id]);
  return { message: "Campaign unfollowed successfully" };
}

export async function uploadMedia(campaign_id, user_id, file) {
  const { rows: campaign } = await pool.query(`SELECT id, creator_id FROM campaigns WHERE id = $1`, [campaign_id]);
  if (!campaign[0]) throw new ResponseError("Campaign not found", 404);
  if (campaign[0].creator_id !== user_id) throw new ResponseError("You are not the owner of this campaign", 403);
  const url = `/uploads/${file.filename}`;
  const { rows } = await pool.query(
    `INSERT INTO campaign_media (campaign_id, url, media_type) VALUES ($1, $2, $3) RETURNING *`,
    [campaign_id, url, "image"]
  );
  return rows[0];
}

export async function getMedia(campaign_id) {
  const { rows } = await pool.query(
    `SELECT * FROM campaign_media WHERE campaign_id = $1 ORDER BY created_at DESC`,
    [campaign_id]
  );
  return rows;
}

export async function deleteMedia(campaign_id, media_id, user_id) {
  const { rows: campaign } = await pool.query(`SELECT creator_id FROM campaigns WHERE id = $1`, [campaign_id]);
  if (!campaign[0]) throw new ResponseError("Campaign not found", 404);
  if (campaign[0].creator_id !== user_id) throw new ResponseError("You are not the owner of this campaign", 403);
  const { rows: media } = await pool.query(`SELECT * FROM campaign_media WHERE id = $1 AND campaign_id = $2`, [media_id, campaign_id]);
  if (!media[0]) throw new ResponseError("Media not found", 404);
  const filePath = media[0].url.replace("/uploads/", "uploads/");
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await pool.query(`DELETE FROM campaign_media WHERE id = $1`, [media_id]);
  return { message: "Media deleted successfully" };
}
