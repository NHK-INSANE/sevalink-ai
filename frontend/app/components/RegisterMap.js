"use client";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function LocationPicker({ setLocation, location }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setLocation([lat, lng]);
    },
  });

  return location ? <Marker position={location} /> : null;
}

function FixMap() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 500);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function RegisterMap({ location, setLocation }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () =>
      setIsDark(!document.documentElement.classList.contains("light-mode"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ height: "300px", width: "100%" }} className="rounded-xl overflow-hidden mt-2 border border-white/10">
      <MapContainer
        center={[22.3, 87.3]}
        zoom={10}
        style={{ height: "100%", width: "100%", background: "#1a1a2e" }}
      >
        <TileLayer
          url={
            isDark
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          }
        />
        <FixMap />
        <LocationPicker
          location={location}
          setLocation={setLocation}
        />
      </MapContainer>
    </div>
  );
}
