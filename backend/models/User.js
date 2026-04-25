const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "volunteer", "ngo", "worker", "admin"], default: "user" },
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
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  bio: { type: String, default: "" },
  notifications: [
    {
      text: { type: String, required: true },
      type: { type: String, default: "info" },
      read: { type: Boolean, default: false },
      date: { type: Date, default: Date.now },
    }
  ],
  customId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

// 🔒 Hash password and generate custom ID before saving
const bcrypt = require("bcryptjs");
const { generateHexId } = require("../utils/idGenerator");

userSchema.pre("save", async function (next) {
  // Hash password
  if (this.isModified("password")) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
      return next(err);
    }
  }

  // Generate Custom ID
  if (!this.customId) {
    const rolePrefix = 
      this.role === "ngo" ? "NGO-" :
      (this.role === "volunteer" || this.role === "worker") ? "HLP-" : "USR-";
    this.customId = rolePrefix + generateHexId(6);
  }

  next();
});

// 🔓 Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
