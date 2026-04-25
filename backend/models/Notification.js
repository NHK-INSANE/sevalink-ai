const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true }, // Aligning with existing code
  type: { 
    type: String, 
    enum: ["info", "assignment", "request", "ai_suggestion", "sos", "message", "SOS", "ASSIGN", "MESSAGE", "AI", "REQUEST"], 
    default: "info" 
  },
  data: { type: Object },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date } 
});

// TTL index for 7-day auto-delete
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

notificationSchema.pre("save", function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model("Notification", notificationSchema);
