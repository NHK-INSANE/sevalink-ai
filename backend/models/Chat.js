const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  type: { type: String, enum: ["direct", "team"], required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem" }, // Only for team chats
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
}, { timestamps: true });

module.exports = mongoose.model("Chat", chatSchema);
