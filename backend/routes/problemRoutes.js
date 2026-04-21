const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");
const User = require("../models/User");
const auth = require("../middleware/auth");

// --- Helpers ---
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function matchVolunteer(problem) {
  try {
    const users = await User.find({ role: { $in: ["Volunteer", "Worker"] } });
    if (users.length === 0) return null;

    const scored = users.map(u => {
      const skills = u.skills || [];
      const skillMatch = skills.includes(problem.category) || (u.skill === problem.category) ? 1 : 0;
      const dist = getDistance(
        problem.location?.lat,
        problem.location?.lng,
        u.location?.lat,
        u.location?.lng
      );
      // AI Logic: Skill match is 10 points, distance penalized by km
      return { id: u._id.toString(), score: (skillMatch * 10) - (dist / 10) };
    });

    return scored.sort((a, b) => b.score - a.score)[0]?.id || null;
  } catch (err) {
    console.error("Match Error:", err);
    return null;
  }
}

// POST /api/problems — Create a new problem
router.post("/", auth, async (req, res) => {
  try {
    const problem = new Problem({
      ...req.body,
      createdBy: req.user.id.toString(),
      timeline: [{ text: "Problem reported" }]
    });

    // 🤖 AI AUTO-ASSIGNMENT
    const bestMatch = await matchVolunteer(problem);
    if (bestMatch) {
      problem.assignedTo = bestMatch;
      problem.status = "In Progress";
      problem.timeline.push({ text: "AI auto-assigned a volunteer" });
      
      // Send notification to the matched volunteer
      await User.findByIdAndUpdate(bestMatch, {
        $push: { notifications: { text: `You were auto-assigned to an urgently matched problem: ${problem.title}`, type: "alert" } }
      });
    }

    await problem.save();

    // ⚡ REAL-TIME EMIT
    const io = req.app.get("io");
    if (io) {
      io.emit("new-problem", problem);
      if (problem.urgency?.toLowerCase() === "critical") {
        io.emit("emergency-alert", problem);
      }
    }

    res.status(201).json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/problems — Get all problems (dynamic priority calculation)
router.get("/", async (req, res) => {
  try {
    let problems = await Problem.find().lean();
    
    // Calculate dynamic smart priority based on time elapsed
    problems = problems.map(p => {
      const hoursElapsed = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60);
      const dynamicBoost = Math.floor(hoursElapsed) * 5; // +5 points per hour waiting
      return {
        ...p,
        score: (p.score || 0) + dynamicBoost
      };
    });
    
    // Sort by dynamic score, then by date
    problems.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json(problems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/problems/:id/status — Update problem status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    let timelineUpdate = `Status updated to ${status}`;
    if (status === "In Progress") timelineUpdate = "Work started";
    if (status === "Resolved") timelineUpdate = "Problem resolved";

    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        $push: { timeline: { text: timelineUpdate } }
      },
      { new: true }
    );
    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/problems/:id/assign — Assign a volunteer
router.patch("/:id/assign", async (req, res) => {
  try {
    const { volunteerId, volunteerName } = req.body;
    
    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: volunteerId,
        status: "In Progress",
        $push: { timeline: { text: `Volunteer assigned (${volunteerName})` } }
      },
      { new: true }
    );

    // Notify the assigned user
    if (problem) {
      await User.findByIdAndUpdate(volunteerId, {
        $push: { notifications: { text: `You were assigned to problem: ${problem.title}`, type: "task" } }
      });
      
      const io = req.app.get("io");
      if (io) io.emit("problem-updated", problem);
    }

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/problems/:id — Delete a problem (Owner only)
router.delete("/:id", async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ message: "Not found" });
    }

    // 🔒 OWNER CHECK (Body-based comparison as requested)
    // We check either req.body.userId or some other provided identifier
    if (problem.createdBy !== req.body.userId) {
      return res.status(403).json({ message: "Not allowed: Owner mismatch" });
    }

    await problem.deleteOne();
    res.json({ message: "Deleted successfully ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
