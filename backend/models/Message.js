const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    enum: ["text", "image", "audio", "ops"],
    default: "text",
  },
  mediaUrl: {
    type: String, // Base64 or URL
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Message", messageSchema);
