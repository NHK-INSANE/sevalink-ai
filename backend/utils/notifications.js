const Notification = require("../models/Notification");

const sendNotification = async (io, { userId, type, message, data }) => {
  if (!userId) return;

  try {
    const notification = await Notification.create({
      userId,
      type: type || "info",
      message: message || "New notification",
      data: data || {},
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    if (io) {
      // Emit to the specific user's room (userId)
      io.to(userId.toString()).emit("notification", notification);
      io.to(userId.toString()).emit("new-notification", notification); // Support both aliases
    }

    return notification;
  } catch (err) {
    console.error("sendNotification error:", err);
  }
};

module.exports = { sendNotification };
