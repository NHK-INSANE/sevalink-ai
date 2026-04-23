"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { HeatmapLayer } from "react-leaflet-heatmap-layer-v3";
import { useEffect } from "react";
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
      @keyframes sosPulse {
        0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.8); transform: scale(1); }
        50%  { box-shadow: 0 0 0 16px rgba(239,68,68,0); transform: scale(1.5); }
        100% { box-shadow: 0 0 0 0 rgba(239,68,68,0);   transform: scale(1); }
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
function makePulseIcon(color, glowColor, size = 12) {
  return new L.DivIcon({
    className: "",
    html: `<div style="
      position: relative;
      width: ${size + 6}px;
      height: ${size + 6}px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 0 0 ${glowColor};
        animation: sevaMarkerPulse 2s ease-in-out infinite;
      "></div>
    </div>`,
    iconSize:    [size + 6, size + 6],
    iconAnchor:  [(size + 6) / 2, (size + 6) / 2],
    popupAnchor: [0, -12],
  });
}

// SOS Icon — bigger + faster pulse
const sosIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
  ">
    <div style="
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #dc2626;
      border: 3px solid #fff;
      box-shadow: 0 0 0 0 rgba(220,38,38,0.8);
      animation: sosPulse 1s ease-in-out infinite;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: white; font-weight: 900;
    ">!</div>
  </div>`,
  iconSize:    [28, 28],
  iconAnchor:  [14, 14],
  popupAnchor: [0, -14],
});

const helperIcon = makePulseIcon("#2563eb", "rgba(37,99,235,0.5)");
const ngoIcon    = makePulseIcon("#16a34a", "rgba(22,163,74,0.5)");

// ── Zoom-to-User Sub-Component ───────────────────────────────────────────────
function ZoomToUser() {
  const map = useMap();
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("lat") && params.get("lng")) return; // skip if focusing on problem
    }

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo(
          [pos.coords.latitude, pos.coords.longitude],
          13,
          { duration: 1.5, easeLinearity: 0.25 }
        );
      },
      () => {}
    );
  }, [map]);
  return null;
}

// ── Auto-Focus Problem ───────────────────────────────────────────────────────
function FocusProblem() {
  const map = useMap();
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const lat = params.get("lat");
      const lng = params.get("lng");
      const title = params.get("title");
      if (lat && lng) {
        const target = [parseFloat(lat), parseFloat(lng)];
        map.flyTo(target, 15, { duration: 1.5 });
        if (title) {
          setTimeout(() => {
            L.popup({ closeButton: true })
              .setLatLng(target)
              .setContent(`<div style="font-weight:bold;font-size:13px;padding:4px;">📍 ${title}</div>`)
              .openOn(map);
          }, 1500);
        }
      }
    }
  }, [map]);
  return null;
}

// ── Locate Me Button ─────────────────────────────────────────────────────────
function LocateMeButton() {
  const map = useMap();
  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      map.flyTo([latitude, longitude], 14, { duration: 1.5 });
      L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup("📍 You are here")
        .openPopup();
    });
  }
  return (
    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}>
      <button
        onClick={locateMe}
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "6px 14px",
          fontSize: "12px",
          fontWeight: "600",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
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
 * MapView — urgency-colored markers, SOS markers, live-count legend,
 * Locate Me button. Tiles always stay OSM light (unaffected by dark mode).
 */
export default function MapView({
  problems = [],
  ngos = [],
  helpers = [],
  sosMarkers = [],   // [{latitude, longitude, message, senderName, time}]
  type = "all",
  center = [22.57, 88.36],
  zoom = 5,
  height = "400px",
  zoomToUser = false,
  showHeatmap = false,
}) {
  // Live counts for legend
  const counts = {
    critical: problems.filter(p => p.urgency?.toLowerCase() === "critical").length,
    high:     problems.filter(p => p.urgency?.toLowerCase() === "high").length,
    medium:   problems.filter(p => p.urgency?.toLowerCase() === "medium").length,
    low:      problems.filter(p => p.urgency?.toLowerCase() === "low").length,
    volunteers: helpers.length,
    ngos:     ngos.length,
    sos:      sosMarkers.length,
  };

  const LegendRow = ({ color, label, count }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
      <span style={{
        width: 10, height: 10, borderRadius: "50%",
        background: color, display: "inline-block", flexShrink: 0
      }} />
      <span style={{ fontSize: "11px", color: "#4b5563", fontWeight: 500, flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{
          fontSize: "10px", fontWeight: "700", color: "#6b7280",
          background: "#f3f4f6", borderRadius: "8px", padding: "1px 6px"
        }}>{count}</span>
      )}
    </div>
  );

  return (
    <div style={{ height, width: "100%", position: "relative" }}
      className="rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white">

      {/* ── Floating Legend with live counts ── */}
      <div style={{
        position: "absolute", top: 80, left: 16, zIndex: 1000,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
        padding: "14px 16px",
        borderRadius: "14px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        minWidth: "150px",
      }}>
        <div style={{ fontSize: "9px", fontWeight: "700", color: "#9ca3af", letterSpacing: "0.1em", marginBottom: "10px", textTransform: "uppercase" }}>
          Live Legend
        </div>

        {counts.sos > 0 && (
          <>
            <LegendRow color="#dc2626" label="🚨 SOS Active" count={counts.sos} />
            <div style={{ borderTop: "1px solid #f3f4f6", margin: "6px 0" }} />
          </>
        )}

        <LegendRow color="#ef4444" label="Critical"   count={counts.critical} />
        <LegendRow color="#f97316" label="High"       count={counts.high} />
        <LegendRow color="#eab308" label="Medium"     count={counts.medium} />
        <LegendRow color="#22c55e" label="Low"        count={counts.low} />

        <div style={{ borderTop: "1px solid #f3f4f6", margin: "6px 0" }} />

        <LegendRow color="#2563eb" label="Volunteers" count={counts.volunteers} />
        <LegendRow color="#16a34a" label="NGOs"       count={counts.ngos} />
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        {/* Always light OSM tiles — dark mode does NOT affect map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zoomToUser && <ZoomToUser />}
        <FocusProblem />
        <LocateMeButton />

        {/* 🔥 Crisis Heatmap Layer */}
        {showHeatmap && (
          <HeatmapLayer
            points={problems.filter(p => p.location?.lat && p.location?.lng)}
            longitudeExtractor={(p) => p.location.lng}
            latitudeExtractor={(p) => p.location.lat}
            intensityExtractor={(p) => {
              const u = p.urgency?.toLowerCase();
              if (u === "critical") return 1.0;
              if (u === "high") return 0.7;
              if (u === "medium") return 0.4;
              return 0.2;
            }}
            radius={25}
            blur={15}
            max={1.0}
          />
        )}

        <MarkerClusterGroup chunkedLoading>

          {/* 🚨 SOS Markers */}
          {sosMarkers.map((s, i) => (
            s.latitude && s.longitude ? (
              <Marker key={`sos-${i}`} position={[s.latitude, s.longitude]} icon={sosIcon}>
                <Popup>
                  <div style={{ minWidth: 180, fontFamily: "system-ui, sans-serif" }}>
                    <div style={{ color: "#dc2626", fontWeight: "700", fontSize: "13px", marginBottom: 4 }}>
                      🚨 SOS EMERGENCY
                    </div>
                    <div style={{ fontSize: "12px", color: "#374151", marginBottom: 4 }}>
                      {s.message}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>
                      From: {s.senderName || "Anonymous"} · {s.time ? new Date(s.time).toLocaleTimeString() : ""}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}

          {/* 🔴 Problems — color by urgency */}
          {(type === "all" || type === "problems") &&
            problems.filter(p => p.location?.lat && p.location?.lng).slice(0, 100).map((p, i) => {
              const { bg, glow } = getUrgencyColor(p.urgency);
              const icon = makePulseIcon(bg, glow);
              return (
                <Marker key={`p-${p._id || i}`} position={[p.location.lat, p.location.lng]} icon={icon}>
                  <Popup>
                    <div style={{ minWidth: 200, fontFamily: "system-ui, sans-serif" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <strong style={{ fontSize: "13px", color: "#111827", lineHeight: 1.3 }}>{p.title}</strong>
                        <span style={{
                          fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: 4, marginLeft: 6, flexShrink: 0,
                          background: p.urgency?.toLowerCase() === "critical" ? "#fee2e2" : p.urgency?.toLowerCase() === "high" ? "#ffedd5" : p.urgency?.toLowerCase() === "medium" ? "#fef9c3" : "#dcfce7",
                          color: p.urgency?.toLowerCase() === "critical" ? "#dc2626" : p.urgency?.toLowerCase() === "high" ? "#ea580c" : p.urgency?.toLowerCase() === "medium" ? "#ca8a04" : "#16a34a",
                        }}>{p.urgency}</span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "#9ca3af" }}>📂 {p.category}</span>
                        {p.status && (
                          <span style={{
                            fontSize: "10px", fontWeight: "700", padding: "1px 6px", borderRadius: 4,
                            background: p.status === "Open" ? "#eff6ff" : p.status === "In Progress" ? "#fefce8" : "#f0fdf4",
                            color: p.status === "Open" ? "#2563eb" : p.status === "In Progress" ? "#ca8a04" : "#16a34a",
                          }}>{p.status}</span>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* 🟢 NGOs */}
          {(type === "all" || type === "ngo") &&
            ngos.filter(n => n.location?.lat && n.location?.lng).slice(0, 50).map((n, i) => (
              <Marker key={`n-${n._id || i}`} position={[n.location.lat, n.location.lng]} icon={ngoIcon}>
                <Popup>
                  <div style={{ minWidth: 160, fontFamily: "system-ui, sans-serif" }}>
                    <div style={{ fontWeight: "700", fontSize: "13px", color: "#111827", marginBottom: 4 }}>
                      🏢 {n.ngoName || n.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: 6 }}>{n.ngoContact || n.email}</div>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "20px" }}>NGO PARTNER</span>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* 🔵 Helpers */}
          {(type === "all" || type === "helpers") &&
            helpers.filter(h => h.location?.lat && h.location?.lng).slice(0, 100).map((h, i) => (
              <Marker key={`h-${h._id || i}`} position={[h.location.lat, h.location.lng]} icon={helperIcon}>
                <Popup>
                  <div style={{ minWidth: 170, fontFamily: "system-ui, sans-serif" }}>
                    <div style={{ fontWeight: "700", fontSize: "13px", color: "#111827", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid #f3f4f6" }}>
                      🤝 {h.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#4b5563" }}>
                      <div style={{ marginBottom: 2 }}><strong>Skills:</strong> {h.skill || (h.skills?.length > 0 ? h.skills.join(", ") : "General Support")}</div>
                      <div><strong>Status:</strong> <span style={{ color: "#16a34a", fontWeight: 600 }}>Available 🟢</span></div>
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
