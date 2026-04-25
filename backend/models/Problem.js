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
    enum: ["Open", "In Progress", "Resolved", "open", "in-progress", "resolved"],
    default: "Open",
  },
  assignedTo: {
    type: String,
    default: null,
  },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  leader: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  timeline: [
    {
      text: { type: String, required: true },
      time: { type: Date, default: Date.now },
    }
  ],
  problemId: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-generate unique Hex ID before saving
const { generateHexId } = require("../utils/idGenerator");
problemSchema.pre("save", async function (next) {
  if (!this.problemId) {
    this.problemId = "PRB-" + generateHexId(6);
  }
  next();
});

module.exports = mongoose.model("Problem", problemSchema);
