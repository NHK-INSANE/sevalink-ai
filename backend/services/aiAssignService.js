const haversine = require("haversine-distance");

/**
 * Calculates a matching score for a volunteer against a specific crisis report.
 * Factors include skill relevance, proximity, and availability.
 */
function calculateScore(problem, user) {
  let score = 0;

  // Skill matching - compare problem requirements with user skills
  const problemSkills = Array.isArray(problem.skills) ? problem.skills : [];
  const userSkills = Array.isArray(user.skills) ? user.skills : [];
  
  const skillMatch = problemSkills.filter(skill =>
    userSkills.includes(skill)
  ).length;

  score += skillMatch * 10; // High weight for skills

  // Proximity scoring using haversine distance
  if (problem.location && user.location) {
    const distance = haversine(
      { lat: problem.location.lat, lon: problem.location.lng },
      { lat: user.location.lat, lon: user.location.lng }
    );

    // Score increases as distance decreases (max 50 points for proximity)
    score += Math.max(0, 50 - (distance / 1000)); 
  }

  // Availability bonus
  if (user.status === "Available" || user.available) score += 15;

  return score;
}

/**
 * Automatically assigns the best responders to a crisis.
 */
async function autoAssign(problem, users) {
  const scored = users.map(user => ({
    user,
    score: calculateScore(problem, user)
  }));

  // Sort by highest score first
  const sorted = scored.sort((a, b) => b.score - a.score);

  // Return the top candidates (default 3)
  return sorted.slice(0, problem.requiredPeople || 3);
}

module.exports = { autoAssign };
