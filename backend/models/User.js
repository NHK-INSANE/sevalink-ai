const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["User", "Volunteer", "NGO", "Worker"], default: "User" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  skill: { type: String, default: "" },
  ngoName: { type: String, default: "" },
  ngoContact: { type: String, default: "" },
  ngoLink: { type: String, default: "" },
  bio: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
