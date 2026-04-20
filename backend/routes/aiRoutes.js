const express = require("express");
const router = express.Router();
const { getUrgency, suggestDescription } = require("../controllers/aiController");

// POST /api/ai/urgency
router.post("/urgency", getUrgency);

// POST /api/ai/suggest
router.post("/suggest", suggestDescription);

module.exports = router;
