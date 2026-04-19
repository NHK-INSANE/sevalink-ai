"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";

// Fix default icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const urgencyColors = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

const urgencyRadius = {
  Critical: 18,
  High: 14,
  Medium: 11,
  Low: 9,
};

export default function MapView({ problems = [] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const validProblems = problems.filter(
    (p) => p.location?.lat && p.location?.lng
  );

  return (
    <MapContainer
      center={[22.3, 87.3]}
      zoom={10}
      className="h-[500px] w-full rounded-xl overflow-hidden"
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {validProblems.map((p) => {
        const color = urgencyColors[p.urgency] || urgencyColors.Medium;
        const radius = urgencyRadius[p.urgency] || 11;

        return (
          <CircleMarker
            key={p._id}
            center={[p.location.lat, p.location.lng]}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong style={{ color: color, fontSize: 14 }}>
                  {p.title}
                </strong>
                <br />
                <span style={{ fontSize: 12, color: "#999" }}>
                  {p.description?.slice(0, 80)}
                  {p.description?.length > 80 ? "…" : ""}
                </span>
                <br />
                <br />
                <span
                  style={{
                    background: color + "22",
                    color: color,
                    border: `1px solid ${color}55`,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {p.urgency} Urgency
                </span>
                &nbsp;
                <span style={{ fontSize: 11, color: "#777" }}>{p.status}</span>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
