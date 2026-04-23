const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Problem = require("../models/Problem");

router.get("/stats", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const problemCount = await Problem.countDocuments({ status: { $regex: /^(open|in progress|in-progress)$/i } });
    
    // Fallback if no active problems found, return total problems just in case
    const activeProblems = problemCount > 0 ? problemCount : await Problem.countDocuments();

    const citizenCount = await User.countDocuments({ 
      role: { $regex: /^(citizen|user)$/i } 
    });
    
    const volunteerCount = await User.countDocuments({ 
      role: { $regex: /^(volunteer|worker)$/i } 
    });
    
    const ngoCount = await User.countDocuments({ 
      role: { $regex: /^ngo$/i } 
    });
    
    res.json({
      users: userCount,
      problems: activeProblems,
      citizens: citizenCount,
      responders: volunteerCount,
      ngos: ngoCount
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
