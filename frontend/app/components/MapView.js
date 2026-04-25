"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import HeatmapLayer from "./HeatmapLayer";
import { useEffect, useState, useRef } from "react";
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
      .custom-cluster {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 15px rgba(0,0,0,0.4);
        transition: all 0.3s ease;
      }
      .cluster-wrapper {
        background: transparent !important;
        border: none !important;
        display: flex !important;
        align-items: center;
        justify-content: center;
      }
      @keyframes markerPulseHighlight {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      .pulse-marker {
        width: 20px;
        height: 20px;
        background: #ef4444;
        border-radius: 50%;
        border: 3px solid white;
        position: relative;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      }
      .pulse-marker::after {
        content: "";
        position: absolute;
        width: 40px;
        height: 40px;
        background: rgba(239, 68, 68, 0.4);
        border-radius: 50%;
        top: -13px;
        left: -13px;
        animation: markerPulseHighlight 1.5s infinite;
      }
      .blue-pulse-marker {
        width: 18px;
        height: 18px;
        background: #3b82f6;
        border-radius: 50%;
        border: 3px solid white;
        position: relative;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      }
      .blue-pulse-marker::after {
        content: "";
        position: absolute;
        width: 36px;
        height: 36px;
        background: rgba(59, 130, 246, 0.4);
        border-radius: 50%;
        top: -12px;
        left: -12px;
        animation: markerPulseHighlight 1.5s infinite;
      }
      .highlight-wrapper {
        background: transparent !important;
        border: none !important;
      }
      .map-popup-card {
        padding: 5px;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .map-popup-title {
        font-weight: 800;
        font-size: 14px;
        color: #111827;
        margin-bottom: 8px;
        display: block;
      }
      .map-coords-row {
        background: #f1f5f9;
        padding: 8px;
        border-radius: 8px;
        margin-bottom: 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #475569;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .map-action-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .map-copy-btn {
        background: #1e293b;
        color: white;
        border: none;
        padding: 6px 4px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .map-copy-btn:hover {
        background: #6366f1;
        transform: translateY(-1px);
      }
      .map-copy-btn:active {
        transform: translateY(0);
      }
      .map-copy-btn.full {
        grid-column: span 2;
        background: #4f46e5;
      }
    `;
    document.head.appendChild(style);
  }
}

// ── Urgency Color Map ─────────────────────────────────────────────────────────
function getUrgencyColor(urgency) {
  switch (String(urgency || "").toLowerCase()) {
    case "critical": return { bg: "#ef4444", glow: "rgba(239,68,68,0.5)" };
    case "high":     return { bg: "#f97316", glow: "rgba(249,115,22,0.5)" };
    case "medium":   return { bg: "#eab308", glow: "rgba(234,179,8,0.5)" };
    case "low":      return { bg: "#22c55e", glow: "rgba(34,197,94,0.5)" };
    default:         return { bg: "#3b82f6", glow: "rgba(59,130,246,0.5)" };
  }
}

// ── Pulse Icon Factory ────────────────────────────────────────────────────────
function makePulseIcon(color, glowColor, size = 12, type = "normal") {
  return new L.DivIcon({
    type,
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

const helperIcon = makePulseIcon("#2563eb", "rgba(37,99,235,0.5)", 12, "helper");
const ngoIcon    = makePulseIcon("#3b82f6", "rgba(59,130,246,0.5)", 12, "ngo"); // blue

// ── User Marker Toggle Hook ──────────────────────────────────────────────────
function UserMarkerToggle() {
  const map = useMap();
  const [userLocation, setUserLocation] = useState(null);
  const markerRef = useRef(null);

  const userPinIcon = L.divIcon({
    className: "",
    html: `<div style="
      width: 24px; height: 24px;
      background: #9333ea;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: -2px 2px 5px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

  useEffect(() => {
    const handleToggle = (e) => {
      const { show } = e.detail;
      if (!show) {
        setUserLocation(null);
        return;
      }

      if (!navigator.geolocation) {
        toast.error("Geolocation not supported");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latlng = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(latlng);
          map.flyTo(latlng, 14, { duration: 1.5 });
        },
        () => {
          toast.error("Location permission denied");
          window.dispatchEvent(new CustomEvent("map-user-denied"));
        }
      );
    };

    window.addEventListener("map-toggle-user", handleToggle);
    return () => window.removeEventListener("map-toggle-user", handleToggle);
  }, [map]);

  if (!userLocation) return null;

  return (
    <Marker position={userLocation} icon={userPinIcon}>
      <Popup>You are here 📍</Popup>
    </Marker>
  );
}

// ── Focus Problem/NGO ───────────────────────────────────────────────────────
function FocusProblem() {
  const map = useMap();
  const [highlighted, setHighlighted] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const lat = params.get("lat");
      const lng = params.get("lng");
      const title = params.get("title");
      const id = params.get("problemId");
      const ngoId = params.get("ngoId");

      if (lat && lng) {
        const target = [parseFloat(lat), parseFloat(lng)];
        map.flyTo(target, 15, { duration: 1.5 });
        
        if (id || ngoId) {
          setHighlighted({ 
            pos: target, 
            title: title ? decodeURIComponent(title) : (ngoId ? "NGO Partner" : "Selected Crisis"),
            isNgo: !!ngoId
          });
        } else if (title) {
          setTimeout(() => {
            L.popup({ closeButton: true })
              .setLatLng(target)
              .setContent(`<div style="font-weight:bold;font-size:13px;padding:4px;">${decodeURIComponent(title)}</div>`)
              .openOn(map);
          }, 1500);
        }
      }
    }
  }, [map]);

  if (!highlighted) return null;

  const pulseClass = highlighted.isNgo ? "blue-pulse-marker" : "pulse-marker";

  const highlightIcon = L.divIcon({
    html: `<div class="${pulseClass}"></div>`,
    className: "highlight-wrapper",
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <Marker position={highlighted.pos} icon={highlightIcon}>
      <Popup>
        <div style={{ fontWeight: "bold", padding: "2px" }}>{highlighted.title}</div>
      </Popup>
    </Marker>
  );
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
  problems,
  ngos,
  helpers,
  sosMarkers,
  type = "all",
  height = "400px",
  zoom = 6,
  zoomToUser = true,
  showHeatmap = false,
  heatmapData = [],
  onZoomChange
}) {
  const [showClusters, setShowClusters] = useState(true);

  // Safety checks
  const safeProblems = Array.isArray(problems) ? problems : [];
  const safeNgos = Array.isArray(ngos) ? ngos : [];
  const safeHelpers = Array.isArray(helpers) ? helpers : [];
  const safeSosMarkers = Array.isArray(sosMarkers) ? sosMarkers : [];

  if (!problems && !ngos && !helpers && !sosMarkers) return null;

  const copyToClipboard = (text) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      toast.success("Coordinates Copied!", {
        style: { borderRadius: '10px', background: '#1e293b', color: '#fff', fontSize: '12px' }
      });
    }
  };

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

        {zoomToUser && <UserMarkerToggle />}
        <FocusProblem />
        <MapZoomListener setShowClusters={setShowClusters} onZoomChange={onZoomChange} />

        {/* 🔥 Custom Crisis Heatmap Layer */}
        {showHeatmap && (
          <HeatmapLayer 
            points={heatmapData.length > 0 
              ? heatmapData 
              : safeProblems
                .filter(p => p.location?.lat && p.location?.lng)
                .map(p => ({
                  lat: p.location.lat,
                  lng: p.location.lng,
                  intensity: p.urgency?.toLowerCase() === "critical" ? 1.0 : 0.6
                }))
            } 
          />
        )}

        <MarkerClusterGroup 
          chunkedLoading
          maxClusterRadius={40}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={15}
          iconCreateFunction={(cluster) => {
            return L.divIcon({
              html: `<div class="cluster-dot" style="background: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>`,
              className: "cluster-wrapper",
              iconSize: L.point(20, 20)
            });
          }}
        >

          {/* 🚨 SOS Markers */}
          {safeSosMarkers.map((s, i) => (
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
            safeProblems.filter(p => (p.location?.lat && p.location?.lng) || (p.latitude && p.longitude)).slice(0, 100).map((p, i) => {
              const { bg, glow } = getUrgencyColor(p.urgency);
              const icon = makePulseIcon(bg, glow, 12, String(p.urgency || "").toLowerCase() || "normal");
              const lat = p.location?.lat || p.latitude;
              const lng = p.location?.lng || p.longitude;
              return (
                <Marker key={`p-${p._id || i}`} position={[lat, lng]} icon={icon}>
                  <Popup minWidth={220}>
                    <div className="map-popup-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <strong className="map-popup-title">{p.title}</strong>
                        <span style={{
                          fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: 4, marginLeft: 6, flexShrink: 0,
                          background: String(p.urgency || "").toLowerCase() === "critical" ? "#fee2e2" : String(p.urgency || "").toLowerCase() === "high" ? "#ffedd5" : String(p.urgency || "").toLowerCase() === "medium" ? "#fef9c3" : "#dcfce7",
                          color: String(p.urgency || "").toLowerCase() === "critical" ? "#dc2626" : String(p.urgency || "").toLowerCase() === "high" ? "#ea580c" : String(p.urgency || "").toLowerCase() === "medium" ? "#ca8a04" : "#16a34a",
                        }}>{p.urgency}</span>
                      </div>
                      
                      <div className="map-coords-row">
                        <div>LAT: {lat.toFixed(6)}</div>
                        <div>LNG: {lng.toFixed(6)}</div>
                      </div>

                      <div className="map-action-grid">
                        <button className="map-copy-btn" onClick={() => copyToClipboard(lat.toFixed(6))}>Copy Lat</button>
                        <button className="map-copy-btn" onClick={() => copyToClipboard(lng.toFixed(6))}>Copy Lng</button>
                        <button className="map-copy-btn full" onClick={() => copyToClipboard(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)}>Copy Full Location</button>
                      </div>

                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "#9ca3af" }}>{Array.isArray(p.category) ? p.category.join(", ") : (p.category || "General")}</span>
                        {p.status && (
                          <span style={{
                            fontSize: "10px", fontWeight: "700", padding: "1px 6px", borderRadius: 4,
                            background: String(p.status || "").toLowerCase() === "open" ? "#eff6ff" : String(p.status || "").toLowerCase() === "in progress" ? "#fefce8" : "#f0fdf4",
                            color: String(p.status || "").toLowerCase() === "open" ? "#2563eb" : String(p.status || "").toLowerCase() === "in progress" ? "#ca8a04" : "#16a34a",
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
            safeNgos.filter(n => (n.location?.lat && n.location?.lng) || (n.latitude && n.longitude)).slice(0, 50).map((n, i) => {
              const lat = n.location?.lat || n.latitude;
              const lng = n.location?.lng || n.longitude;
              return (
                <Marker key={`n-${n._id || i}`} position={[lat, lng]} icon={ngoIcon}>
                  <Popup minWidth={220}>
                    <div className="map-popup-card">
                      <strong className="map-popup-title">{n.ngoName || n.name}</strong>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: 10 }}>{n.ngoContact || n.email}</div>
                      
                      <div className="map-coords-row">
                        <div>LAT: {lat.toFixed(6)}</div>
                        <div>LNG: {lng.toFixed(6)}</div>
                      </div>

                      <div className="map-action-grid">
                        <button className="map-copy-btn" onClick={() => copyToClipboard(lat.toFixed(6))}>Copy Lat</button>
                        <button className="map-copy-btn" onClick={() => copyToClipboard(lng.toFixed(6))}>Copy Lng</button>
                        <button className="map-copy-btn full" onClick={() => copyToClipboard(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)}>Copy HQ Location</button>
                      </div>

                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "20px" }}>NGO PARTNER</span>
                      </div>
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
