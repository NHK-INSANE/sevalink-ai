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
// Custom Icons
const problemIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const helperIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ngoIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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
    <div style={{ height, width: "100%", position: "relative" }} className="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white">
      {/* Floating Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-xl space-y-2">
        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Live Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
          <span className="text-xs text-slate-600 font-medium font-inter">Crisis Reports</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
          <span className="text-xs text-slate-600 font-medium font-inter">Volunteers</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
          <span className="text-xs text-slate-600 font-medium font-inter">NGO Partners</span>
        </div>
      </div>

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
            <Marker key={`p-${p._id || i}`} position={[p.location.lat, p.location.lng]} icon={problemIcon}>
              <Popup>
                <div className="p-1 min-w-[200px] font-inter">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-slate-900">{p.title}</strong>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${
                      p.urgency?.toLowerCase() === 'critical' ? 'bg-red-500' : 
                      p.urgency?.toLowerCase() === 'high' ? 'bg-orange-500' : 
                      p.urgency?.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}>
                      {p.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-2">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-slate-400 italic">📂 {p.category}</div>
                    {p.status && <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">{p.status}</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 🟢 NGOs */}
        {(type === "all" || type === "ngo") &&
          ngos.filter(n => n.location?.lat && n.location?.lng).map((n, i) => (
            <Marker key={`n-${n._id || i}`} position={[n.location.lat, n.location.lng]} icon={ngoIcon}>
              <Popup>
                <div className="p-1 font-inter">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    🏢 {n.ngoName || n.name}
                  </div>
                  <div className="text-xs text-slate-500 mb-1">{n.ngoContact || n.email}</div>
                  <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block">NGO PARTNER</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 🔵 Helpers */}
        {(type === "all" || type === "helpers") &&
          helpers.filter(h => h.location?.lat && h.location?.lng).map((h, i) => (
            <Marker key={`h-${h._id || i}`} position={[h.location.lat, h.location.lng]} icon={helperIcon}>
              <Popup>
                <div className="p-1 font-inter">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    🤝 {h.name}
                  </div>
                  <div className="text-xs text-slate-600 font-medium border-t border-slate-50 mt-1 pt-1">
                    🛠 {h.skill || "General Support"}
                  </div>
                  <div className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full mt-2 inline-block">FIELD VOLUNTEER</div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
