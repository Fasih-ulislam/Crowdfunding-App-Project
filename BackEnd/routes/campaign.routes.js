import { Router } from "express";
import {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCategories,
  followCampaign,
  unfollowCampaign,
  uploadMedia,
  getMedia,
  deleteMedia,
} from "../controllers/campaign.controller.js";
import { authenticateUser, authorizeRoles } from "../middlewares/validate.user.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

// Public routes
router.get("/", getAllCampaigns);
router.get("/categories", getCategories);
router.get("/:id", getCampaignById);

// Creator only routes
router.post("/", authenticateUser, authorizeRoles("Creator"), createCampaign);
router.put("/:id", authenticateUser, authorizeRoles("Creator"), updateCampaign);
router.delete("/:id", authenticateUser, authorizeRoles("Creator"), deleteCampaign);
router.post("/:id/media", authenticateUser, authorizeRoles("Creator"), upload.single("image"), uploadMedia);
router.delete("/:id/media/:mediaId", authenticateUser, authorizeRoles("Creator"), deleteMedia);

// Any logged in user can follow/unfollow and view media
router.post("/:id/follow", authenticateUser, followCampaign);
router.delete("/:id/follow", authenticateUser, unfollowCampaign);
router.get("/:id/media", getMedia);

export default router;
