const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: "General",
  },
  location: {
    lat: { type: Number, default: 22.3 },
    lng: { type: Number, default: 87.3 },
    address: { type: String, default: "" },
  },
  urgency: {
    type: String,
    enum: ["Critical", "High", "Medium", "Low"],
    default: "Medium",
  },
  score: {
    type: Number,
    default: 0,
  },
  requiredSkill: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["Open", "In Progress", "Resolved"],
    default: "Open",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Problem", problemSchema);
