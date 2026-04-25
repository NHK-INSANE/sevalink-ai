/**
 * SEVALINK AI - SMART ROUTING ENGINE
 * Handles distance calculations and finding nearest responders.
 */

const User = require("../models/User");

/**
 * Haversine Formula for real-world distance calculation (in km)
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Finds the top nearest responders for a given location.
 */
async function findNearestResponders(location, type = "GENERAL") {
  try {
    // Find active responders (Volunteers, NGOs, Workers)
    const responders = await User.find({
      role: { $in: ["volunteer", "Volunteer", "worker", "Worker", "ngo", "NGO"] }
    });

    const scored = responders.map(user => {
      const uLat = user.location?.lat || user.latitude || 22.3;
      const uLng = user.location?.lng || user.longitude || 87.3;
      
      const distance = getDistance(
        location.lat,
        location.lng,
        uLat,
        uLng
      );

      return {
        _id: user._id,
        name: user.name,
        role: user.role,
        distance: parseFloat(distance.toFixed(2))
      };
    });

    // Sort by distance (nearest first)
    return scored.sort((a, b) => a.distance - b.distance);
  } catch (err) {
    console.error("Routing Engine Error:", err);
    return [];
  }
}

module.exports = {
  getDistance,
  findNearestResponders
};
