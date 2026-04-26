const { GoogleGenerativeAI } = require("@google/generative-ai");
const { calculateAIScore } = require("../services/aiMatcher");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Strictly maps any Gemini response text to a valid urgency label.
 * Iterates in priority order so partial matches like "The urgency is Critical."
 * are still handled correctly. Falls back to "Low" if nothing matches.
 */
const cleanUrgency = (text) => {
  const valid = ["critical", "high", "medium", "low"];
  for (const word of valid) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      return word;
    }
  }
  return "low"; // safe fallback
};

/**
 * Fallback logic to determine urgency based on keywords if AI fails.
 * Ensures the system remains functional during demos.
 */
const getFallbackUrgency = (text) => {
  const lower = text.toLowerCase();

  if (
    lower.includes("death") ||
    lower.includes("flood") ||
    lower.includes("earthquake") ||
    lower.includes("accident") ||
    lower.includes("fire") ||
    lower.includes("no food") ||
    lower.includes("no water")
  ) {
    return { severity: "critical", score: 95 };
  }
  if (
    lower.includes("medical") || 
    lower.includes("injury") || 
    lower.includes("damage") ||
    lower.includes("urgent")
  ) {
    return { severity: "high", score: 75 };
  }
  if (
    lower.includes("water") || 
    lower.includes("food") || 
    lower.includes("electricity") ||
    lower.includes("school")
  ) {
    return { severity: "medium", score: 50 };
  }

  return { severity: "low", score: 20 };
};

exports.getUrgency = async (req, res, next) => {
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ success: false, message: "Description is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an emergency response AI.

Classify the severity STRICTLY based on rules:

critical:
- Deaths reported
- Multiple severe injuries
- Building collapse, fire, disaster

high:
- Injuries but no deaths

medium:
- Minor injuries or risk

low:
- No immediate danger

Also determine the required responders (e.g., Ambulance, Fire Brigade, Police, NGO, Medical).

Now analyze:

"${description}"

Return JSON:
{
  "severity": "critical | high | medium | low",
  "confidence": number (0-100),
  "reason": "short explanation",
  "responders": ["Ambulance", "Fire Brigade"]
}
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/gi, "").replace(/```/gi, "").trim();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = {};
    }

    const severityRaw = data.severity || text;
    const severity = cleanUrgency(severityRaw);
    const score = data.confidence ?? 10;
    const responders = Array.isArray(data.responders) ? data.responders : [];

    res.json({ 
      success: true, 
      data: { severity, score, reason: data.reason, responders } 
    });
  } catch (err) {
    console.error("AI failed, using fallback:", err.message);

    const fallback = getFallbackUrgency(description);
    res.json({
      success: true,
      data: {
        ...fallback,
        note: "AI unavailable, local fallback assigned",
      }
    });
  }
};

exports.suggestDescription = async (req, res, next) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, message: "Text is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an emergency response assistant.

Rewrite and EXPAND the following crisis report into a detailed, structured, and professional emergency report.

Include:
- What happened
- Estimated casualties
- Urgency level
- Required response teams
- Immediate actions needed

Original:
"${text}"

Return ONLY the improved report without any markdown blocks.
`;

    const result = await model.generateContent(prompt);
    const suggestion = result.response.text().trim();

    res.json({ success: true, data: { result: suggestion } });
  } catch (err) {
    console.error("AI Suggestion failed, using fallback:", err.message);
    
    // Simple fallback: capitalize first letter and ensure it ends with a period
    let suggestion = text.trim();
    if (suggestion) {
      suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
      if (!suggestion.endsWith(".")) suggestion += ".";
    }
    
    res.json({ 
      success: true,
      data: {
        result: suggestion,
        note: "Local fallback suggestion" 
      }
    });
  }
};
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculateMatch = (user, problem) => {
  let score = 0;

  // 1. Skill match (sub-categories)
  const userSkills = Array.isArray(user.skills) ? user.skills : (user.skills ? [user.skills] : []);
  const subCats = Array.isArray(problem.subCategories) ? problem.subCategories : [problem.category || "general"];
  
  const skillMatches = userSkills.filter(skill =>
    subCats.some(sub => sub.toLowerCase().includes(skill.toLowerCase()))
  ).length;

  score += skillMatches * 20;

  // 2. Distance score
  const distance = getDistance(
    user.location?.lat,
    user.location?.lng,
    problem.location?.lat,
    problem.location?.lng
  );

  if (distance < 10) score += 30;
  else if (distance < 50) score += 10;

  // 3. Availability Bonus
  if (user.availability !== false) score += 20;

  // Final Score (0-100)
  return Math.min(Math.round(score), 100);
};

