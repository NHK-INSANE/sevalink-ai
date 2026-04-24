const Team = require("../models/Team");

exports.createTeam = async (req, res) => {
  try {
    const { problemId, name, objective, requiredSkills, maxMembers } = req.body;
    
    // Check if team already exists for this leader/problem (optional)
    
    const team = new Team({
      name: name || `Response Unit for ${problemId}`,
      objective: objective || "Crisis Coordination",
      problemId: problemId,
      leader: req.user.id,
      members: [{ userId: req.user.id, role: "Leader" }],
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : (requiredSkills ? requiredSkills.split(",").map(s => s.trim()) : []),
      maxMembers: maxMembers || 5,
      status: "open"
    });
    
    await team.save();
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTeamsForProblem = async (req, res) => {
  try {
    const teams = await Team.find({ problemId: req.params.problemId })
      .populate("members.userId", "name role skills")
      .populate("leader", "name email");
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch teams" });
  }
};

exports.joinTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ error: "Team is full" });
    }

    const isMember = team.members.some(m => m.userId.toString() === req.user.id);
    if (isMember) return res.status(400).json({ error: "Already a member" });

    team.members.push({ userId: req.user.id, role: "Volunteer" });
    if (team.members.length >= team.maxMembers) {
      team.status = "full";
    }

    await team.save();
    
    const updatedTeam = await Team.findById(team._id).populate("members.userId", "name role");
    
    // Broadcast via socket if available
    const io = req.app.get("io");
    if (io) {
      io.emit("teamUpdated", updatedTeam);
    }

    res.json(updatedTeam);
  } catch (err) {
    res.status(500).json({ error: "Failed to join team" });
  }
};

exports.leaveTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    team.members = team.members.filter(m => m.userId.toString() !== req.user.id);
    if (team.members.length < team.maxMembers) {
      team.status = "open";
    }

    await team.save();
    
    const updatedTeam = await Team.findById(team._id).populate("members.userId", "name role");
    
    const io = req.app.get("io");
    if (io) {
      io.emit("teamUpdated", updatedTeam);
    }

    res.json(updatedTeam);
  } catch (err) {
    res.status(500).json({ error: "Failed to leave team" });
  }
};
