import Notification from "../models/Notification.js";

export async function getUserNotifications(userId, limit = 50, offset = 0) {
  return await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
}

export async function markNotificationAsRead(userId, notificationId) {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
}

export async function markAllNotificationsAsRead(userId) {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true }
  );
  return result.modifiedCount;
}
