const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { 
  createTeam, 
  joinTeam, 
  leaveTeam, 
  getTeamsForProblem 
} = require("../controllers/teamController");

// Create a team
router.post("/", auth, createTeam);

// Get teams for a problem
router.get("/problem/:problemId", getTeamsForProblem);

// Join a team
router.post("/:id/join", auth, joinTeam);

// Leave a team
router.post("/:id/leave", auth, leaveTeam);

module.exports = router;
