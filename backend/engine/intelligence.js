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

function generateTasks(description) {
  const tasks = [];
  const d = String(description || "").toLowerCase();

  if (d.includes("injured") || d.includes("casualty") || d.includes("bleeding")) {
    tasks.push("Provide first aid");
    tasks.push("Call ambulance");
  }

  if (d.includes("fire") || d.includes("smoke")) {
    tasks.push("Extinguish fire");
    tasks.push("Clear perimeter");
  }

  if (d.includes("collapse") || d.includes("trapped")) {
    tasks.push("Rescue trapped people");
    tasks.push("Stabilize structure");
  }

  if (d.includes("flood") || d.includes("water")) {
    tasks.push("Evacuate waterlogged zones");
    tasks.push("Deploy life jackets");
  }
  
  if (tasks.length === 0) {
    tasks.push("Assess situation and report back");
    tasks.push("Secure the area");
  }

  return [...new Set(tasks)].slice(0, 5); // Limit max tasks to avoid overload
}

function getPriority(task) {
  const t = task.toLowerCase();
  if (t.includes("rescue") || t.includes("life") || t.includes("evacuate")) return "CRITICAL";
  if (t.includes("ambulance") || t.includes("aid") || t.includes("medical") || t.includes("fire")) return "HIGH";
  if (t.includes("perimeter") || t.includes("secure") || t.includes("stabilize")) return "MEDIUM";
  return "LOW";
}

// Basic skill-matching logic. In a real system, `task` could be embedded using an LLM.
function assignTask(task, members) {
  if (!members || members.length === 0) return null;
  
  // Exclude busy members if we were tracking them, but for now we just pick the first available
  // Here we just pick the best match, for now we will randomize or match based on simple heuristics
  const available = members.filter(m => m.status !== "busy");
  if (available.length === 0) return null;
  
  // Calculate score
  const scored = available.map(m => {
    let score = 0;
    const skills = (m.skills || []).map(s => s.toLowerCase());
    const t = task.toLowerCase();
    
    if (t.includes("medical") || t.includes("aid") || t.includes("ambulance")) {
      if (skills.includes("medical") || skills.includes("first aid")) score += 10;
    }
    if (t.includes("rescue") || t.includes("fire")) {
      if (skills.includes("rescue") || skills.includes("firefighting")) score += 10;
    }
    if (m.role === "worker") score += 5; // Preference to official workers
    
    return { user: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].user;
}

module.exports = {
  detectSeverity,
  recommendResources,
  classifyCrisis,
  generateTasks,
  getPriority,
  assignTask
};
