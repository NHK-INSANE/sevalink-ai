const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  message: { type: String, default: "Emergency! Immediate help needed!" },
  senderName: { type: String, default: "Anonymous" },
  urgency: { type: String, default: "critical" },
  type: { type: String, default: "SOS" },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-delete after 5 minutes (300 seconds)
});

module.exports = mongoose.model("SOS", sosSchema);
