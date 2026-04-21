const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");
const User = require("../models/User");
const auth = require("../middleware/auth");

// ── Haversine Distance (km) ───────────────────────────────────────────────────
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

// ── Smart AI Volunteer Matching ───────────────────────────────────────────────
// Returns top N volunteers scored on: proximity + skill match + urgency boost
async function matchVolunteers(problem, topN = 5) {
  try {
    const users = await User.find({
      role: { $in: ["Volunteer", "volunteer", "Worker", "worker"] }
    });
    if (users.length === 0) return [];

    const urgencyBoost = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 0,
    };

    const scored = users.map(u => {
      let score = 0;

      // 1. Distance score — closer = more points (max ~100 for 0 km)
      const dist = getDistance(
        problem.location?.lat, problem.location?.lng,
        u.location?.lat,       u.location?.lng
      );
      const distScore = Math.max(0, 100 - dist); // 0 km → 100pts, 100 km+ → 0
      score += distScore;

      // 2. Skill match
      const uSkills = (u.skills || []).map(s => s.toLowerCase());
      if (u.skill) uSkills.push(u.skill.toLowerCase());
      const pSkill = (problem.requiredSkill || problem.category || "").toLowerCase();
      if (pSkill && uSkills.includes(pSkill)) score += 50;

      // 3. Urgency boost
      score += (urgencyBoost[problem.urgency?.toLowerCase()] || 0);

      return { user: u, score, distKm: Math.round(dist) };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(({ user, score, distKm }) => ({
        _id:     user._id,
        name:    user.name,
        email:   user.email,
        phone:   user.phone,
        skills:  user.skills || [],
        skill:   user.skill,
        role:    user.role,
        score:   Math.round(score),
        distKm
      }));
  } catch (err) {
    console.error("Match Error:", err);
    return [];
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

    // 🤖 AI SMART MATCHING — top 5 volunteers by score
    const topMatches = await matchVolunteers(problem, 5);
    const bestMatch = topMatches[0];

    if (bestMatch) {
      problem.assignedTo = bestMatch._id.toString();
      problem.status = "In Progress";
      problem.timeline.push({ text: `AI auto-assigned to ${bestMatch.name || "volunteer"}` });

      // Notify ALL matched helpers
      const notifText = `🚨 You matched a nearby ${problem.urgency || ""} crisis: "${problem.title}"`;
      await Promise.all(
        topMatches.map(m =>
          User.findByIdAndUpdate(m._id, {
            $push: { notifications: { text: notifText, type: "alert", date: new Date() } }
          })
        )
      );
    }

    await problem.save();

    // ⚡ REAL-TIME BROADCAST
    const io = req.app.get("io");
    if (io) {
      io.emit("new-problem", problem);

      if (problem.urgency?.toLowerCase() === "critical") {
        io.emit("emergency-alert", problem);
      }

      // 🎯 Broadcast matched volunteers so all clients can show toast
      if (topMatches.length > 0) {
        io.emit("matched-volunteers", {
          problem: {
            _id:     problem._id,
            title:   problem.title,
            urgency: problem.urgency,
          },
          matched: topMatches
        });
      }
    }

    res.status(201).json({ problem, matched: topMatches });
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

// PATCH /api/problems/:id/assign — Assign a volunteer (With Role Validation)
router.patch("/:id/assign", async (req, res) => {
  try {
    const { volunteerId, volunteerName, assignedBy } = req.body;
    
    if (!volunteerId || !assignedBy) {
      return res.status(400).json({ error: "volunteerId and assignedBy are required" });
    }

    const helper = await User.findById(volunteerId);
    const assigner = await User.findById(assignedBy);

    if (!helper || !assigner) {
      return res.status(404).json({ error: "User not found" });
    }

    // ── NGO Validation ──
    if (assigner.role?.toLowerCase() === "ngo") {
      if (helper.role?.toLowerCase() === "worker") {
        // Ensure worker belongs to this NGO
        if (helper.ngoId?.toString() !== assigner._id.toString()) {
          return res.status(403).json({ error: "Unauthorized: This worker belongs to another NGO." });
        }
      }
    }

    // ── Worker Validation ──
    if (assigner.role?.toLowerCase() === "worker") {
      if (helper.role?.toLowerCase() !== "volunteer") {
        return res.status(403).json({ error: "Unauthorized: Workers can only assign volunteers." });
      }
    }

    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: volunteerId,
        status: "In Progress",
        $push: { timeline: { text: `Assigned to ${helper.role}: ${volunteerName} (by ${assigner.role})` } }
      },
      { new: true }
    );

    // Notify the assigned user
    if (problem) {
      await User.findByIdAndUpdate(volunteerId, {
        $push: { notifications: { text: `You were assigned to problem: ${problem.title}`, type: "task", date: new Date() } }
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

// POST /api/problems/force-assign — Admin manual override
router.post("/force-assign", async (req, res) => {
  try {
    const { problemId, helperId, helperName } = req.body;
    if (!problemId || !helperId) {
      return res.status(400).json({ error: "problemId and helperId are required" });
    }

    const problem = await Problem.findByIdAndUpdate(
      problemId,
      {
        assignedTo: helperId,
        status: "In Progress",
        $push: { timeline: { text: `🛡️ Admin force-assigned ${helperName || "a helper"}` } }
      },
      { new: true }
    );

    if (!problem) return res.status(404).json({ error: "Problem not found" });

    // Notify the helper
    await User.findByIdAndUpdate(helperId, {
      $push: {
        notifications: {
          text: `🚨 Admin assigned you to: "${problem.title}"`,
          type: "alert",
          date: new Date()
        }
      }
    });

    // Real-time: tell the helper's connected client
    const io = req.app.get("io");
    if (io) {
      io.emit("assigned", { problemId, helperId, problemTitle: problem.title });
      io.emit("problem-updated", problem);
    }

    res.json({ success: true, problem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

