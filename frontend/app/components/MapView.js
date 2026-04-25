"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import HeatmapLayer from "./HeatmapLayer";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet Icon Bug
// Default Leaflet icon override to prevent image loads
L.Icon.Default.mergeOptions({
  iconRetinaUrl: null,
  iconUrl: null,
  shadowUrl: null,
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
    ">SOS</div>
  </div>`,
  iconSize:    [28, 28],
  iconAnchor:  [14, 14],
  popupAnchor: [0, -14],
});

const helperIcon = makePulseIcon("#2563eb", "rgba(37,99,235,0.5)");
const ngoIcon    = makePulseIcon("#3b82f6", "rgba(59,130,246,0.5)"); // blue

// ── Live Tracking (Uber-style) ────────────────────────────────────────────────
function LiveTracking() {
  const map = useMap();
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("lat") && params.get("lng")) return; // skip if focusing on problem
    }

    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        map.flyTo([latitude, longitude], 14, {
          animate: true,
          duration: 1.5,
        });
      },
      (err) => console.log("Geolocation error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map]);

  if (!userLocation) return null;

  return (
    <Marker position={userLocation} icon={makePulseIcon("#3b82f6", "rgba(59,130,246,0.7)", 14)}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

// ── Locate Me Hook ───────────────────────────────────────────────────────────
function LocateMeHandler() {
  const map = useMap();
  useEffect(() => {
    const handleLocate = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 14, { duration: 1.5 });
      });
    };
    window.addEventListener("map-locate-me", handleLocate);
    return () => window.removeEventListener("map-locate-me", handleLocate);
  }, [map]);
  return null;
}

// ── Focus Problem ───────────────────────────────────────────────────────
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
              .setContent(`<div style="font-weight:bold;font-size:13px;padding:4px;">${title}</div>`)
              .openOn(map);
          }, 1500);
        }
      }
    }
  }, [map]);
  return null;
}

// ── Zoom Listener ───────────────────────────────────────────────────────────
function MapZoomListener({ setShowClusters, onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    const handleZoom = () => {
      const z = map.getZoom();
      setShowClusters(z >= 8);
      if (onZoomChange) onZoomChange(z);
    };
    handleZoom();
    map.on("zoomend", handleZoom);
    return () => map.off("zoomend", handleZoom);
  }, [map, setShowClusters, onZoomChange]);
  return null;
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
  onZoomChange,
}) {
  const [showClusters, setShowClusters] = useState(true);

  return (
    <div style={{ height, width: "100%", position: "relative" }}
      className="rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white">

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        {/* Always light OSM tiles — dark mode does NOT affect map */}
        <TileLayer
          attribution=""
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zoomToUser && <LiveTracking />}
        <FocusProblem />
        <LocateMeHandler />
        <MapZoomListener setShowClusters={setShowClusters} onZoomChange={onZoomChange} />

        {/* 🔥 Custom Crisis Heatmap Layer */}
        {showHeatmap && (
          <HeatmapLayer 
            points={problems
              .filter(p => p.location?.lat && p.location?.lng)
              .map(p => ({
                lat: p.location.lat,
                lng: p.location.lng,
                urgency: p.urgency
              }))
            } 
          />
        )}

        <MarkerClusterGroup 
          key={showClusters ? "numbers" : "dots"}
          chunkedLoading
          iconCreateFunction={(cluster) => {
            if (!showClusters) {
              return new L.DivIcon({
                html: `<div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
                className: "",
                iconSize: L.point(12, 12)
              });
            }
            return new L.DivIcon({
              html: `<div style="background: rgba(99,102,241,0.9); color: white; border-radius: 12px; width: 32px; height: 32px; display: flex; items-center; justify-center; font-size: 10px; font-weight: 900; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(4px);">${cluster.getChildCount()}</div>`,
              className: "",
              iconSize: L.point(32, 32)
            });
          }}
        >

          {/* 🚨 SOS Markers */}
          {sosMarkers.map((s, i) => (
            s.latitude && s.longitude ? (
              <Marker key={`sos-${i}`} position={[s.latitude, s.longitude]} icon={sosIcon}>
                <Popup>
                  <div style={{ minWidth: 180, fontFamily: "system-ui, sans-serif" }}>
                    <div style={{ color: "#dc2626", fontWeight: "700", fontSize: "13px", marginBottom: 4 }}>
                      SOS EMERGENCY
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
            problems.filter(p => (p.location?.lat && p.location?.lng) || (p.latitude && p.longitude)).slice(0, 100).map((p, i) => {
              const { bg, glow } = getUrgencyColor(p.urgency);
              const icon = makePulseIcon(bg, glow);
              const lat = p.location?.lat || p.latitude;
              const lng = p.location?.lng || p.longitude;
              return (
                <Marker key={`p-${p._id || i}`} position={[lat, lng]} icon={icon}>
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
                        <span style={{ fontSize: "10px", color: "#9ca3af" }}>{Array.isArray(p.category) ? p.category.join(", ") : (p.category || "General")}</span>
                        {p.status && (
                          <span style={{
                            fontSize: "10px", fontWeight: "700", padding: "1px 6px", borderRadius: 4,
                            background: String(p.status).toLowerCase() === "open" ? "#eff6ff" : String(p.status).toLowerCase() === "in progress" ? "#fefce8" : "#f0fdf4",
                            color: String(p.status).toLowerCase() === "open" ? "#2563eb" : String(p.status).toLowerCase() === "in progress" ? "#ca8a04" : "#16a34a",
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
            ngos.filter(n => (n.location?.lat && n.location?.lng) || (n.latitude && n.longitude)).slice(0, 50).map((n, i) => {
              const lat = n.location?.lat || n.latitude;
              const lng = n.location?.lng || n.longitude;
              return (
                <Marker key={`n-${n._id || i}`} position={[lat, lng]} icon={ngoIcon}>
                <Popup>
                  <div style={{ minWidth: 160, fontFamily: "system-ui, sans-serif" }}>
                    <div style={{ fontWeight: "700", fontSize: "13px", color: "#111827", marginBottom: 4 }}>
                      {n.ngoName || n.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: 6 }}>{n.ngoContact || n.email}</div>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "20px" }}>NGO PARTNER</span>
                  </div>
                </Popup>
                </Marker>
              );
            })}

        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
