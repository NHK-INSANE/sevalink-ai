const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const User = require("../models/User");
const { sendNotification } = require("../utils/notifications");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const ChatMessage = require("../models/ChatMessage");
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

// ── GET /api/problems — Get all problems with Smart Sorting & Filtering ──────
router.get("/", async (req, res) => {
  try {
    const { lat, lng, sort, urgency, status } = req.query;
    let query = {};

    if (urgency) query.urgency = urgency.toUpperCase();
    if (status && status !== "All") query.status = status.toUpperCase();

    console.log("🔍 Problem Query:", query);
    let problems = await Problem.find(query).sort({ createdAt: -1 }).lean();
    console.log(`✅ Found ${problems.length} problems for query`);

    // Calculate score and distance
    problems = problems.map(p => {
      const hoursElapsed = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60);
      const dynamicBoost = Math.floor(hoursElapsed) * 5;
      
      let distance = 0;
      if (lat && lng) {
        distance = getDistance(parseFloat(lat), parseFloat(lng), p.location?.lat, p.location?.lng);
      }

      return { 
        ...p, 
        score: (p.score || 0) + dynamicBoost,
        distance: distance
      };
    });

    // Sorting Logic
    if (sort === "nearest" && lat && lng) {
      problems.sort((a, b) => a.distance - b.distance);
    } else if (sort === "newest") {
      problems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      // Default: AI Score + Recency
      problems.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    res.json(problems);
  } catch (err) {
    console.error("Fetch Problems Error:", err);
    res.status(500).json({ error: "Failed to fetch problems." });
  }
});

// ── POST /api/problems — Create a new problem ─────────────────────────────────
router.post("/", auth, validate(problemSchema), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { generateTasks, getPriority } = require("../engine/intelligence");
    const aiTasks = generateTasks(req.body.description);
    
    const taskObjects = aiTasks.map(t => ({
      title: t,
      priority: getPriority(t),
      status: "PENDING"
    }));

    const problem = new Problem({
      ...req.body,
      createdBy: req.user.id.toString(),
      submittedByName: user ? user.name : "Anonymous",
      tasks: taskObjects,
      timeline: [{ text: "🚨 Crisis reported to Neural Link. AI Task generation complete." }]
    });

    await problem.save();
    
    // Create Team Chat for this problem
    const Chat = require("../models/Chat");
    await Chat.create({
      type: "team",
      problemId: problem._id,
      participants: [req.user.id]
    });

    const io = req.app.get("io");
    if (io) io.emit("new-problem", problem);

    res.status(201).json(problem);
  } catch (err) {
    console.error("Create Problem Error:", err);
    res.status(500).json({ error: "Failed to create problem" });
  }
});

const rateLimit = require("express-rate-limit");
const requestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: "Too many tactical requests. Please slow down." }
});

// ── POST /api/problems/:id/assign — Request to Join Team ───────────────────────
router.post("/:id/assign", auth, authorize("volunteer", "worker", "ngo", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    // Check if already in team
    if (problem.team.find(m => m.userId.toString() === userId)) {
      return res.status(400).json({ error: "Already assigned to this team." });
    }

    // Check if already requested
    if (problem.requests.find(r => r.userId.toString() === userId && r.status === "pending")) {
      return res.status(400).json({ error: "Request already pending." });
    }

    problem.requests.push({
      userId,
      role: req.user.role,
      status: "pending"
    });

    await problem.save();

    // Notify NGO
    const io = req.app.get("io");
    if (problem.createdBy) {
      await sendNotification(io, {
        userId: problem.createdBy,
        type: "REQUEST",
        message: `Personnel ID-${userId.toString().slice(-4).toUpperCase()} requested to join: ${problem.title}`,
        data: { problemId: problem._id }
      });
    }

    res.json({ success: true, message: "Assignment request transmitted." });
  } catch (err) {
    res.status(500).json({ error: "Request failed." });
  }
});

