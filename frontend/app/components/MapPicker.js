"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";

function ClickHandler({ setLocation, setAddress, initialLocation }) {
  const [pos, setPos] = useState(initialLocation ? [initialLocation.lat, initialLocation.lng] : null);

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

export default function MapPicker({ setLocation, setAddress, initialLocation }) {
  return (
    <MapContainer
      center={initialLocation ? [initialLocation.lat, initialLocation.lng] : [22.57, 88.36]}
      zoom={initialLocation ? 15 : 12}
      style={{ height: "250px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler setLocation={setLocation} setAddress={setAddress} initialLocation={initialLocation} />
    </MapContainer>
  );
}
