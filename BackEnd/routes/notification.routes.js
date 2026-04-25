import { Router } from "express";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller.js";
import { authenticateUser } from "../middlewares/validate.user.middleware.js";

const router = Router();

// All notification routes require authentication
router.use(authenticateUser);

router.get("/", fetchNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
