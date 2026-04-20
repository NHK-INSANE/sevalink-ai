const { GoogleGenerativeAI } = require("@google/generative-ai");

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
    lower.includes("emergency") ||
    lower.includes("no food") ||
    lower.includes("no water")
  ) {
    return { urgency: "Critical", score: 90 };
  }
  if (lower.includes("medical") || lower.includes("injury")) {
    return { urgency: "High", score: 70 };
  }
  if (lower.includes("school") || lower.includes("education")) {
    return { urgency: "Medium", score: 40 };
  }

  return { urgency: "Low", score: 10 };
};

exports.getUrgency = async (req, res) => {
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "Description is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an emergency classification system.

Classify the urgency into EXACTLY one word:
Critical, High, Medium, or Low.

Rules:
- Critical: life-threatening, no food/water, severe injury, disaster
- High: serious issue needing quick action (medical, safety)
- Medium: important but not urgent
- Low: minor inconvenience

Also give a score from 0 to 100 (100 = most urgent).

Respond ONLY in this format:
Urgency: <level>
Score: <number>

Problem: ${description}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const urgencyMatch = text.match(/Urgency:\s*(Critical|High|Medium|Low)/i);
    const scoreMatch = text.match(/Score:\s*(\d+)/i);

    const urgency = urgencyMatch ? urgencyMatch[1] : cleanUrgency(text);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 10;

    res.json({ urgency, score });
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
You are a professional crisis coordinator. 
Rewrite the following casual text into a professional, clear, and actionable problem report.
Make it sound authoritative but concise. Keep it under 60 words.

Text: ${text}

Professional Version:
`;

    const result = await model.generateContent(prompt);
    const suggestion = result.response.text().trim();

    res.json({ result: suggestion });
  } catch (err) {
    console.error("AI Suggestion failed:", err.message);
    res.status(500).json({ error: "AI Suggestion failed" });
  }
};
