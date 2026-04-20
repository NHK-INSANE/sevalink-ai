const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");
const auth = require("../middleware/auth");

// POST /api/problems — Create a new problem
router.post("/", auth, async (req, res) => {
  try {
    const problem = new Problem({
      ...req.body,
      createdBy: req.user.id,
    });
    await problem.save();
    res.status(201).json(problem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/problems — Get all problems (highest priority first)
router.get("/", async (req, res) => {
  try {
    const problems = await Problem.find().populate("createdBy", "name").sort({ score: -1, createdAt: -1 });
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
router.delete("/:id", auth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    // 🔒 CHECK OWNER
    if (problem.createdBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed: You are not the owner of this report." });
    }

    // 🔒 CHECK ROLE
    const allowedRoles = ["user", "volunteer"];
    if (!allowedRoles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ message: "Not allowed: Only Users and Volunteers can delete reports." });
    }

    await problem.deleteOne();
    res.json({ message: "Problem deleted successfully ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
