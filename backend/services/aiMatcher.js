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

const matchSkills = (userSkills = [], problemSubCats = []) => {
  if (!Array.isArray(userSkills)) userSkills = [userSkills];
  if (!Array.isArray(problemSubCats)) problemSubCats = [problemSubCats];

  const matched = userSkills.filter(skill =>
    problemSubCats.some(sub => sub.toLowerCase().includes(skill.toLowerCase()))
  ).length;

  return matched;
};

function calculateAIScore(user, problem) {
  let score = 0;

  // 1. Skill Match (20 points per matched sub-category)
  const skillMatches = matchSkills(user.skills, problem.subCategories || [problem.category]);
  score += skillMatches * 20;

  // 2. Distance Scoring
  const distance = getDistance(
    problem.location?.lat,
    problem.location?.lng,
    user.location?.lat,
    user.location?.lng
  );

  if (distance < 10) score += 30;
  else if (distance < 50) score += 10;

  // 3. Availability Bonus
  if (user.availability !== false) score += 20;

  // Final priority based on distance
  let priority = "low";
  if (distance < 5) priority = "high";
  else if (distance < 20) priority = "medium";

  return {
    score: Math.min(score, 100),
    distance: distance.toFixed(2),
    priority
  };
}

module.exports = { getDistance, matchSkills, calculateAIScore };
