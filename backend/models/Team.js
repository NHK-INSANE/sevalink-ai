const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  objective: {
    type: String,
    required: true,
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true,
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String, default: "Member" },
      joinedAt: { type: Date, default: Date.now }
    }
  ],
  requiredSkills: [String],
  maxMembers: {
    type: Number,
    default: 5
  },
  status: {
    type: String,
    enum: ["open", "closed", "full"],
    default: "open"
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Team", teamSchema);
