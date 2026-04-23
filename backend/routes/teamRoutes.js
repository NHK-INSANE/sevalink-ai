const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const { auth } = require("../middleware/auth");

// Get teams for a problem
router.get("/problem/:problemId", async (req, res) => {
  try {
    const teams = await Team.find({ problemId: req.params.problemId });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create a team
router.post("/", auth, async (req, res) => {
  try {
    const { name, objective, problemId } = req.body;
    const team = new Team({
      name,
      objective,
      problemId,
      createdBy: req.user.id,
      members: [{ userId: req.user.id, role: "Leader" }]
    });
    await team.save();
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: "Failed to create team" });
  }
});

// Join a team
router.post("/:teamId/join", auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: "Team not found" });
    
    const isMember = team.members.some(m => m.userId.toString() === req.user.id);
    if (isMember) return res.status(400).json({ error: "Already a member" });

    team.members.push({ userId: req.user.id });
    await team.save();
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: "Failed to join team" });
  }
});

module.exports = router;
