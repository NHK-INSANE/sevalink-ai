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

    // Prevent duplicate emails or usernames
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ error: "Email or username already registered" });
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

module.exports = router;
