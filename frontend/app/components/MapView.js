"use client";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Dynamically import Leaflet components
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// We need a wrapper for hooks that depend on map context
function MapEventsWrapper({ pickMode, setPickedLocation, onSelect }) {
  const { useMapEvents } = require("react-leaflet");
  useMapEvents({
    click(e) {
      if (pickMode && setPickedLocation) {
        setPickedLocation([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

function InvalidateSizeWrapper() {
  const { useMap } = require("react-leaflet");
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  }, [map]);
  return null;
}

const getProblemIcon = (urgency) => {
  const colors = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#22c55e",
  };
  const color = colors[urgency] || "#6b7280";
  return new L.DivIcon({
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px ${color}"></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const ngoIcon = new L.DivIcon({
  html: `<div style="background:#10b981;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px #10b981"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const helperIcon = new L.DivIcon({
  html: `<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px #3b82f6"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const userIcon = new L.DivIcon({
  html: `<div style="background:#8b5cf6;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 8px #8b5cf6"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Force re-render
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 500);
  }, []);

  if (!mounted) return (
    <div style={{ height: "100%", width: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p className="text-slate-400">Loading Global Map...</p>
    </div>
  );

  const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <MapContainer
      key={`${type}-${center.toString()}`}
      center={center}
      zoom={10}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <InvalidateSizeWrapper />
      <TileLayer url={tileUrl} attribution={attribution} />
      <MapEventsWrapper pickMode={pickMode} setPickedLocation={setPickedLocation} />

      {/* User location pin */}
      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>📍 You are here</Popup>
        </Marker>
      )}

      {/* Picked location pin */}
      {pickMode && pickedLocation && (
        <Marker position={pickedLocation} icon={userIcon}>
          <Popup>📍 Selected location</Popup>
        </Marker>
      )}

      {/* PROBLEMS */}
      {(type === "problems" || type === "all") &&
        problems
          .filter((p) => p.location?.lat && p.location?.lng)
          .map((p, i) => (
            <Marker
              key={`p-${i}`}
              position={[p.location.lat, p.location.lng]}
              icon={getProblemIcon(p.urgency)}
              eventHandlers={{ click: () => onSelect && onSelect(p) }}
            >
              <Popup>
                <div className="p-1">
                  <strong>{p.title}</strong>
                  <br />
                  Urgency: <b>{p.urgency}</b>
                  <br />
                  <p className="text-xs text-gray-600 mt-1">{p.description?.slice(0, 80)}...</p>
                </div>
              </Popup>
            </Marker>
          ))}

      {/* NGOs */}
      {(type === "ngo" || type === "all") &&
        ngos
          .filter((n) => n.location?.lat && n.location?.lng)
          .map((n, i) => (
            <Marker
              key={`n-${i}`}
              position={[n.location.lat, n.location.lng]}
              icon={ngoIcon}
            >
              <Popup>
                <div className="p-1">
                  <strong>🏢 {n.name}</strong>
                  <br />
                  <span className="text-xs text-gray-600">{n.email}</span>
                </div>
              </Popup>
            </Marker>
          ))}

      {/* Helpers */}
      {(type === "helpers" || type === "all") &&
        helpers
          .filter((h) => h.location?.lat && h.location?.lng)
          .map((h, i) => (
            <Marker
              key={`h-${i}`}
              position={[h.location.lat, h.location.lng]}
              icon={helperIcon}
            >
              <Popup>
                <div className="p-1">
                  <strong>🤝 {h.name}</strong>
                  <br />
                  <span className="text-xs text-gray-600">{h.role} — {h.skill}</span>
                </div>
              </Popup>
            </Marker>
          ))}
    </MapContainer>
  );
}
