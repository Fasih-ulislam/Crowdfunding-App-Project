import { Router } from "express";
import {
  addMilestone,
  fetchCampaignMilestones,
  submitMilestoneForReview,
  adminReviewMilestone,
} from "../controllers/milestone.controller.js";
import { authenticateUser, authorizeRoles } from "../middlewares/validate.user.middleware.js";

const router = Router();

// Public route to view milestones for a campaign
router.get("/campaign/:campaignId", fetchCampaignMilestones);

// Creator only route to add a milestone to a campaign
router.post(
  "/campaign/:campaignId",
  authenticateUser,
  authorizeRoles("Creator"),
  addMilestone
);

// Creator only route to submit a milestone for review
router.patch(
  "/:id/status",
  authenticateUser,
  authorizeRoles("Creator"),
  submitMilestoneForReview
);

// Admin only route to approve or reject a pending milestone
router.patch(
  "/:id/review",
  authenticateUser,
  authorizeRoles("Admin"),
  adminReviewMilestone
);

export default router;
