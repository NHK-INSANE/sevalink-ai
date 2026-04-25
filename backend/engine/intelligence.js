/**
 * SEVALINK AI - CRISIS INTELLIGENCE ENGINE
 * Detects severity, suggests resources, and predicts escalation.
 */

function detectSeverity(text) {
  let score = 0;
  const d = String(text || "").toLowerCase();

  if (d.includes("dead") || d.includes("death") || d.includes("fatal")) score += 5;
  if (d.includes("injured") || d.includes("casualty") || d.includes("bleeding")) score += 3;
  if (d.includes("fire") || d.includes("smoke") || d.includes("explosion")) score += 4;
  if (d.includes("trapped") || d.includes("stuck") || d.includes("missing")) score += 4;
  if (d.includes("collapsed") || d.includes("falling") || d.includes("debris")) score += 3;
  if (d.includes("flood") || d.includes("water") || d.includes("drowning")) score += 4;

  if (score >= 7) return "CRITICAL";
  if (score >= 4) return "HIGH";
  return "MEDIUM";
}

function recommendResources(type) {
  switch (type) {
    case "MEDICAL":
      return ["Ambulance", "Doctor", "Rescue Team", "Mobile Blood Bank"];
    case "FIRE":
      return ["Fire Brigade", "Police", "Structural Engineer"];
    case "FLOOD":
      return ["Water Rescue", "NGO Support", "Emergency Food"];
    case "RESCUE":
      return ["Search & Rescue", "Paramedics", "Heavy Machinery"];
    default:
      return ["General Volunteer Support", "Local NGO"];
  }
}

function classifyCrisis(text) {
  const d = String(text || "").toLowerCase();
  
  if (d.includes("injured") || d.includes("dead") || d.includes("medical") || d.includes("blood")) {
    return { type: "MEDICAL", priority: detectSeverity(d) };
  }
  if (d.includes("fire") || d.includes("smoke") || d.includes("burn")) {
    return { type: "FIRE", priority: detectSeverity(d) };
  }
  if (d.includes("flood") || d.includes("water") || d.includes("rain")) {
    return { type: "FLOOD", priority: detectSeverity(d) };
  }
  if (d.includes("collapsed") || d.includes("trapped") || d.includes("earthquake")) {
    return { type: "RESCUE", priority: detectSeverity(d) };
  }

  return { type: "GENERAL", priority: detectSeverity(d) };
}

module.exports = {
  detectSeverity,
  recommendResources,
  classifyCrisis
};
