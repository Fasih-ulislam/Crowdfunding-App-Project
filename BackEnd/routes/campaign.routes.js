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
import { authenticateUser } from "../middlewares/validate.user.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.get("/", getAllCampaigns);
router.get("/categories", getCategories);
router.get("/:id", getCampaignById);

router.post("/", authenticateUser, createCampaign);
router.put("/:id", authenticateUser, updateCampaign);
router.delete("/:id", authenticateUser, deleteCampaign);

router.post("/:id/follow", authenticateUser, followCampaign);
router.delete("/:id/follow", authenticateUser, unfollowCampaign);

router.post("/:id/media", authenticateUser, upload.single("image"), uploadMedia);
router.get("/:id/media", getMedia);
router.delete("/:id/media/:mediaId", authenticateUser, deleteMedia);

export default router;
