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
    type: [String], // ✅ Support multiple categories
    default: ["General"],
  },
  location: {
    lat: { type: Number, default: 22.3 },
    lng: { type: Number, default: 87.3 },
    address: { type: String, default: "" },
  },
  createdBy: {
    type: String,
    required: true,
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
  requiredSkills: {
    type: [String], // ✅ Support multiple skills
    default: [],
  },
  requiredSkill: { // Keep for backward compatibility
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["Open", "In Progress", "Resolved"],
    default: "Open",
  },
  assignedTo: {
    type: String,
    default: null,
  },
  timeline: [
    {
      text: { type: String, required: true },
      time: { type: Date, default: Date.now },
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Problem", problemSchema);
