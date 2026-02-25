import { Router } from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/validate.user.middleware.js";
import * as userController from "../controllers/user.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// =====================================================
// USER ROUTES (self-management)
// =====================================================
router.get(
  "/",
  authorizeRoles("ADMIN", "USER"),
  userController.getUserByEmail
);

router.put(
  "/",
  authorizeRoles("ADMIN", "USER"),
  userController.updateUser
);

router.delete(
  "/",
  authorizeRoles("ADMIN", "USER"),
  userController.deleteUser
);

// =====================================================
// ADMIN ROUTES
// =====================================================
router.get("/all", authorizeRoles("ADMIN"), userController.getAllUsers);

export default router;
