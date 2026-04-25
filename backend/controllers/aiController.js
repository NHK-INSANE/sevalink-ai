const { GoogleGenerativeAI } = require("@google/generative-ai");
const { calculateAIScore } = require("../services/aiMatcher");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Strictly maps any Gemini response text to a valid urgency label.
 * Iterates in priority order so partial matches like "The urgency is Critical."
 * are still handled correctly. Falls back to "Low" if nothing matches.
 */
const cleanUrgency = (text) => {
  const valid = ["Critical", "High", "Medium", "Low"];
  for (const word of valid) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      return word;
    }
  }
  return "Low"; // safe fallback
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
    return { urgency: "Critical", score: 95 };
  }
  if (
    lower.includes("medical") || 
    lower.includes("injury") || 
    lower.includes("damage") ||
    lower.includes("urgent")
  ) {
    return { urgency: "High", score: 75 };
  }
  if (
    lower.includes("water") || 
    lower.includes("food") || 
    lower.includes("electricity") ||
    lower.includes("school")
  ) {
    return { urgency: "Medium", score: 50 };
  }

  return { urgency: "Low", score: 20 };
};

exports.getUrgency = async (req, res) => {
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "Description is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an emergency response AI.

Classify the severity STRICTLY based on rules:

CRITICAL:
- Deaths reported
- Multiple severe injuries
- Building collapse, fire, disaster

HIGH:
- Injuries but no deaths

MEDIUM:
- Minor injuries or risk

LOW:
- No immediate danger

Also determine the required responders (e.g., Ambulance, Fire Brigade, Police, NGO, Medical).

Now analyze:

"${description}"

Return JSON:
{
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
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

    const urgencyRaw = data.severity || text;
    const urgency = cleanUrgency(urgencyRaw);
    const score = data.confidence ?? 10;
    const responders = Array.isArray(data.responders) ? data.responders : [];

    res.json({ urgency, score, reason: data.reason, responders });
  } catch (err) {
    console.error("AI failed, using fallback:", err.message);

    const fallback = getFallbackUrgency(description);
    res.json({
      ...fallback,
      note: "AI unavailable, local fallback assigned",
    });
  }
};

exports.suggestDescription = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
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

    res.json({ result: suggestion });
  } catch (err) {
    console.error("AI Suggestion failed, using fallback:", err.message);
    
    // Simple fallback: capitalize first letter and ensure it ends with a period
    let suggestion = text.trim();
    if (suggestion) {
      suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
      if (!suggestion.endsWith(".")) suggestion += ".";
    }
    
    res.json({ 
      result: suggestion,
      note: "Local fallback suggestion" 
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
  // Skill match
  const userSkills = Array.isArray(user.skills) ? user.skills : (user.skills ? [user.skills] : []);
  const reqSkills = Array.isArray(problem.requiredSkills) ? problem.requiredSkills : (problem.requiredSkill ? [problem.requiredSkill] : []);
  
  if (reqSkills.length === 0) return 0.5; // base match if no skills required

  const matchSkills = reqSkills.filter(skill =>
    userSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
  );

  const skillScore = matchSkills.length / reqSkills.length;

  // Distance score
  const distance = getDistance(
    user.location?.lat,
    user.location?.lng,
    problem.location?.lat,
    problem.location?.lng
  );

  const distanceScore = distance < 10 ? 1 : distance < 50 ? 0.5 : 0.2;

  // Urgency score
  const urgencyMap = { "Critical": 1, "High": 0.8, "Medium": 0.5, "Low": 0.2 };
  const urgencyScore = urgencyMap[problem.urgency] || 0.5;

  // Final Score
  return Math.round((skillScore * 0.5 + distanceScore * 0.3 + urgencyScore * 0.2) * 100);
};

exports.matchProblemsForUser = async (req, res) => {
  try {
    const User = require("../models/User");
    const Problem = require("../models/Problem");
    
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const problems = await Problem.find({ status: "Open" });

    const matches = problems.map(p => ({
      problem: p,
      score: calculateMatch(user, p)
    }));

    matches.sort((a, b) => b.score - a.score);

    res.json(matches.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: "Matching failed" });
  }
};

exports.matchUsersForProblem = async (req, res) => {
  try {
    const User = require("../models/User");
    const Problem = require("../models/Problem");
    
    const problem = await Problem.findById(req.params.problemId);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    
    const users = await User.find({ role: { $in: ["volunteer", "worker"] } });

    const matches = users.map(u => {
      const matchData = calculateAIScore(u, problem);
      return {
        user: { _id: u._id, name: u.name, role: u.role, skills: u.skills, status: u.status, location: u.location },
        ...matchData
      };
    });

    matches.sort((a, b) => b.score - a.score);

    res.json(matches.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: "Matching failed" });
  }
};

exports.autoAssign = async (req, res) => {
  try {
    const Problem = require("../models/Problem");
    const User = require("../models/User");
    const Notification = require("../models/Notification");
    const { problemId } = req.params;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

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

    res.json({ success: true, suggestions: bestUsers.length });
  } catch (err) {
    console.error("AutoAssign Error:", err);
    res.status(500).json({ error: "Auto-assignment failed" });
  }
};

exports.copilot = async (req, res) => {
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
- Severity: ${report?.urgency || "Unknown"}
- Location: ${JSON.stringify(report?.location || "Unknown")}

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

    res.json({ reply });
  } catch (err) {
    console.error("AI Copilot Error:", err);
    res.json({ 
      reply: "⚠️ System Note: AI Engine offline. Proceed with standard emergency protocols. Prioritize safety and clear communication." 
    });
  }
};
