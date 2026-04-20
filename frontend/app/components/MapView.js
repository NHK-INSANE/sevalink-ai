"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

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

function FixMap() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 600);
  }, [map]);
  return null;
}

// For register/submit - click to place pin
export function LocationPicker({ location, setLocation }) {
  useMapEvents({
    click(e) {
      setLocation([e.latlng.lat, e.latlng.lng]);
    },
  });
  return location ? (
    <Marker position={location} icon={userIcon}>
      <Popup>📍 Selected location</Popup>
    </Marker>
  ) : null;
}

export default function MapView({
  problems = [],
  ngos = [],
  helpers = [],
  type = "problems",
  userLocation = null,
  center = [22.3, 87.3],
  onSelect = null,
  // For register/submit pin picking
  pickMode = false,
  pickedLocation = null,
  setPickedLocation = null,
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <MapContainer
      key={`${type}-${center.toString()}`}
      center={center}
      zoom={10}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <FixMap />
      <TileLayer url={tileUrl} attribution={attribution} />

      {/* User location pin */}
      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>📍 You are here</Popup>
        </Marker>
      )}

      {/* Pin picker mode (register/submit) */}
      {pickMode && (
        <LocationPicker location={pickedLocation} setLocation={setPickedLocation} />
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
                <strong>{p.title}</strong>
                <br />
                Urgency: <b>{p.urgency}</b>
                <br />
                {p.description?.slice(0, 80)}
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
                <strong>🏢 {n.name}</strong>
                <br />
                {n.email}
                <br />
                {n.phone}
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
                <strong>🤝 {h.name}</strong>
                <br />
                {h.role} — {h.skill}
              </Popup>
            </Marker>
          ))}
    </MapContainer>
  );
}
