"use client";
import { useEffect, useState } from "react";
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

export default function ProblemMap({ problems }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Fix for Leaflet default icon issue
    const DefaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    setMounted(true);

    // Force re-render after mounting
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 500);
  }, []);

  if (!mounted) return (
    <div style={{ height: "400px", width: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p className="text-slate-400">Loading Problem Map...</p>
    </div>
  );

  return (
    <div style={{ height: "400px", width: "100%" }}>
      <MapContainer
        center={[22.3, 87.3]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {problems.map((p, i) => (
          <Marker
            key={i}
            position={[
              p.location?.lat || 22.3,
              p.location?.lng || 87.3,
            ]}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-gray-800">{p.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{p.description}</p>
                <div className="mt-2 text-xs font-semibold">
                  <span className={`px-2 py-0.5 rounded-full ${
                    p.urgency === 'Critical' ? 'bg-red-100 text-red-600' :
                    p.urgency === 'High' ? 'bg-orange-100 text-orange-600' :
                    p.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {p.urgency}
                  </span>
                  <span className="ml-2 text-gray-400 capitalize">{p.status}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
