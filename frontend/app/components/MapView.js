"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// Fix Leaflet Icon Bug
L.Icon.Default.mergeOptions({
  iconRetinaUrl: null,
  iconUrl: null,
  shadowUrl: null,
});

// Inject marker styles
if (typeof document !== "undefined") {
  if (!document.getElementById("map-system-style")) {
    const style = document.createElement("style");
    style.id = "map-system-style";
    style.textContent = `
      @keyframes mapPulse {
        0%   { box-shadow: 0 0 0 0 var(--pulse-color); transform: scale(1); }
        70%  { box-shadow: 0 0 0 10px rgba(0,0,0,0); transform: scale(1.1); }
        100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); transform: scale(1); }
      }
      .cluster-dot {
        width: 14px;
        height: 14px;
        background: #3b82f6;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 10px rgba(59,130,246,0.5);
      }
      .marker-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        animation: mapPulse 2s infinite;
      }
      .leaflet-container {
        background: #0f172a !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function createIcon(color) {
  return L.divIcon({
    html: `<div class="marker-dot" style="background: ${color}; --pulse-color: ${color}80"></div>`,
    className: "custom-marker-icon",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -10]
  });
}

const NGO_ICON = createIcon("#3b82f6"); // Blue
const CRITICAL_ICON = createIcon("#dc2626"); // Red
const HIGH_ICON = createIcon("#f97316"); // Orange
const MEDIUM_ICON = createIcon("#eab308"); // Yellow
const LOW_ICON = createIcon("#10b981"); // Green

function UserMarkerToggle() {
  const map = useMap();
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const handleToggle = (e) => {
      const { show } = e.detail;
      if (!show) return setPos(null);
      navigator.geolocation.getCurrentPosition((p) => {
        const coords = [p.coords.latitude, p.coords.longitude];
        setPos(coords);
        map.flyTo(coords, 14);
      });
    };
    window.addEventListener("map-toggle-user", handleToggle);
    return () => window.removeEventListener("map-toggle-user", handleToggle);
  }, [map]);

  if (!pos) return null;
  return (
    <Marker position={pos} icon={L.divIcon({ 
      html: '<div style="width:16px;height:16px;background:#9333ea;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.5)"></div>',
      iconSize:[16,16], iconAnchor:[8,8]
    })}>
      <Popup>Deployment Position 📍</Popup>
    </Marker>
  );
}

export default function MapView({ problems = [], ngos = [], type = "all", height = "100%", zoom = 6 }) {
  const router = useRouter();
  
  const copyLocation = (lat, lng) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    toast.success("Coordinates Copied");
  };

  return (
    <MapContainer
      center={[22.3, 87.3]}
      zoom={zoom}
      style={{ height, width: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <UserMarkerToggle />

      <MarkerClusterGroup
        showCoverageOnHover={false}
        maxClusterRadius={40}
        disableClusteringAtZoom={13}
        iconCreateFunction={() => L.divIcon({ html: '<div class="cluster-dot"></div>', className: 'cluster-wrapper', iconSize:[14,14] })}
      >
        {/* NGO MARKERS */}
        {(type === "all" || type === "ngo") && ngos.map(n => {
          const lat = n.location?.lat || n.latitude;
          const lng = n.location?.lng || n.longitude;
          if (!lat || !lng) return null;
          return (
            <Marker key={n._id} position={[lat, lng]} icon={NGO_ICON}>
              <Popup>
                <div className="p-2 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{n.ngoName || n.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Partner NGO Node</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => copyLocation(lat, lng)} className="w-full py-2 bg-slate-100 text-[9px] font-bold uppercase rounded-lg hover:bg-slate-200 transition-all">Copy Coordinates</button>
                    <button onClick={() => router.push(`/chat?id=${n._id}`)} className="w-full py-2 bg-blue-600 text-white text-[9px] font-bold uppercase rounded-lg shadow-lg shadow-blue-500/20">Establish Link</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* PROBLEM MARKERS */}
        {(type === "all" || type === "problems") && problems.map(p => {
          const lat = p.location?.lat || p.latitude;
          const lng = p.location?.lng || p.longitude;
          if (!lat || !lng) return null;
          
          const sev = (p.severity || p.urgency || "medium").toLowerCase();
          let icon = MEDIUM_ICON;
          if (sev === "critical") icon = CRITICAL_ICON;
          else if (sev === "high") icon = HIGH_ICON;
          else if (sev === "low") icon = LOW_ICON;

          return (
            <Marker key={p._id} position={[lat, lng]} icon={icon}>
              <Popup>
                <div className="p-2 space-y-3 min-w-[180px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{p.title}</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Incident Report</p>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                      sev === 'critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                    }`}>{sev}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => copyLocation(lat, lng)} className="w-full py-2 bg-slate-100 text-[9px] font-bold uppercase rounded-lg hover:bg-slate-200 transition-all">Copy Location</button>
                    <button onClick={() => router.push(`/problems?id=${p._id}`)} className="w-full py-2 bg-purple-600 text-white text-[9px] font-bold uppercase rounded-lg shadow-lg shadow-purple-500/20">View Briefing</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
