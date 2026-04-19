const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Fallback logic to determine urgency based on keywords if AI fails.
 * Ensures the system remains functional during demos.
 */
const getFallbackUrgency = (text) => {
  const lower = text.toLowerCase();

  if (
    lower.includes("death") ||
    lower.includes("emergency") ||
    lower.includes("no food") ||
    lower.includes("no water")
  ) {
    return "Critical";
  }
  if (lower.includes("medical") || lower.includes("injury")) {
    return "High";
  }
  if (lower.includes("school") || lower.includes("education")) {
    return "Medium";
  }

  return "Low";
};

exports.getUrgency = async (req, res) => {
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "Description is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a crisis assessment AI for a civic platform.
Classify the following problem description into exactly ONE of these urgency levels: Critical, High, Medium, or Low.

Rules:
- Critical: Immediate threat to life, mass casualties, no food/water/shelter in emergency
- High: Serious issue affecting many people, needs urgent action within hours
- Medium: Important issue but not life-threatening, needs resolution within days
- Low: Minor inconvenience, can wait weeks

Respond with ONLY the single word: Critical, High, Medium, or Low.

Problem: ${description}`;

    const result = await model.generateContent(prompt);
    const urgencyRaw = result.response.text().trim();

    // Sanitize to valid enum values
    const validUrgencies = ["Critical", "High", "Medium", "Low"];
    const urgency = validUrgencies.find((u) =>
      urgencyRaw.toLowerCase().includes(u.toLowerCase())
    ) || "Medium";

    res.json({ urgency });
  } catch (err) {
    console.error("AI failed, using fallback:", err.message);

    const fallback = getFallbackUrgency(description);
    res.json({
      urgency: fallback,
      note: "AI unavailable, local fallback assigned",
    });
  }
};
