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
    });

    // 🤖 AI AUTO-ASSIGNMENT
    const bestMatch = await matchVolunteer(problem);
    if (bestMatch) {
      problem.assignedTo = bestMatch;
      problem.status = "In Progress"; // Auto-start if matched
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

// GET /api/problems — Get all problems (highest priority first)
router.get("/", async (req, res) => {
  try {
    const problems = await Problem.find().sort({ score: -1, createdAt: -1 });
    res.json(problems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/problems/:id/status — Update problem status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
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
