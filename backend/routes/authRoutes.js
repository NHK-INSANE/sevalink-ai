const express = require("express");
const router = express.Router();
const User = require("../models/User");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email } = req.body;

    // Prevent duplicate emails
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = new User(req.body);
    await user.save();

    // Return user without password
    const { password: _, ...safe } = user.toObject();
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
        { phone: identifier },
        { name: identifier },
        { ngoName: identifier },
      ],
      password,
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return user without password
    const { password: _, ...safe } = user.toObject();
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