// ── POST /api/problems/:id/lead — Request Leadership ───────────────────────────
router.post("/:id/lead", auth, authorize("volunteer", "worker", "ngo", "admin"), async (req, res) => {
  try {
    const userId = req.user.id;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    // Check if already leader
    if (problem.team.find(m => m.userId.toString() === userId && m.isLeader)) {
      return res.status(400).json({ error: "Already the leader of this mission." });
    }

    // Check if already requested leadership
    if (problem.leadRequests.find(r => r.userId.toString() === userId)) {
      return res.status(400).json({ error: "Leadership request already pending." });
    }

    problem.leadRequests.push({ userId });

    await problem.save();

    // Notify NGO
    const io = req.app.get("io");
    if (problem.createdBy) {
      await sendNotification(io, {
        userId: problem.createdBy,
        type: "REQUEST",
        message: `Personnel ID-${userId.toString().slice(-4).toUpperCase()} requested LEADERSHIP for: ${problem.title}`,
        data: { problemId: problem._id }
      });
    }

    res.json({ success: true, message: "Leadership request transmitted." });
  } catch (err) {
    res.status(500).json({ error: "Request failed." });
  }
});

// ── POST /api/problems/:id/team/respond — NGO Accept/Reject Request ───────────
router.post("/:id/team/respond", auth, authorize("ngo", "admin"), async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: 'accept' or 'reject'
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const requestIndex = problem.requests.findIndex(r => r._id.toString() === requestId);
    if (requestIndex === -1) return res.status(404).json({ error: "Request not found" });

    const request = problem.requests[requestIndex];

    if (action === "accept") {
      request.status = "accepted";
      
      // Add to team
      if (!problem.team.find(m => m.userId.toString() === request.userId.toString())) {
        problem.team.push({
          userId: request.userId,
          role: request.role,
          isLeader: false
        });
        
        problem.status = "IN PROGRESS";
        problem.timeline.push({ text: `Member accepted into tactical unit: ${request.role}` });
        
        // System Message for Chat
        problem.messages.push({
          senderId: "SYSTEM",
          senderName: "Mission Control",
          text: `Tactical unit updated: New ${request.role} joined the mission.`,
          type: "system",
          createdAt: new Date()
        });

        // Add to Team Chat
        const Chat = require("../models/Chat");
        await Chat.updateOne(
          { problemId: problem._id, type: "team" },
          { $addToSet: { participants: request.userId } }
        );
      }
    } else {
      request.status = "rejected";
    }

    await problem.save();

    // Broadcast update
    const io = req.app.get("io");
    if (io) io.emit("problem-updated", problem);

    // Notify User
    await sendNotification(io, {
      userId: request.userId,
      type: action === "accept" ? "ASSIGN" : "info",
      message: action === "accept" 
        ? `TACTICAL ALERT: You are ASSIGNED to mission: ${problem.title}` 
        : `Deployment request REJECTED for mission: ${problem.title}`,
      data: { problemId: problem._id }
    });

    res.json({ success: true, message: `Request ${action}ed.` });
  } catch (err) {
    res.status(500).json({ error: "Response failed." });
  }
});

// ── POST /api/problems/:id/team/remove — NGO Remove Member ───────────────────
router.post("/:id/team/remove", auth, authorize("ngo", "admin"), async (req, res) => {
  try {
    const { userId } = req.body;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    problem.team = problem.team.filter(m => m.userId.toString() !== userId);
    
    // System Message
    problem.messages.push({
      senderId: "SYSTEM",
      senderName: "Mission Control",
      text: "Tactical unit updated: A member has been removed from active duty.",
      type: "system",
      createdAt: new Date()
    });

    await problem.save();
    res.json({ success: true, message: "Member removed from mission." });
  } catch (err) {
    res.status(500).json({ error: "Removal failed." });
  }
});

// ── POST /api/problems/:id/team/leader — NGO Make Leader ──────────────────────
router.post("/:id/team/leader", auth, authorize("ngo", "admin"), async (req, res) => {
  try {
    const { userId } = req.body;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    // Only one leader
    problem.team.forEach(m => {
      m.isLeader = m.userId.toString() === userId;
    });

    // System Message
    problem.messages.push({
      senderId: "SYSTEM",
      senderName: "Mission Control",
      text: `Mission Leadership established: ID-${userId.toString().slice(-4).toUpperCase()} is now the Mission Leader.`,
      type: "system",
      createdAt: new Date()
    });

    await problem.save();
    res.json({ success: true, message: "Mission leadership updated." });
  } catch (err) {
    res.status(500).json({ error: "Leadership update failed." });
  }
});

