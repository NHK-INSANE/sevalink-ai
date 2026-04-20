"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet Icon Bug (Step 3)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

/**
 * MapView component - main global map for SevaLink (Leaflet Implementation)
 */
export default function MapView({
  problems = [],
  ngos = [],
  helpers = [],
  type = "all",
  center = [22.57, 88.36],
  zoom = 5,
  height = "400px"
}) {
  return (
    <div style={{ height, width: "100%" }} className="rounded-xl overflow-hidden shadow-2xl border border-white/5">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🔴 Problems */}
        {(type === "all" || type === "problems") &&
          problems.filter(p => p.location?.lat && p.location?.lng).map((p, i) => (
            <Marker key={`p-${i}`} position={[p.location.lat, p.location.lng]}>
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-slate-900">{p.title}</strong>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${
                      p.urgency === 'Critical' ? 'bg-red-500' : 
                      p.urgency === 'High' ? 'bg-orange-500' : 
                      p.urgency === 'Medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}>
                      {p.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-2">{p.description}</p>
                  <div className="text-[10px] text-slate-400 italic">Category: {p.category}</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 🟢 NGOs */}
        {(type === "all" || type === "ngo") &&
          ngos.filter(n => n.location?.lat && n.location?.lng).map((n, i) => (
            <Marker key={`n-${i}`} position={[n.location.lat, n.location.lng]}>
              <Popup>
                <div className="p-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    🏢 {n.name}
                  </div>
                  <div className="text-xs text-slate-500 mb-1">{n.ngoContact || n.email}</div>
                  <div className="text-[10px] text-indigo-600 font-medium">Verified NGO Partner</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 🔵 Helpers */}
        {(type === "all" || type === "helpers") &&
          helpers.filter(h => h.location?.lat && h.location?.lng).map((h, i) => (
            <Marker key={`h-${i}`} position={[h.location.lat, h.location.lng]}>
              <Popup>
                <div className="p-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    🤝 {h.name}
                  </div>
                  <div className="text-xs text-slate-500">{h.skill || "Volunteer Helper"}</div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-1">Available to assist</div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
