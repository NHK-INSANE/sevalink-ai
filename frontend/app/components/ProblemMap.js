"use client";
import MapLibreView from "./MapLibreView";

/**
 * ProblemMap component - shows problems on a map for the landing page
 * 
 * @param {Array} problems - Array of problem objects
 */
export default function ProblemMap({ problems = [] }) {
  const markers = problems
    .filter(p => p.location?.lat && p.location?.lng)
    .map(p => ({
      lat: p.location.lat,
      lng: p.location.lng,
      id: p._id || Math.random().toString(),
      color: p.urgency === 'Critical' ? '#ef4444' : 
             p.urgency === 'High' ? '#f97316' : 
             p.urgency === 'Medium' ? '#eab308' : '#22c55e',
      popupContent: (
        <div className="p-1">
          <h3 className="font-bold text-slate-800">{p.title}</h3>
          <p className="text-sm text-slate-600 line-clamp-2">{p.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              p.urgency === 'Critical' ? 'bg-red-100 text-red-600 border border-red-200' :
              p.urgency === 'High' ? 'bg-orange-100 text-orange-600 border border-orange-200' :
              p.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-600 border border-yellow-200' :
              'bg-green-100 text-green-600 border border-green-200'
            }`}>
              {p.urgency}
            </span>
            <span className="text-[10px] text-slate-400 capitalize bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              {p.status}
            </span>
          </div>
        </div>
      )
    }));

  return (
    <div className="w-full">
      <MapLibreView
        height="450px"
        markers={markers}
        center={markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 22.3, lng: 87.3 }}
        zoom={markers.length > 0 ? 11 : 9}
      />
    </div>
  );
}
