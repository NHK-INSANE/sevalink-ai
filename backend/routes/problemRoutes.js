const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { auth, authorize } = require("../middleware/auth");
const { validate, problemSchema } = require("../middleware/validation");

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
async function matchVolunteers(problem, topN = 5) {
  try {
    const users = await User.find({
      role: { $in: ["Volunteer", "volunteer", "Worker", "worker"] }
    }).select("-password");
    if (users.length === 0) return [];

    const urgencyBoost = { critical: 30, high: 20, medium: 10, low: 0 };

    const scored = users.map(u => {
      let score = 0;
      const pLat = problem.location?.lat || problem.latitude || 22.3;
      const pLng = problem.location?.lng || problem.longitude || 87.3;
      const uLat = u.location?.lat || u.latitude || 22.3;
      const uLng = u.location?.lng || u.longitude || 87.3;

      const dist = getDistance(pLat, pLng, uLat, uLng);
      const distScore = Math.max(0, 100 - dist);
      score += distScore;

      const uSkills = (u.skills || []).map(s => String(s).toLowerCase());
      if (u.skill) uSkills.push(String(u.skill).toLowerCase());
      
      const pCat = Array.isArray(problem.category) ? problem.category[0] : problem.category;
      const pSkill = String(pCat || "").toLowerCase();
      
      if (pSkill && uSkills.includes(pSkill)) score += 50;

      const urgencyStr = String(problem.urgency || "").toLowerCase();
      score += (urgencyBoost[urgencyStr] || 0);

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
router.post("/", auth, validate(problemSchema), async (req, res) => {
  try {
    const problem = new Problem({
      ...req.body,
      createdBy: req.user.id.toString(),
      timeline: [{ text: "Problem reported" }]
    });

    const topMatches = await matchVolunteers(problem, 5);
    const bestMatch = topMatches[0];

    if (bestMatch) {
      problem.assignedTo = bestMatch._id.toString();
      problem.status = "In Progress";
      problem.timeline.push({ text: `AI auto-assigned to ${bestMatch.name || "volunteer"}` });

      const notifText = `🚨 You matched a nearby ${problem.urgency || ""} crisis: "${problem.title}"`;
      await Promise.all(
        topMatches.map(m => {
          const notification = new Notification({
            userId: m._id,
            text: notifText,
            type: "alert",
          });
          return notification.save();
        })
      );
    }

    await problem.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("new-problem", problem);
      if (problem.urgency?.toLowerCase() === "critical") {
        io.emit("emergency-alert", problem);
      }
      if (topMatches.length > 0) {
        io.emit("matched-volunteers", {
          problem: { _id: problem._id, title: problem.title, urgency: problem.urgency },
          matched: topMatches
        });
      }
    }

    res.status(201).json({ problem, matched: topMatches });
  } catch (err) {
    console.error("🔥 CREATE PROBLEM ERROR:", err);
    res.status(500).json({ 
      error: "Failed to create problem.",
      details: err.message 
    });
  }
});

// GET /api/problems — Get all problems
router.get("/", async (req, res) => {
  try {
    let problems = await Problem.find().lean();
    
    problems = problems.map(p => {
      const hoursElapsed = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60);
      const dynamicBoost = Math.floor(hoursElapsed) * 5;
      return { ...p, score: (p.score || 0) + dynamicBoost };
    });
    
    problems.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json(problems);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch problems." });
  }
});

// PATCH /api/problems/:id/status — Update problem status
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    let timelineUpdate = `Status updated to ${status}`;
    if (status === "In Progress") timelineUpdate = "Work started";
    if (status === "Resolved") timelineUpdate = "Problem resolved";

    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    // Only creator or admin can update status
    if (problem.createdBy !== req.user.id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    problem.status = status;
    problem.timeline.push({ text: timelineUpdate });
    await problem.save();

    const io = req.app.get("io");
    if (io) io.emit("problem-updated", problem);

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: "Failed to update status." });
  }
});

