const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["User", "Volunteer", "NGO", "Worker"], default: "User" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  skill: { type: String, default: "" },
  skills: { type: [String], default: [] },
  otherSkill: { type: String, default: "" },
  ngoName: { type: String, default: "" },
  ngoContact: { type: String, default: "" },
  ngoLink: { type: String, default: "" },
  bio: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
