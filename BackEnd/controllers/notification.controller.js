import * as notificationService from "../services/notification.service.js";
import ResponseError from "../utils/customError.js";

export async function fetchNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const notifications = await notificationService.getUserNotifications(userId, limit, offset);

    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await notificationService.markNotificationAsRead(userId, notificationId);

    if (!notification) {
      throw new ResponseError("Notification not found or access denied", 404);
    }

    res.status(200).json({ message: "Notification marked as read", notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    const count = await notificationService.markAllNotificationsAsRead(userId);

    res.status(200).json({ message: `${count} notifications marked as read` });
  } catch (err) {
    next(err);
  }
}