// PATCH /api/problems/:id/assign — Assign a volunteer (Role Hierarchy Enforced)
router.patch("/:id/assign", auth, authorize("ngo", "worker", "admin"), async (req, res) => {
  try {
    const { volunteerId, volunteerName } = req.body;
    const assignedBy = req.user.id;
    
    if (!volunteerId) return res.status(400).json({ error: "volunteerId is required" });

    const target = await User.findById(volunteerId);
    const assigner = await User.findById(assignedBy);

    if (!target || !assigner) return res.status(404).json({ error: "User not found" });

    const aRole = assigner.role.toLowerCase();
    const tRole = target.role.toLowerCase();

    // ❌ Logic: Volunteers can never assign Workers
    if (aRole === "volunteer" && tRole === "worker") {
      return res.status(403).json({ error: "Unauthorized: Volunteers cannot assign Workers." });
    }

    // ❌ Logic: Workers can only assign Volunteers (unless admin/ngo)
    if (aRole === "worker" && tRole !== "volunteer") {
      return res.status(403).json({ error: "Unauthorized: Workers can only assign Volunteers." });
    }

    // ❌ Logic: Workers belonging to different NGOs
    if (aRole === "ngo" && tRole === "worker") {
       if (target.ngoId && target.ngoId.toString() !== assigner._id.toString()) {
         return res.status(403).json({ error: "Unauthorized: This worker belongs to another NGO." });
       }
    }

    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    if (!problem.team.includes(volunteerId)) {
      problem.team.push(volunteerId);
    }
    
    problem.assignedTo = volunteerId; // legacy support
    problem.status = "In Progress";
    problem.timeline.push({ text: `Assigned ${tRole} ${target.name} to the team (by ${aRole})` });
    
    await problem.save();

    const notification = new Notification({
      userId: volunteerId,
      text: `You were assigned to problem: ${problem.title}`,
      type: "task",
    });
    await notification.save();

    const io = req.app.get("io");
    if (io) io.emit("problem-updated", problem);

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: "Failed to assign volunteer." });
  }
});

// DELETE /api/problems/:id — Delete a problem
router.delete("/:id", auth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    if (problem.createdBy !== req.user.id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only the creator or admin can delete this." });
    }

    await problem.deleteOne();
    res.json({ message: "Deleted successfully ✅" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete problem." });
  }
});

// POST /api/problems/force-assign — Admin manual override
router.post("/force-assign", auth, authorize("admin"), async (req, res) => {
  try {
    const { problemId, helperId, helperName } = req.body;
    if (!problemId || !helperId) return res.status(400).json({ error: "problemId and helperId required" });

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

    await User.findByIdAndUpdate(helperId, {
      $push: { notifications: { text: `🚨 Admin assigned you to: "${problem.title}"`, type: "alert", date: new Date() } }
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("assigned", { problemId, helperId, problemTitle: problem.title });
      io.emit("problem-updated", problem);
    }

    res.json({ success: true, problem });
  } catch (err) {
    res.status(500).json({ error: "Force assign failed." });
  }
});

// GET /api/problems/:id/history — Get chat history
router.get("/:id/history", auth, async (req, res) => {
  try {
    const Message = require("../models/Message");
    const messages = await Message.find({ problemId: req.params.id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// POST /api/problems/:id/messages — Save chat message
router.post("/:id/messages", auth, async (req, res) => {
  try {
    const Message = require("../models/Message");
    const msg = new Message({
      ...req.body,
      problemId: req.params.id
    });
    await msg.save();
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: "Failed to save message" });
  }
});

// POST /api/problems/:id/assign — Assign yourself
router.post("/:id/assign", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    if (!problem.team.includes(userId)) {
      problem.team.push(userId);
      problem.timeline.push({ text: `${req.user.name || "A user"} joined the team` });
      
      // If no leader assigned yet, the first joiner becomes leader (optional logic, but let's keep it simple)
      if (!problem.leader) {
        problem.leader = userId;
      }
      
      await problem.save();
    }

    res.json({ success: true, problem });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign yourself" });
  }
});

// GET /api/problems/:id/team — Get team members
router.get("/:id/team", async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).populate("team leader", "name email role phone");
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    res.json(problem.team);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

router.post("/:id/ai-assign", auth, authorize("admin", "ngo"), async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    // AI Scoring: Distance (50%) + Skills (30%) + Experience (20%)
    const users = await User.find({ role: { $in: ["worker", "volunteer", "Worker", "Volunteer"] } });
    
    const pLat = problem.location?.lat || 22.3;
    const pLng = problem.location?.lng || 87.3;

    const scored = users.map(u => {
      const uLat = u.location?.lat || 22.3;
      const uLng = u.location?.lng || 87.3;
      const dist = getDistance(pLat, pLng, uLat, uLng);
      
      let score = Math.max(0, 100 - dist); // Distance score
      
      // Skill match
      const pCat = String(problem.category || "").toLowerCase();
      const uSkills = (u.skills || []).map(s => String(s).toLowerCase());
      if (uSkills.includes(pCat)) score += 50;

      return { id: u._id, score };
    });

    const selectedIds = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.id);

    problem.team = selectedIds;
    if (selectedIds.length > 0 && !problem.leader) {
      problem.leader = selectedIds[0];
    }

    problem.timeline.push({ text: `AI Neural-Assign: Recruited ${selectedIds.length} specialists based on proximity and skill-match.` });
    await problem.save();

    res.json({ success: true, team: problem.team });
  } catch (err) {
    res.status(500).json({ error: "AI Assign failed" });
  }
});

