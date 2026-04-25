const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { auth } = require("../middleware/auth");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 messages per minute
  message: { error: "Too many messages sent. Please slow down." }
});

// GET all chats for the logged in user
router.get("/", auth, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate("participants", "name role customId email")
      .populate("problemId", "title problemId")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: "Failed to load chats" });
  }
});

// Create or get a direct chat
router.post("/direct", auth, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "Target user required" });
    if (targetUserId === req.user.id) return res.status(400).json({ error: "Cannot chat with yourself" });

    let chat = await Chat.findOne({
      type: "direct",
      participants: { $all: [req.user.id, targetUserId] }
    }).populate("participants", "name role customId email");

    if (!chat) {
      chat = await Chat.create({
        type: "direct",
        participants: [req.user.id, targetUserId]
      });
      chat = await chat.populate("participants", "name role customId email");
    }
    
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: "Failed to initialize chat" });
  }
});

// GET messages for a chat
router.get("/:chatId/messages", auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // Validate participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: "Unauthorized access to chat" });
    }

    const messages = await Message.find({ chatId }).sort({ createdAt: 1 }).limit(100).populate("senderId", "name");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// We will handle POST /messages mostly through Socket.IO, but a fallback REST endpoint is good
router.post("/:chatId/messages", auth, messageLimiter, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, type, mediaUrl } = req.body;
    
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const newMessage = await Message.create({
      chatId,
      senderId: req.user.id,
      message,
      type: type || "text",
      mediaUrl
    });

    await newMessage.populate("senderId", "name");

    chat.lastMessage = newMessage._id;
    await chat.save();

    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