exports.matchProblemsForUser = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const Problem = require("../models/Problem");
    
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    const problems = await Problem.find({ status: "open" });

    const matches = problems.map(p => ({
      problem: p,
      score: calculateMatch(user, p)
    }));

    matches.sort((a, b) => b.score - a.score);

    res.json({ success: true, data: matches.slice(0, 10) });
  } catch (err) {
    next(err);
  }
};

exports.matchUsersForProblem = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const Problem = require("../models/Problem");
    
    const problem = await Problem.findById(req.params.problemId);
    if (!problem) return res.status(404).json({ success: false, message: "Problem not found" });
    
    const users = await User.find({ role: { $in: ["volunteer", "worker"] } });

    const matches = users.map(u => {
      const matchData = calculateAIScore(u, problem);
      return {
        user: { _id: u._id, name: u.name, role: u.role, skills: u.skills, status: u.status, location: u.location },
        ...matchData
      };
    });

    matches.sort((a, b) => b.score - a.score);

    res.json({ success: true, data: matches.slice(0, 10) });
  } catch (err) {
    next(err);
  }
};

exports.autoAssign = async (req, res, next) => {
  try {
    const Problem = require("../models/Problem");
    const User = require("../models/User");
    const Notification = require("../models/Notification");
    const { problemId } = req.params;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ success: false, message: "Problem not found" });

    const responders = await User.find({ role: { $in: ["volunteer", "worker"] }, status: "available" });
    
    const matches = responders.map(u => ({
      user: u,
      ...calculateAIScore(u, problem)
    })).sort((a, b) => b.score - a.score);

    const bestUsers = matches.slice(0, 3);
    const io = req.app.get("io");

    for (const match of bestUsers) {
      const u = match.user;
      
      // Check if already requested or in team
      if (problem.requests.some(r => r.userId.toString() === u._id.toString())) continue;
      if (problem.team.some(m => m.userId.toString() === u._id.toString())) continue;

      problem.requests.push({
        userId: u._id,
        role: u.role,
        status: "pending",
        type: "AI_SUGGESTED"
      });

      // Persistent Notification
      const notif = new Notification({
        userId: u._id,
        message: `🤖 AI Dispatcher suggests you join mission: ${problem.title}. Priority: ${match.priority}`,
        type: "ai_suggestion",
        problemId: problem._id
      });
      await notif.save();

      // Real-time Emit
      if (io) {
        io.to(u._id.toString()).emit("aiRequest", {
          message: `AI Suggestion: Join mission ${problem.title}?`,
          problemId: problem._id,
          priority: match.priority,
          score: match.score.toFixed(2)
        });
        io.to(u._id.toString()).emit("new-notification", notif);
      }
    }

    await problem.save();
    if (io) io.emit("problem-updated", problem);

    res.json({ success: true, data: { suggestions: bestUsers.length } });
  } catch (err) {
    next(err);
  }
};

exports.copilot = async (req, res, next) => {
  const { messages, report } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const contextMessages = Array.isArray(messages) 
      ? messages.slice(-10).map(m => `${m.senderName || "Unknown"}: ${m.text}`).join("\n")
      : "No recent messages.";

    const prompt = `
You are SevaLink AI Copilot, an emergency field commander.

CRISIS CONTEXT:
- Problem: ${report?.title || "Unknown Incident"}
- Description: ${report?.description || "No description provided."}
- Severity: ${report?.severity || "unknown"}
- Location: ${JSON.stringify(report?.location || "unknown")}

RECENT CHAT HISTORY:
${contextMessages}

YOUR MISSION:
Analyze the chat and crisis context. Provide ONE SHORT, ACTIONABLE PIECE OF GUIDANCE for the responders.
- Be concise (max 3 sentences).
- Act like a field commander.
- Prioritize human life and responder safety.
- Do not repeat what responders just said.
- If they just arrived, tell them what to check first.
- If they need medical, remind them of triage.

Response (Text only, no markdown):
`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    res.json({ success: true, data: { reply } });
  } catch (err) {
    console.error("AI Copilot Error:", err);
    res.json({ 
      success: true,
      data: {
        reply: "⚠️ System Note: AI Engine offline. Proceed with standard emergency protocols. Prioritize safety and clear communication." 
      }
    });
  }
};
