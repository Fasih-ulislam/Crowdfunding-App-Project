import { Router } from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/validate.user.middleware.js";
import * as applicationController from "../controllers/application.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// =====================================================
// APPLICATION ROUTES
// =====================================================
// Submit a new application (Donor only)
router.post(
  "/",
  authorizeRoles("Donor"),
  applicationController.submitApplication
);

// Get my applications (Donor, Admin, Creator can view theirs)
router.get(
  "/my",
  authorizeRoles("Donor", "Admin", "Creator"),
  applicationController.getMyApplications
);

// Get all applications (Admin only)
router.get("/all", authorizeRoles("Admin"), applicationController.getAllApplications);

// Approve/Reject application (Admin only)
router.post(
  "/:id/approve",
  authorizeRoles("Admin"),
  applicationController.approveOrRejectApplication
);

export default router;
