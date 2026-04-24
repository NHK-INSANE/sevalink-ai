const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");
const User = require("../models/User");
const { autoAssign } = require("../services/aiAssignService");

/**
 * @route POST /api/ai/auto-assign/:problemId
 * @desc Automatically assign responders to a specific problem using the AI scoring engine
 */
router.post("/auto-assign/:problemId", async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    // Find active responders (volunteers or field workers)
    const users = await User.find({ 
      role: { $in: ["volunteer", "worker", "responder"] } 
    });

    const assignmentResults = await autoAssign(problem, users);
    const assignedUserIds = assignmentResults.map(a => a.user._id);

    // Update the problem with assigned responders
    problem.assignedTo = assignedUserIds;
    problem.status = "In Progress";
    await problem.save();

    res.json({
      success: true,
      problemId: problem._id,
      assigned: assignmentResults.map(a => ({
        id: a.user._id,
        name: a.user.name,
        score: a.score
      }))
    });
  } catch (error) {
    console.error("AI Auto-Assign Error:", error);
    res.status(500).json({ message: "Assignment failed", error: error.message });
  }
});

module.exports = router;
