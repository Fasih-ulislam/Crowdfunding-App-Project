import * as campaignService from "../services/campaign.service.js";
import ResponseError from "../utils/customError.js";
import { campaignReviewSchema } from "../utils/validation.js";
import { queueNotificationJob } from "../services/queueService.js";

export async function getAllCampaigns(req, res, next) {
  try {
    const { status, category_id, creator_id } = req.query;
    const campaigns = await campaignService.getAllCampaigns({ status, category_id, creator_id });
    res.status(200).json(campaigns);
  } catch (err) { next(err); }
}

export async function getCampaignById(req, res, next) {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);
    res.status(200).json(campaign);
  } catch (err) { next(err); }
}

export async function createCampaign(req, res, next) {
  try {
    if (!req.user?.id) throw new ResponseError("Invalid session", 401);
    const { title, description, total_goal, deadline, category_id } = req.body;
    if (!title || !description || total_goal == null || total_goal === "" || !deadline)
      throw new ResponseError("title, description, total_goal, and deadline are required", 400);
    const cid = parseInt(category_id, 10);
    if (!Number.isFinite(cid) || cid < 1)
      throw new ResponseError("A valid category is required", 400);
    const campaign = await campaignService.createCampaign({
      creator_id: req.user.id,
      title,
      description,
      total_goal,
      deadline,
      category_id: cid,
    });
    res.status(201).json({ message: "Campaign created successfully", campaign });
  } catch (err) { next(err); }
}

export async function updateCampaign(req, res, next) {
  try {
    const { title, description, total_goal, deadline, category_id } = req.body;
    const campaign = await campaignService.updateCampaign(req.params.id, req.user.id, { title, description, total_goal, deadline, category_id });
    res.status(200).json({ message: "Campaign updated successfully", campaign });
  } catch (err) { next(err); }
}

export async function deleteCampaign(req, res, next) {
  try {
    const result = await campaignService.deleteCampaign(req.params.id, req.user.id);
    res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function submitCampaignForReview(req, res, next) {
  try {
    const campaign = await campaignService.submitCampaignForReview(req.params.id, req.user.id);
    res.status(200).json({
      message: "Campaign submitted for admin review",
      campaign,
    });
  } catch (err) { next(err); }
}

export async function adminReviewCampaign(req, res, next) {
  try {
    const { error } = campaignReviewSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const { action } = req.body;
    const campaign = await campaignService.adminReviewCampaign(req.params.id, action);

    const message =
      action === "approve"
        ? "Campaign approved and is now Active"
        : "Campaign returned to Draft";

    res.status(200).json({ message, campaign });

    await queueNotificationJob("CAMPAIGN_REVIEWED", {
      userId: campaign.creator_id,
      type: "SYSTEM_ALERT",
      message:
        action === "approve"
          ? `Your campaign "${campaign.title}" is now Active and visible to donors.`
          : `Your campaign "${campaign.title}" was not approved and was returned to Draft. You can edit it and submit again.`,
      metadata: { campaignId: campaign.id, action },
    });
  } catch (err) { next(err); }
}

export async function getCategories(req, res, next) {
  try {
    const categories = await campaignService.getCategories();
    res.status(200).json(categories);
  } catch (err) { next(err); }
}

export async function followCampaign(req, res, next) {
  try {
    const result = await campaignService.followCampaign(req.params.id, req.user.id);
    res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function unfollowCampaign(req, res, next) {
  try {
    const result = await campaignService.unfollowCampaign(req.params.id, req.user.id);
    res.status(200).json(result);
  } catch (err) { next(err); }
}

export async function uploadMedia(req, res, next) {
  try {
    if (!req.file) throw new ResponseError("No image file provided", 400);
    const media = await campaignService.uploadMedia(req.params.id, req.user.id, req.file);
    res.status(201).json({ message: "Media uploaded successfully", media });
  } catch (err) { next(err); }
}

export async function getMedia(req, res, next) {
  try {
    const media = await campaignService.getMedia(req.params.id);
    res.status(200).json(media);
  } catch (err) { next(err); }
}

export async function deleteMedia(req, res, next) {
  try {
    const result = await campaignService.deleteMedia(req.params.id, req.params.mediaId, req.user.id);
    res.status(200).json(result);
  } catch (err) { next(err); }
}
