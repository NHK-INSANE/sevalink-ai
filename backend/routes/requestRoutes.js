const express = require("express");
const router = express.Router();
const Request = require("../models/Request");
const Problem = require("../models/Problem");
const { auth } = require("../middleware/auth");

/**
 * @route POST /api/requests
 * @desc Create a join or lead request
 */
router.post("/", auth, async (req, res) => {
  try {
    const { ngoId, problemId, type } = req.body;
    
    // Check if request already exists
    const existing = await Request.findOne({ 
      userId: req.user.id, 
      problemId, 
      type,
      status: "pending" 
    });
    
    if (existing) {
      return res.status(400).json({ success: false, error: "Request already pending" });
    }

    const newRequest = new Request({
      userId: req.user.id,
      ngoId,
      problemId,
      type
    });

    await newRequest.save();

    // Notify the NGO (via Socket.IO if possible)
    const io = req.app.get("io");
    if (io) {
      io.emit("notification", {
        userId: ngoId,
        message: `New ${type} request for mission from ${req.user.name || "a user"}`,
        type: "mission_request"
      });
    }

    res.json({ success: true, request: newRequest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route GET /api/requests/ngo
 * @desc Get requests for the logged-in NGO
 */
router.get("/ngo", auth, async (req, res) => {
  try {
    const requests = await Request.find({ ngoId: req.user.id })
      .populate("userId", "name email customId")
      .populate("problemId", "title problemId");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route PATCH /api/requests/:id
 * @desc Approve or reject a request
 */
router.patch("/:id", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findById(req.id || req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    request.status = status;
    await request.save();

    if (status === "approved") {
      const problem = await Problem.findById(request.problemId);
      if (problem) {
        if (request.type === "lead") {
          problem.leader = request.userId;
        }
        if (!problem.team.includes(request.userId)) {
          problem.team.push(request.userId);
        }
        problem.status = "In Progress";
        await problem.save();
      }
    }

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
