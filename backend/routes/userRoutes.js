const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { validate, userSchema } = require("../middleware/validation");
const { auth } = require("../middleware/auth");

// POST /api/users/register
router.post("/register", validate(userSchema), async (req, res) => {
  console.log("📥 Registration Attempt Payload:", req.body);
  try {
    const { email, username } = req.body;

    // Prevent duplicate emails, usernames, or phone numbers
    const existing = await User.findOne({ 
      $or: [{ email }, { username }, { phone: req.body.phone }] 
    });
    if (existing) {
      let field = "Email or username";
      if (existing.phone === req.body.phone) field = "Phone number";
      else if (existing.email === email) field = "Email";
      else if (existing.username === username) field = "Username";
      
      return res.status(409).json({ error: `${field} already registered` });
    }

    const user = new User(req.body);
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const safeUser = await User.findById(user._id).select("-password");
    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    console.error("🔥 REGISTRATION ERROR:", err);
    res.status(500).json({ 
      error: "Registration failed. Please try again.",
      details: err.message 
    });
  }
});

// POST /api/users/login
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing identifier or password" });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const safeUser = await User.findById(user._id).select("-password");
    res.json({ user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
});

// GET /api/users/:id/notifications
router.get("/:id/notifications", auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access to notifications" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const notifs = user.notifications.sort((a, b) => b.date - a.date);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// PATCH /api/users/:id/notifications/read
router.patch("/:id/notifications/read", auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized action" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    user.notifications.forEach(n => n.read = true);
    await user.save();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// PUT /api/users/update-profile
router.put("/update-profile", auth, async (req, res) => {
  try {
    const { name, email, phone, address, location, bio, skill, skills } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (location) user.location = location;
    if (bio) user.bio = bio;
    if (skill) user.skill = skill;
    if (skills) user.skills = skills;

    await user.save();

    const safeUser = await User.findById(user._id).select("-password");
    res.json(safeUser);
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// GET /api/users — Public list
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("name role location ngoName ngoContact skill skills latitude longitude email phone address bio");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

module.exports = router;

