const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { auth } = require("../middleware/auth");

// Get all notifications for logged in user
router.get("/", auth, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

// Mark notification as read
router.patch("/:id/read", auth, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      const error = new Error("Notification not found");
      error.status = 404;
      throw error;
    }
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
});

// Mark all as read
router.patch("/read-all", auth, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, data: { message: "All notifications marked as read" } });
  } catch (err) {
    next(err);
  }
});

// Delete a notification
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const result = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) {
      const error = new Error("Notification not found");
      error.status = 404;
      throw error;
    }
    res.json({ success: true, data: { message: "Notification deleted" } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
