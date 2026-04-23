const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { auth } = require("../middleware/auth");

/**
 * @route GET /api/messages/:problemId
 * @desc Get chat history for a specific crisis objective
 */
router.get("/:problemId", auth, async (req, res) => {
  try {
    const messages = await Message.find({ problemId: req.params.problemId })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch discussion history" });
  }
});

/**
 * @route POST /api/messages
 * @desc Save a new discussion message (usually called via Socket, but available for uploads)
 */
router.post("/", auth, async (req, res) => {
  try {
    const { problemId, content, type, mediaUrl } = req.body;
    const newMessage = new Message({
      problemId,
      senderId: req.user.id,
      senderName: req.user.name,
      content,
      type: type || "text",
      mediaUrl,
    });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to save intelligence report" });
  }
});

module.exports = router;
