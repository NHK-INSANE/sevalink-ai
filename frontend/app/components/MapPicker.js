"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";

function ClickHandler({ setLocation, setAddress }) {
  const [pos, setPos] = useState(null);

  useMapEvents({
    click: async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      setPos([lat, lng]);
      setLocation({ lat, lng });

      // Reverse geocode
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        setAddress(data.display_name || "Selected location");
      } catch {
        setAddress("Location selected");
      }
    },
  });

  return pos ? <Marker position={pos} /> : null;
}

export default function MapPicker({ setLocation, setAddress, darkMode }) {
  return (
    <MapContainer
      center={[22.57, 88.36]}
      zoom={12}
      style={{ height: "250px", width: "100%" }}
    >
      {/* 🌙 DARK / LIGHT MAP SWITCH */}
      <TileLayer
        url={
          darkMode
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        }
      />

      <ClickHandler setLocation={setLocation} setAddress={setAddress} />
    </MapContainer>
  );
}
