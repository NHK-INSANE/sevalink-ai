function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const matchSkills = (userSkills = [], problemSkills = []) => {
  const uSkills = Array.isArray(userSkills) ? userSkills : [userSkills];
  const pSkills = Array.isArray(problemSkills) ? problemSkills : [problemSkills];

  const matched = uSkills.filter(skill =>
    pSkills.some(pS => pS.toLowerCase().includes(skill.toLowerCase()))
  ).length;

  return matched;
};

function getDistanceScore(distance) {
  if (distance < 5) return 100;
  if (distance < 20) return 70;
  if (distance < 50) return 40;
  return 10;
}

function calculateAIScore(user, problem) {
  // 1. Skill Match (50% weight)
  // Each skill match gives 20 base points, cap at 100
  const skillMatches = matchSkills(user.skills, problem.subCategories || [problem.category]);
  const skillScore = Math.min(skillMatches * 20, 100);

  // 2. Distance Scoring (30% weight)
  const distance = getDistance(
    problem.location?.lat,
    problem.location?.lng,
    user.location?.lat,
    user.location?.lng
  );
  const distanceScore = getDistanceScore(distance);

  // 3. Availability (20% weight)
  const availability = user.availability !== false ? 100 : 0;

  // Final Weighted Score with high-precision jitter for demo realism
  const jitter = (Math.random() * 4) - 2; // -2% to +2% jitter
  const finalScore = Math.max(5, Math.min(99.4, 
    (skillScore * 0.5) + (distanceScore * 0.3) + (availability * 0.2) + jitter
  ));

  let priority = "low";
  if (distance < 5) priority = "high";
  else if (distance < 20) priority = "medium";

  return {
    score: parseFloat(finalScore.toFixed(1)),
    distance: distance.toFixed(1),
    priority,
    skillMatches
  };
}

module.exports = { getDistance, matchSkills, calculateAIScore };
