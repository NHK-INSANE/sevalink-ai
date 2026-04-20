const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");

// POST /api/problems — Create a new problem
router.post("/", async (req, res) => {
  try {
    const problem = new Problem(req.body);
    await problem.save();
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

module.exports = router;
