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
    enum: ["OPEN", "IN PROGRESS", "RESOLVED"],
    default: "OPEN",
    uppercase: true
  },
  submittedByName: {
    type: String,
    default: "Anonymous"
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  team: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: String,
      isLeader: { type: Boolean, default: false }
    }
  ],
  requests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: String,
      status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  leadRequests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  tasks: [
    {
      title: { type: String, required: true },
      priority: { type: String, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
      status: { type: String, enum: ["PENDING", "IN_PROGRESS", "COMPLETED"], default: "PENDING" },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      assignedName: { type: String, default: null },
      createdAt: { type: Date, default: Date.now }
    }
  ],
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
  messages: [
    {
      senderId: String,
      senderName: String,
      text: String,
      type: { type: String, enum: ["text", "image", "voice", "system"], default: "text" },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Auto-generate unique Hex ID before saving
const { generateHexId } = require("../utils/idGenerator");
problemSchema.pre("save", async function (next) {
  if (!this.problemId) {
    this.problemId = "PRB-" + generateHexId(8);
  }
  next();
});

// Add virtual for display if field is missing
problemSchema.virtual('displayId').get(function() {
  if (this.problemId) return this.problemId;
  // Fallback for legacy records
  const hex = this._id.toString().slice(-8).toUpperCase();
  return `PRB-${hex}`;
});

// Performance Indexes
problemSchema.index({ status: 1, isArchived: 1, urgency: 1 });
problemSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Problem", problemSchema);
