"use client";
import { useState } from "react";
import MapLibreView from "./MapLibreView";

/**
 * MapPicker component - allows user to pick a location on the map
 * 
 * @param {Function} setLocation - Callback to return { lat, lng } to parent form
 */
export default function MapPicker({ setLocation }) {
  const [pickedLocation, setPickedLocation] = useState(null);

  const handleMapClick = (coords) => {
    setPickedLocation(coords);
    setLocation(coords);
  };

  const markers = pickedLocation ? [
    {
      ...pickedLocation,
      id: "picked",
      color: "#8b5cf6", // Purple to match User/Picker theme
      popupContent: <strong>📍 Selected Location</strong>
    }
  ] : [];

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
        <span>Click on the map to pin location</span>
        {pickedLocation && (
          <span className="text-indigo-400 font-mono">
            {pickedLocation.lat.toFixed(4)}, {pickedLocation.lng.toFixed(4)}
          </span>
        )}
      </div>
      
      <MapLibreView
        height="300px"
        markers={markers}
        onMapClick={handleMapClick}
        center={pickedLocation || { lat: 22.3, lng: 87.3 }}
        zoom={pickedLocation ? 14 : 10}
      />
      
      {!pickedLocation && (
        <p className="text-[10px] text-orange-400 italic">
          * Please select a precise location for faster response
        </p>
      )}
    </div>
  );
}
