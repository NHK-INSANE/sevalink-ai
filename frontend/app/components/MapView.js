"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet Icon Bug
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Inject keyframe animation once
if (typeof document !== "undefined") {
  if (!document.getElementById("seva-marker-style")) {
    const style = document.createElement("style");
    style.id = "seva-marker-style";
    style.textContent = `
      @keyframes sevaMarkerPulse {
        0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); transform: scale(1); }
        50%  { box-shadow: 0 0 0 8px rgba(239,68,68,0); transform: scale(1.3); }
        100% { box-shadow: 0 0 0 0 rgba(239,68,68,0);  transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
}

// ── Urgency Color Map ─────────────────────────────────────────────────────────
function getUrgencyColor(urgency) {
  switch (urgency?.toLowerCase()) {
    case "critical": return { bg: "#ef4444", glow: "rgba(239,68,68,0.5)" };
    case "high":     return { bg: "#f97316", glow: "rgba(249,115,22,0.5)" };
    case "medium":   return { bg: "#eab308", glow: "rgba(234,179,8,0.5)" };
    case "low":      return { bg: "#22c55e", glow: "rgba(34,197,94,0.5)" };
    default:         return { bg: "#3b82f6", glow: "rgba(59,130,246,0.5)" };
  }
}

// ── Pulse Icon Factory ────────────────────────────────────────────────────────
function makePulseIcon(color, glowColor) {
  return new L.DivIcon({
    className: "",
    html: `<div style="
      position: relative;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 0 0 ${glowColor};
        animation: sevaMarkerPulse 2s ease-in-out infinite;
      "></div>
    </div>`,
    iconSize:    [18, 18],
    iconAnchor:  [9, 9],
    popupAnchor: [0, -10],
  });
}

// Static icons for helpers/NGOs
const helperIcon = makePulseIcon("#2563eb", "rgba(37,99,235,0.5)");
const ngoIcon    = makePulseIcon("#16a34a", "rgba(22,163,74,0.5)");

// ── Zoom-to-User Sub-Component ───────────────────────────────────────────────
function ZoomToUser() {
  const map = useMap();
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView(
          [pos.coords.latitude, pos.coords.longitude],
          14,
          { animate: true, duration: 1.2 }
        );
      },
      () => {} // silently ignore denials
    );
  }, [map]);
  return null;
}

// ── Locate Me Button Sub-Component ───────────────────────────────────────────
function LocateMeButton() {
  const map = useMap();

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 14, { animate: true, duration: 1 });
      L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup("📍 You are here")
        .openPopup();
    });
  }

  return (
    <div
      style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}
    >
      <button
        onClick={locateMe}
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: "600",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          color: "#374151",
        }}
      >
        📍 Locate Me
      </button>
    </div>
  );
}

/**
 * MapView component — animated, real-time map for SevaLink
 * Map tiles always stay light; urgency markers are color-coded.
 */
export default function MapView({
  problems = [],
  ngos = [],
  helpers = [],
  type = "all",
  center = [22.57, 88.36],
  zoom = 5,
  height = "400px",
  zoomToUser = false,
}) {
  return (
    <div style={{ height, width: "100%", position: "relative" }} className="rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white">
      {/* Floating Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-gray-200 shadow-lg space-y-1.5">
        <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-2">Legend</div>

        {/* Urgency */}
        <div className="flex items-center gap-2">
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
          <span className="text-xs text-gray-600 font-medium">Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
          <span className="text-xs text-gray-600 font-medium">High</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308", display: "inline-block" }} />
          <span className="text-xs text-gray-600 font-medium">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          <span className="text-xs text-gray-600 font-medium">Low</span>
        </div>

        <div className="border-t border-gray-100 my-1" />

        {/* People */}
        <div className="flex items-center gap-2">
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb", display: "inline-block" }} />
          <span className="text-xs text-gray-600 font-medium">Volunteers</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
          <span className="text-xs text-gray-600 font-medium">NGOs</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        {/* Always use light OSM tiles — dark mode does NOT affect the map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zoomToUser && <ZoomToUser />}
        <LocateMeButton />

        <MarkerClusterGroup chunkedLoading>
          {/* 🔴 Problems — color by urgency */}
          {(type === "all" || type === "problems") &&
            problems.filter(p => p.location?.lat && p.location?.lng).map((p, i) => {
              const { bg, glow } = getUrgencyColor(p.urgency);
              const icon = makePulseIcon(bg, glow);
              return (
                <Marker key={`p-${p._id || i}`} position={[p.location.lat, p.location.lng]} icon={icon}>
                  <Popup>
                    <div className="p-2 min-w-[200px] font-inter">
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <strong className="text-gray-900 text-sm leading-tight">{p.title}</strong>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                          p.urgency?.toLowerCase() === "critical" ? "bg-red-100 text-red-600" :
                          p.urgency?.toLowerCase() === "high"     ? "bg-orange-100 text-orange-600" :
                          p.urgency?.toLowerCase() === "medium"   ? "bg-yellow-100 text-yellow-600" :
                                                                     "bg-green-100 text-green-600"
                        }`}>
                          {p.urgency}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{p.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-gray-400">📂 {p.category}</div>
                        {p.status && (
                          <div className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            p.status === "Open"        ? "bg-blue-50 text-blue-600" :
                            p.status === "In Progress" ? "bg-yellow-50 text-yellow-600" :
                                                         "bg-green-50 text-green-600"
                          }`}>{p.status}</div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* 🟢 NGOs */}
          {(type === "all" || type === "ngo") &&
            ngos.filter(n => n.location?.lat && n.location?.lng).map((n, i) => (
              <Marker key={`n-${n._id || i}`} position={[n.location.lat, n.location.lng]} icon={ngoIcon}>
                <Popup>
                  <div className="p-2 font-inter min-w-[160px]">
                    <div className="font-bold text-gray-900 text-sm mb-1">
                      🏢 {n.ngoName || n.name}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{n.ngoContact || n.email}</div>
                    <div className="text-[10px] text-green-700 font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded-full inline-block">NGO PARTNER</div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* 🔵 Helpers */}
          {(type === "all" || type === "helpers") &&
            helpers.filter(h => h.location?.lat && h.location?.lng).map((h, i) => (
              <Marker key={`h-${h._id || i}`} position={[h.location.lat, h.location.lng]} icon={helperIcon}>
                <Popup>
                  <div className="p-2 font-inter min-w-[170px]">
                    <div className="font-bold text-gray-900 text-sm mb-1 border-b border-gray-100 pb-1">
                      🤝 {h.name}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1 mt-1">
                      <div><span className="font-semibold text-gray-800">Skills:</span> {h.skill || (h.skills?.length > 0 ? h.skills.join(", ") : "General Support")}</div>
                      <div><span className="font-semibold text-gray-800">Status:</span> <span className="text-emerald-600 font-semibold">Available 🟢</span></div>
                      {h.bio && <div className="italic text-[10px] text-gray-400 mt-1">"{h.bio}"</div>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
