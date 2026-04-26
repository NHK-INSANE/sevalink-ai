const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ["text", "image", "video", "voice"], default: "text" },
  read: { type: Boolean, default: false },
  mediaUrl: { type: String }, // Used if type is not text
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, expires: 0 } // TTL index
});

messageSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Set default expiry to 14 days from creation
messageSchema.pre("save", function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model("Message", messageSchema);
