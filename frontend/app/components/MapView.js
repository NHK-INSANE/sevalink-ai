"use client";
import MapLibreView from "./MapLibreView";

/**
 * MapView component - main global map for SevaLink
 * 
 * @param {Array} problems - Array of problem objects
 * @param {Array} ngos - Array of NGO objects
 * @param {Array} helpers - Array of helper objects
 * @param {String} type - "problems" | "ngo" | "helpers" | "all"
 * @param {Object} userLocation - { lat, lng }
 * @param {Array} center - [lat, lng]
 * @param {Function} onSelect - Callback when marker selected
 * @param {Boolean} pickMode - If true, allow clicking to pick location
 * @param {Object} pickedLocation - { lat, lng }
 * @param {Function} setPickedLocation - Callback to update picked location
 */
export default function MapView({
  problems = [],
  ngos = [],
  helpers = [],
  type = "problems",
  userLocation = null,
  center = [22.3, 87.3],
  onSelect = null,
  pickMode = false,
  pickedLocation = null,
  setPickedLocation = null,
}) {
  const markerList = [];

  // 1. ADD USER LOCATION
  if (userLocation) {
    markerList.push({
      lat: userLocation.lat || userLocation[0],
      lng: userLocation.lng || userLocation[1],
      id: "user-loc",
      color: "#8b5cf6", // Purple
      popupContent: <strong>📍 You are here</strong>
    });
  }

  // 2. ADD PICKED LOCATION (IF IN PICK MODE)
  if (pickMode && pickedLocation) {
    markerList.push({
      lat: pickedLocation.lat || pickedLocation[0],
      lng: pickedLocation.lng || pickedLocation[1],
      id: "picked-loc",
      color: "#8b5cf6",
      popupContent: <strong>📍 Selected location</strong>
    });
  }

  // 3. ADD PROBLEMS
  if (type === "problems" || type === "all") {
    problems.filter(p => p.location?.lat && p.location?.lng).forEach((p, i) => {
      markerList.push({
        lat: p.location.lat,
        lng: p.location.lng,
        id: `p-${p._id || i}`,
        color: p.urgency === 'Critical' ? '#ef4444' : 
               p.urgency === 'High' ? '#f97316' : 
               p.urgency === 'Medium' ? '#eab308' : '#22c55e',
        popupContent: (
          <div className="p-1">
            <strong className="text-slate-900">{p.title}</strong>
            <div className="text-[10px] text-slate-500 mb-1">Urgency: <b className="text-slate-700">{p.urgency}</b></div>
            <p className="text-xs text-slate-600 line-clamp-3">{p.description}</p>
            {onSelect && (
              <button 
                onClick={() => onSelect(p)}
                className="mt-2 w-full text-[10px] py-1 bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors"
                type="button"
              >
                View Details
              </button>
            )}
          </div>
        )
      });
    });
  }

  // 4. ADD NGOs
  if (type === "ngo" || type === "all") {
    ngos.filter(n => n.location?.lat && n.location?.lng).forEach((n, i) => {
      markerList.push({
        lat: n.location.lat,
        lng: n.location.lng,
        id: `n-${n._id || i}`,
        color: "#10b981", // Emerald
        popupContent: (
          <div className="p-1">
            <strong className="text-slate-900">🏢 {n.name}</strong>
            <p className="text-[10px] text-slate-500">{n.email}</p>
          </div>
        )
      });
    });
  }

  // 5. ADD HELPERS
  if (type === "helpers" || type === "all") {
    helpers.filter(h => h.location?.lat && h.location?.lng).forEach((h, i) => {
      markerList.push({
        lat: h.location.lat,
        lng: h.location.lng,
        id: `h-${h._id || i}`,
        color: "#3b82f6", // Blue
        popupContent: (
          <div className="p-1">
            <strong className="text-slate-900">🤝 {h.name}</strong>
            <p className="text-[10px] text-slate-500">{h.role} — {h.skill}</p>
          </div>
        )
      });
    });
  }

  const handleMapClick = (coords) => {
    if (pickMode && setPickedLocation) {
      setPickedLocation(coords);
    }
  };

  const centerObj = Array.isArray(center) 
    ? { lat: center[0], lng: center[1] } 
    : (center || { lat: 22.3, lng: 87.3 });

  return (
    <div className="h-full w-full">
      <MapLibreView
        height="100%"
        markers={markerList}
        center={centerObj}
        zoom={10}
        onMapClick={handleMapClick}
      />
    </div>
  );
}
