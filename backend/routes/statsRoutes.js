const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Problem = require("../models/Problem");

router.get("/stats", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const problemCount = await Problem.countDocuments();
    const volunteerCount = await User.countDocuments({ 
      role: { $in: ["volunteer", "Volunteer", "worker", "Worker"] } 
    });
    
    res.json({
      users: userCount,
      problems: problemCount,
      volunteers: volunteerCount
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