// ── PATCH /api/problems/:id/status — Update status (Leader/NGO/Admin only) ────
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id.toString();

    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const isLeader = problem.team?.some(m => m.userId.toString() === userId && m.isLeader);
    const isCreator = problem.createdBy === userId;
    const isAdmin = req.user.role === "admin" || req.user.role === "ngo";

    if (!isLeader && !isCreator && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized status control." });
    }

    problem.status = status.toUpperCase();
    problem.timeline.push({ text: `Status updated to ${status} by ${req.user.name}` });
    
    if (status.toUpperCase() === "RESOLVED") {
      problem.timeline.push({ text: "🏁 Operation concluded successfully." });
    }

    await problem.save();

    const io = req.app.get("io");
    if (io) io.emit("problem-updated", problem);

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ── DELETE /api/problems/:id — Delete (Owner/NGO/Admin only) ──────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const isOwner = problem.createdBy === req.user.id.toString();
    const isNGO = req.user.role === "ngo" || req.user.role === "admin";

    if (!isOwner && !isNGO) {
      return res.status(403).json({ error: "Unauthorized to delete this mission." });
    }

    await problem.deleteOne();
    
    const io = req.app.get("io");
    if (io) io.emit("problem-deleted", req.params.id);

    res.json({ success: true, message: "Mission terminated ✅" });
  } catch (err) {
    res.status(500).json({ error: "Deletion failed." });
  }
});

// ── GET /api/problems/:id/team — Get full team details ────────────────────────
router.get("/:id/team", auth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).populate("team leader", "name email role phone skills bio");
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    res.json({
      leader: problem.leader,
      members: problem.team
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch team data." });
  }
});

// ── POST /api/problems/:id/ai-assign — AI Assignment Engine ───────────────────
router.post("/:id/ai-assign", auth, authorize("ngo", "admin"), async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const users = await User.find({ 
      role: { $in: ["worker", "volunteer", "Worker", "Volunteer"] },
      _id: { $nin: problem.team }
    });
    
    const pLat = problem.location?.lat || 22.3;
    const pLng = problem.location?.lng || 87.3;

    const scored = users.map(u => {
      const uLat = u.location?.lat || 22.3;
      const uLng = u.location?.lng || 87.3;
      const dist = getDistance(pLat, pLng, uLat, uLng);
      
      let score = Math.max(0, 100 - dist);
      
      const pCat = String(problem.category || "").toLowerCase();
      const uSkills = (u.skills || []).map(s => String(s).toLowerCase());
      if (uSkills.includes(pCat)) score += 50;

      return { user: u, score };
    });

    const topMatches = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // AI adds them to the request list with 'pending' status
    topMatches.forEach(({ user }) => {
      const alreadyRequested = problem.requests.some(r => r.userId.toString() === user._id.toString());
      if (!alreadyRequested) {
        problem.requests.push({
          userId: user._id,
          userName: user.name,
          role: user.role,
          type: "assign",
          status: "pending"
        });

        // Notify User
        const notification = new Notification({
          userId: user._id,
          message: `🤖 AI DISPATCHER: You are a high-match for mission "${problem.title}". Accept to join.`,
          type: "alert"
        });
        notification.save();
      }
    });

    problem.timeline.push({ text: `🧠 AI Intelligence: Recommended ${topMatches.length} specialists for mobilization.` });
    await problem.save();

    res.json({ success: true, message: "AI recommendations processed." });
  } catch (err) {
    res.status(500).json({ error: "AI Dispatcher failed." });
  }
});