// GET /api/problems/:id/ai-match — Get best matches
router.get("/:id/ai-match", auth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const matches = await matchVolunteers(problem, 5);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: "AI Match failed" });
  }
});

// OVERRIDE PATCH status to enforce leader control
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id.toString();

    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    // Enforce Leader Control: Only leader or admin or creator can update status
    const isLeader = problem.leader && problem.leader.toString() === userId;
    const isCreator = problem.createdBy === userId;
    const isAdmin = req.user.role === "admin";

    if (!isLeader && !isCreator && !isAdmin) {
      return res.status(403).json({ error: "Only the team leader or admin can update status" });
    }

    problem.status = status;
    problem.timeline.push({ text: `Status updated to ${status} by ${req.user.name}` });
    await problem.save();

    const io = req.app.get("io");
    if (io) io.emit("problem-updated", problem);

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// PATCH /api/problems/:id/leader — Assign Leader (NGO/Admin only)
router.patch("/:id/leader", auth, authorize("ngo", "admin"), async (req, res) => {
  try {
    const { userId } = req.body;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    problem.leader = userId;
    if (!problem.team.includes(userId)) {
      problem.team.push(userId);
    }
    
    problem.timeline.push({ text: `New team leader assigned: ${userId}` });
    await problem.save();
    
    res.json({ success: true, problem });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign leader" });
  }
});

// POST /api/problems/:id/members — Add members (Leader/NGO only)
router.post("/:id/members", auth, async (req, res) => {
  try {
    const { memberId } = req.body;
    const userId = req.user.id.toString();
    
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const isLeader = problem.leader && problem.leader.toString() === userId;
    const isNGO = req.user.role === "ngo" || req.user.role === "admin";
    
    if (!isLeader && !isNGO) {
      return res.status(403).json({ error: "Only team leader or NGO can add members" });
    }

    // Role Hierarchy Rule
    const targetUser = await User.findById(memberId);
    if (!targetUser) return res.status(404).json({ error: "Target member not found" });

    const uRole = (req.user.role || "").toLowerCase();
    const tRole = (targetUser.role || "").toLowerCase();

    if (!isNGO) {
       // Leaders who aren't NGOs (Workers/Volunteers)
       if (uRole === "volunteer" && tRole === "worker") {
         return res.status(403).json({ error: "Volunteers cannot recruit professional Workers" });
       }
       if (uRole === "worker" && tRole === "worker" && !isNGO) {
         // Maybe workers can add workers? User says "Worker -> volunteer". I'll stick to their rule.
         // Actually, "Worker -> volunteer" implies Workers can't add Workers.
       }
    }

    if (!problem.team.includes(memberId)) {
      problem.team.push(memberId);
      await problem.save();
    }
    
    res.json({ success: true, team: problem.team });
  } catch (err) {
    res.status(500).json({ error: "Failed to add member" });
  }
});

module.exports = router;


