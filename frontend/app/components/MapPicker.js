"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";

// Import Leaflet components dynamically to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const useMapEvents = dynamic(() => import("react-leaflet").then(mod => mod.useMapEvents), { ssr: false });

// Icon Fix
if (typeof window !== "undefined") {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
}

function LocationMarker({ setLocation, setAddress, pickedLocation, setPickedLocation }) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      setPickedLocation({ lat, lng });
      setLocation({ lat, lng });

      // 🌍 Reverse Geocoding via Nominatim
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        if (data.display_name) {
          setAddress(data.display_name);
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err);
      }
    },
  });

  return pickedLocation ? (
    <Marker position={[pickedLocation.lat, pickedLocation.lng]} />
  ) : null;
}

export default function MapPicker({ setLocation, setAddress, initialLocation = null }) {
  const [pickedLocation, setPickedLocation] = useState(initialLocation);

  // Update picked location if initialLocation changes (e.g. from GPS auto-detect)
  useEffect(() => {
    if (initialLocation) {
      setPickedLocation(initialLocation);
    }
  }, [initialLocation]);

  return (
    <div className="space-y-2 h-full">
      <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1 px-1">
        <span>Click map to pin location & auto-fill address</span>
        {pickedLocation && (
          <span className="text-indigo-400 font-mono">
            {pickedLocation.lat.toFixed(4)}, {pickedLocation.lng.toFixed(4)}
          </span>
        )}
      </div>
      
      <div className="h-[250px] rounded-xl overflow-hidden border border-white/10 shadow-inner bg-slate-900">
        <MapContainer
          center={pickedLocation ? [pickedLocation.lat, pickedLocation.lng] : [22.57, 88.36]}
          zoom={pickedLocation ? 14 : 10}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            setLocation={setLocation} 
            setAddress={setAddress}
            pickedLocation={pickedLocation} 
            setPickedLocation={setPickedLocation} 
          />
        </MapContainer>
      </div>
    </div>
  );
}
