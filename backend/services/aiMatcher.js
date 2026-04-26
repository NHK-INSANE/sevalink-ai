function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) *
    Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const matchSkills = (userSkills = [], problemSkills = []) => {
  let match = 0;
  if (!Array.isArray(userSkills)) userSkills = [userSkills];
  if (!Array.isArray(problemSkills)) problemSkills = [problemSkills];

  problemSkills.forEach(skill => {
    if (userSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))) match++;
  });

  return (match / (problemSkills.length || 1)) * 100; 
};

function calculateAIScore(user, problem) {
  const distance = getDistance(
    problem.location?.lat,
    problem.location?.lng,
    user.location?.lat,
    user.location?.lng
  );

  const skillScore = matchSkills(user.skills, problem.category || []); // Using category as skills for now if skills not explicitly in problem
  
  // availability: 1 if user.status === "available", else 0.5?
  const availability = user.status === "available" ? 1 : 0.5;

  // Score = (skillScore * 0.5) + ((1 / distance) * 0.3) + (availability * 0.2);
  // Normalize 1/distance to be meaningful, e.g., 100/distance capped at 100
  const distFactor = Math.min(100, 100 / (distance || 1));
  
  const score = (skillScore * 0.5) + (distFactor * 0.3) + (availability * 20); // Scaled availability

  // Smart Routing Priority
  let priority = "LOW";
  if (distance < 5) priority = "HIGH";
  else if (distance < 20) priority = "MEDIUM";

  return {
    score,
    distance: distance.toFixed(2),
    priority
  };
}

module.exports = { getDistance, matchSkills, calculateAIScore };
