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

// We need to import useMapEvents separately or dynamically
// Since it's a hook, we can't easily dynamic import it like a component
// But we can use it inside a component that is rendered only on the client
function LocationPickerEvents({ setLocation, setPosition }) {
  const { useMapEvents } = require("react-leaflet");
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      setLocation(e.latlng);
    },
  });
  return null;
}

export default function MapPicker({ setLocation }) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState(null);

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
    <div style={{ height: "300px", width: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p className="text-slate-400">Loading MapPicker...</p>
    </div>
  );

  return (
    <div style={{ height: "300px", width: "100%" }}>
      <MapContainer
        center={[22.3, 87.3]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationPickerEvents setLocation={setLocation} setPosition={setPosition} />
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}
