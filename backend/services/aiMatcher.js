const haversine = (loc1, loc2) => {
  if (!loc1 || !loc2 || !loc1.lat || !loc1.lng || !loc2.lat || !loc2.lng) return 9999;
  const R = 6371e3; // meters
  const φ1 = loc1.lat * Math.PI/180;
  const φ2 = loc2.lat * Math.PI/180;
  const Δφ = (loc2.lat-loc1.lat) * Math.PI/180;
  const Δλ = (loc2.lng-loc1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return (R * c) / 1000; // km
};

function matchVolunteers(problem, volunteers) {
  const reqSkills = Array.isArray(problem.requiredSkills) ? problem.requiredSkills : [];
  
  return volunteers
    .map(v => {
      const vSkills = Array.isArray(v.skills) ? v.skills : [];
      const matchSkills = reqSkills.filter(skill =>
        vSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
      );

      const skillScore = matchSkills.length;
      const distance = haversine(problem.location, v.location);

      // Score: higher is better. Each skill match is worth 10km of distance.
      return {
        _id: v._id,
        name: v.name,
        email: v.email,
        score: (skillScore * 10) - distance
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Pick top 5
}

module.exports = { matchVolunteers, haversine };
