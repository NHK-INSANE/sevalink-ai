const express = require("express");
const router = express.Router();
const Conversation = require("../models/Conversation");
const ChatMessage = require("../models/ChatMessage");
const { auth } = require("../middleware/auth");

// 1. Get all conversations for a user
router.get("/", auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      members: { $in: [req.user.id] },
    }).populate("members", "name email role displayId customId");
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// 2. Create or get a conversation between two users
router.post("/", auth, async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ error: "receiverId is required" });

    let conversation = await Conversation.findOne({
      members: { $all: [req.user.id, receiverId] },
    }).populate("members", "name email role displayId customId");

    if (!conversation) {
      conversation = await Conversation.create({
        members: [req.user.id, receiverId],
      });
      conversation = await conversation.populate("members", "name email role displayId customId");
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// 3. Get messages for a conversation
router.get("/:conversationId/messages", auth, async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      conversationId: req.params.conversationId,
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// 4. Send a message
router.post("/:conversationId/messages", auth, async (req, res) => {
  try {
    const { text, receiverId } = req.body;
    const conversationId = req.params.conversationId;

    const message = await ChatMessage.create({
      conversationId,
      senderId: req.user.id,
      text,
    });

    // Update last message in conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      updatedAt: Date.now()
    });

    // Emit socket event if io is available
    const io = req.app.get("io");
    if (io) {
      const chat = await Conversation.findById(conversationId);
      if (chat && chat.members) {
        chat.members.forEach(memberId => {
          if (memberId.toString() !== req.user.id) {
            io.to(memberId.toString()).emit("chat_message", message);
          }
        });
      }
    }

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// 5. Mark messages as seen
router.patch("/:conversationId/seen", auth, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    await ChatMessage.updateMany(
      { conversationId, senderId: { $ne: req.user.id }, seen: false },
      { $set: { seen: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update seen status" });
  }
});

module.exports = router;
