const express = require("express");
const router = express.Router();
const { getUrgency, suggestDescription } = require("../controllers/aiController");
const { auth } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 AI requests per hour
  message: "Too many AI requests from this IP, please try again after an hour"
});

// POST /api/ai/urgency
router.post("/urgency", auth, aiLimiter, getUrgency);

// POST /api/ai/suggest
router.post("/suggest", auth, aiLimiter, suggestDescription);

module.exports = router;
