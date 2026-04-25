import * as milestoneService from "../services/milestone.service.js";
import ResponseError from "../utils/customError.js";
import { milestoneSchema, milestoneReviewSchema } from "../utils/validation.js";
import { queueNotificationJob } from "../services/queueService.js";

export async function addMilestone(req, res, next) {
  try {
    // Validate request body
    const { error } = milestoneSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const campaignId = req.params.campaignId;
    const creatorId = req.user.id;

    // Call service to create milestone
    const milestone = await milestoneService.createMilestone(campaignId, creatorId, req.body);

    res.status(201).json({
      message: "Milestone created successfully",
      milestone
    });
  } catch (err) {
    next(err);
  }
}

export async function fetchCampaignMilestones(req, res, next) {
  try {
    const campaignId = req.params.campaignId;

    // Call service to get all milestones for a campaign
    const milestones = await milestoneService.getMilestonesByCampaign(campaignId);

    res.status(200).json(milestones);
  } catch (err) {
    next(err);
  }
}

export async function submitMilestoneForReview(req, res, next) {
  try {
    const milestoneId = req.params.id;
    const creatorId = req.user.id;

    // Change status to UnderReview when creator claims it's finished
    const milestone = await milestoneService.updateMilestoneStatus(milestoneId, creatorId, "UnderReview");

    res.status(200).json({
      message: "Milestone submitted for review",
      milestone
    });
  } catch (err) {
    next(err);
  }
}

export async function adminReviewMilestone(req, res, next) {
  try {
    const { error } = milestoneReviewSchema.validate(req.body);
    if (error) throw new ResponseError(error.details[0].message, 400);

    const milestoneId = req.params.id;
    const { action } = req.body;

    const milestone = await milestoneService.reviewMilestone(milestoneId, action);

    const message = action === "approve"
      ? "Milestone approved and is now Active"
      : "Milestone rejected";

    res.status(200).json({ message, milestone });

    // Queue background notification & email for the creator
    await queueNotificationJob("MILESTONE_UPDATED", {
      userId: milestone.creator_id,
      type: "MILESTONE_UPDATED",
      message: `Your milestone "${milestone.title}" has been ${action}d.`,
      metadata: { milestoneId: milestone.id, status: milestone.status },
    });
  } catch (err) {
    next(err);
  }
}