// ── POST /api/problems/:id/tasks/auto-assign — Smart Assignment Flow ────────
router.post("/:id/tasks/auto-assign", auth, async (req, res) => {
  try {
    const { assignTask } = require("../engine/intelligence");
    const problem = await Problem.findById(req.params.id).populate("team");
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    // Validate authority
    const isLeader = problem.leader?.toString() === req.user.id.toString();
    const isNGO = req.user.role === "ngo" || req.user.role === "admin";
    if (!isLeader && !isNGO) return res.status(403).json({ error: "Only the Leader or Command can trigger auto-assign." });

    let assignmentsMade = 0;

    problem.tasks.forEach(task => {
      if (!task.assignedTo && task.status !== "COMPLETED") {
        const bestMember = assignTask(task.title, problem.team);
        if (bestMember) {
          task.assignedTo = bestMember._id;
          task.assignedName = bestMember.name;
          assignmentsMade++;

          // Alert the user
          const notification = new Notification({
            userId: bestMember._id,
            message: task.priority === "CRITICAL" ? `🚨 URGENT TASK ASSIGNED: ${task.title}` : `You have been assigned a task: ${task.title}`,
            type: "assignment"
          });
          notification.save();

          const io = req.app.get("io");
          if (io) io.to(bestMember._id.toString()).emit("new-notification", notification);
        }
      }
    });

    if (assignmentsMade > 0) {
      problem.timeline.push({ text: `🧠 AI Engine deployed ${assignmentsMade} task assignments.` });
      await problem.save();
      const io = req.app.get("io");
      if (io) io.emit("problem-updated", problem);
    }

    res.json({ success: true, assignments: assignmentsMade });
  } catch (err) {
    res.status(500).json({ error: "AI Assignment failed." });
  }
});

// ── PATCH /api/problems/:id/tasks/:taskId — Edit/Override Task ──────────────
router.patch("/:id/tasks/:taskId", auth, async (req, res) => {
  try {
    const { title, priority, status, assignedTo, assignedName } = req.body;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const task = problem.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    // Authority checks
    const isLeader = problem.leader?.toString() === req.user.id.toString();
    const isNGO = req.user.role === "ngo" || req.user.role === "admin";
    const isAssigned = task.assignedTo?.toString() === req.user.id.toString();

    if (!isLeader && !isNGO && !isAssigned) {
      return res.status(403).json({ error: "Unauthorized access to task." });
    }

    // Only leaders/ngo can change everything. Assignee can only change status.
    if (isLeader || isNGO) {
      if (title) task.title = title;
      if (priority) task.priority = priority;
      if (assignedTo !== undefined) {
        task.assignedTo = assignedTo || null;
        task.assignedName = assignedName || null;
      }
    }
    
    if (status) task.status = status;

    await problem.save();
    const io = req.app.get("io");
    if (io) io.emit("problem-updated", problem);

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task." });
  }
});

// ── DELETE /api/problems/:id/tasks/:taskId — Delete Task ────────────────────
router.delete("/:id/tasks/:taskId", auth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const isLeader = problem.leader?.toString() === req.user.id.toString();
    const isNGO = req.user.role === "ngo" || req.user.role === "admin";
    if (!isLeader && !isNGO) return res.status(403).json({ error: "Unauthorized." });

    problem.tasks.pull({ _id: req.params.taskId });
    await problem.save();

    const io = req.app.get("io");
    if (io) io.emit("problem-updated", problem);

    res.json(problem);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task." });
  }
});


// ── GET /api/problems/:id/history — Fetch Mission Chat History ────────────────
router.get("/:id/history", auth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Mission not found" });

    // Access Control: Team or NGO only
    const isMember = problem.team?.some(m => m.userId.toString() === req.user.id);
    const isNGO = req.user.role === "ngo" || req.user.role === "admin";
    
    if (!isMember && !isNGO) {
      return res.status(403).json({ error: "Access Denied: Tactical Channel restricted." });
    }

    // Part 8: 14 Day Retention Logic
    const now = new Date();
    const fourteenDaysAgo = new Date(now - (14 * 24 * 60 * 60 * 1000));
    
    const messages = problem.messages.filter(msg => msg.createdAt > fourteenDaysAgo);
    
    if (messages.length < problem.messages.length) {
      problem.messages = messages;
      await problem.save();
    }

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "History fetch failed." });
  }
});

// ── POST /api/problems/:id/messages — Fallback Message Save ────────────────────
router.post("/:id/messages", auth, async (req, res) => {
  try {
    const { text, type } = req.body;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Mission not found" });

    const isMember = problem.team?.some(m => m.userId.toString() === req.user.id);
    const isNGO = req.user.role === "ngo" || req.user.role === "admin";
    
    if (!isMember && !isNGO) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const newMessage = {
      senderId: req.user.id,
      senderName: req.user.name,
      text,
      type: type || "text",
      createdAt: new Date()
    };

    problem.messages.push(newMessage);
    await problem.save();

    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Save failed." });
  }
});

module.exports = router;
