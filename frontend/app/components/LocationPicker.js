"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import map to avoid SSR issues
const MapPicker = dynamic(() => import("./MapPickerInner"), { ssr: false });

export default function LocationPicker({ onLocationSelect }) {
  const [showMap, setShowMap] = useState(false);
  const [pinned, setPinned] = useState(null);

  const handlePick = (latlng) => {
    setPinned(latlng);
    onLocationSelect(latlng);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowMap((v) => !v)}
        className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
          showMap
            ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
            : "border-white/10 text-slate-400 hover:text-slate-300 hover:border-white/20"
        }`}
      >
        {showMap ? "▲ Hide map" : "🗺️ Pin on map instead"}
      </button>

      {pinned && (
        <p className="text-xs text-emerald-400 mt-1.5">
          📍 Pinned: {pinned.lat.toFixed(4)}, {pinned.lng.toFixed(4)}
        </p>
      )}

      {showMap && (
        <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
          <MapPicker onPick={handlePick} />
        </div>
      )}
    </div>
  );
}
