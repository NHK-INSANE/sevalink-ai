const express = require("express");
const router = express.Router();
const { getUrgency, suggestDescription, matchProblemsForUser, matchUsersForProblem, autoAssign } = require("../controllers/aiController");

/**
 * @route POST /api/ai/urgency
 */
router.post("/urgency", getUrgency);

/**
 * @route POST /api/ai/suggest
 */
router.post("/suggest", suggestDescription);

/**
 * @route GET /api/ai/match/problems/:userId
 */
router.get("/match/problems/:userId", matchProblemsForUser);

/**
 * @route GET /api/ai/match/users/:problemId
 */
router.get("/match/users/:problemId", matchUsersForProblem);

/**
 * @route POST /api/ai/auto-assign/:problemId
 */
router.post("/auto-assign/:problemId", autoAssign);
router.post("/copilot", require("../controllers/aiController").copilot);

module.exports = router;
