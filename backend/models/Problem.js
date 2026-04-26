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
    default: "general",
    lowercase: true
  },
  subCategories: {
    type: [String],
    default: []
  },
  location: {
    lat: { type: Number, default: 22.3 },
    lng: { type: Number, default: 87.3 },
    address: { type: String, default: "" },
  },
  reportedBy: {
    userId: { type: String, required: true },
    name: { type: String, default: "Anonymous" }
  },
  severity: {
    type: String,
    enum: ["critical", "high", "medium", "low"],
    default: "medium",
    lowercase: true
  },
  status: {
    type: String,
    enum: ["open", "in_progress", "resolved"],
    default: "open",
    lowercase: true
  },
  score: {
    type: Number,
    default: 0,
  },
  assignedTo: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "User",
    default: []
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
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
  tasks: [
    {
      title: { type: String, required: true },
      priority: { type: String, enum: ["critical", "high", "medium", "low"], default: "medium" },
      status: { type: String, enum: ["pending", "in_progress", "completed"], default: "pending" },
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
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  autoDeleteAt: {
    type: Date,
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Auto-generate unique Hex ID before saving
const { generateHexId } = require("../utils/idGenerator");
problemSchema.pre("save", async function (next) {
  if (!this.problemId) {
    this.problemId = "PRB-" + generateHexId(8);
  }
  
  // Auto-set autoDeleteAt when resolved
  if (this.status === "resolved" && !this.autoDeleteAt) {
    this.autoDeleteAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } else if (this.status !== "resolved") {
    this.autoDeleteAt = null;
  }
  
  next();
});

// Add virtual for display if field is missing
problemSchema.virtual('id').get(function() {
  return this.problemId;
});

problemSchema.virtual('displayId').get(function() {
  if (this.problemId) return this.problemId;
  const hex = this._id.toString().slice(-8).toUpperCase();
  return `PRB-${hex}`;
});

// Performance Indexes
problemSchema.index({ status: 1, isArchived: 1, severity: 1 });
problemSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Problem", problemSchema);
