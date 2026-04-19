const express = require("express");
const router = express.Router();
const { getUrgency } = require("../controllers/aiController");

// POST /api/ai/urgency
router.post("/urgency", getUrgency);

module.exports = router;
