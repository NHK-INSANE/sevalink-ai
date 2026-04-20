"use client";
import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// 🔧 Fix Webpack/Next.js breaking Leaflet's default icon paths in production
if (typeof window !== "undefined") {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

const URGENCY_COLOR = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#eab308",
  Low:      "#22c55e",
};

const URGENCY_RADIUS = {
  Critical: 18,
  High:     14,
  Medium:   11,
  Low:      9,
};

/**
 * Build a glowing DivIcon dot for each urgency level.
 */
function makeIcon(urgency) {
  const color = URGENCY_COLOR[urgency] || URGENCY_COLOR.Medium;
  const size  = URGENCY_RADIUS[urgency] || 11;
  return new L.DivIcon({
    className: "",
    iconSize:  [size * 2, size * 2],
    iconAnchor:[size, size],
    html: `
      <div style="
        width:${size * 2}px;
        height:${size * 2}px;
        border-radius:50%;
        background:${color};
        opacity:0.92;
        box-shadow:0 0 0 3px ${color}55, 0 0 10px ${color}88;
        border:2px solid rgba(255,255,255,0.35);
      "></div>
    `,
  });
}

/**
 * FixMap — Manually invalidateSize with delay (fixes blank tile grid)
 */
function FixMap() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 800);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/**
 * MapUpdater — Handles flyTo and fitBounds when props change
 */
function MapUpdater({ center, problems }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, 12, { duration: 1.2 });
    }
  }, [center, map]);

  useEffect(() => {
    if (problems.length > 0) {
      const bounds = problems
        .filter(p => p.location?.lat && p.location?.lng)
        .map(p => [p.location.lat, p.location.lng]);
      if (bounds.length > 0) {
        try {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        } catch (e) {}
      }
    }
  }, [problems, map]);

  return null;
}

/**
 * HeatLayer — Custom component to render Heatmap using leaflet.heat
 */
function HeatLayer({ problems }) {
  const map = useMap();

  useEffect(() => {
    let heatLayer;
    const initHeat = async () => {
      await import("leaflet.heat");
      const validPoints = problems
        .filter(p => p.location?.lat && p.location?.lng)
        .map(p => [
          p.location.lat,
          p.location.lng,
          Math.max((p.score || 30) / 100, 0.1)
        ]);
      
      heatLayer = L.heatLayer(validPoints, {
        radius: 35,
        blur:   20,
        maxZoom: 14,
        gradient: {
          0.0: "#22c55e",
          0.4: "#eab308",
          0.7: "#f97316",
          1.0: "#ef4444",
        },
      }).addTo(map);
    };

    initHeat();
    return () => {
      if (heatLayer) map.removeLayer(heatLayer);
    };
  }, [problems, map]);

  return null;
}

export default function MapView({ problems = [], onSelect, center, userLocation }) {
  const [mapMode, setMapMode] = useState("markers");
  const [isDark, setIsDark] = useState(true);

  const validProblems = useMemo(() => 
    problems.filter((p) => p.location?.lat && p.location?.lng),
  [problems]);

  // 🌙☀️ Watch <html> class list for light-mode toggle
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

  const DARK_URL  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const LIGHT_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const userIcon = useMemo(() => new L.DivIcon({
    className: "",
    iconSize:  [22, 22],
    iconAnchor:[11, 11],
    html: `
      <div style="
        width:22px;height:22px;border-radius:50%;
        background:#6366f1;
        box-shadow:0 0 0 4px rgba(99,102,241,0.35), 0 0 16px rgba(99,102,241,0.7);
        border:2px solid #fff;
      "></div>
    `,
  }), []);

  return (
    <div className="relative rounded-xl" style={{ isolation: "isolate" }}>
      {/* Mode toggle */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-1 glass rounded-lg p-1 shadow-lg pointer-events-auto">
        <button
          onClick={() => setMapMode("markers")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            mapMode === "markers"
              ? "bg-indigo-600 text-white shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          🔵 Markers
        </button>
        <button
          onClick={() => setMapMode("heat")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            mapMode === "heat"
              ? "bg-orange-500 text-white shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          🔥 Heatmap
        </button>
      </div>

      {/* Legends */}
      <div className="absolute bottom-3 left-3 z-[1000] glass rounded-lg p-2 text-xs space-y-1 pointer-events-none">
        {mapMode === "markers" ? (
          [
            { label: "Critical", color: "#ef4444" },
            { label: "High",     color: "#f97316" },
            { label: "Medium",   color: "#eab308" },
            { label: "Low",      color: "#22c55e" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
              <span className="text-slate-300">{label}</span>
            </div>
          ))
        ) : (
          <>
            <div className="text-slate-400 font-medium mb-1">Intensity</div>
            <div className="w-24 h-2 rounded-full" style={{ background: "linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444)" }} />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Low</span>
              <span>Critical</span>
            </div>
          </>
        )}
      </div>

      <MapContainer
        key={center ? center.toString() : "default"}
        center={center || [22.3, 87.3]}
        zoom={10}
        scrollWheelZoom={true}
        style={{ height: "500px", width: "100%", background: "#0a0a0f" }}
        className="rounded-xl overflow-hidden"
      >
        <FixMap />
        <MapUpdater center={center} problems={problems} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url={isDark ? DARK_URL : LIGHT_URL}
        />

        {mapMode === "markers" && (
          <MarkerClusterGroup
            maxClusterRadius={60}
            iconCreateFunction={(group) => {
              const count = group.getChildCount();
              const markers = group.getAllChildMarkers();
              const urgencies = ["Critical", "High", "Medium", "Low"];
              let topColor = URGENCY_COLOR.Low;
              for (const u of urgencies) {
                if (markers.some(m => m.options.icon.options.urgency === u)) {
                  topColor = URGENCY_COLOR[u];
                  break;
                }
              }
              const size = count > 50 ? 44 : count > 10 ? 36 : 30;
              return new L.DivIcon({
                className: "",
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
                html: `
                  <div style="
                    width:${size}px;height:${size}px;
                    border-radius:50%;
                    background:${topColor};
                    opacity:0.9;
                    display:flex;align-items:center;justify-content:center;
                    font-size:${size > 36 ? 13 : 11}px;font-weight:700;color:#fff;
                    box-shadow:0 0 0 3px ${topColor}55,0 2px 8px rgba(0,0,0,0.5);
                    border:2px solid rgba(255,255,255,0.3);
                  ">${count}</div>
                `,
              });
            }}
          >
            {validProblems.map((p, idx) => {
              const icon = makeIcon(p.urgency);
              icon.options.urgency = p.urgency; // attach for cluster logic
              const color = URGENCY_COLOR[p.urgency] || URGENCY_COLOR.Medium;

              return (
                <Marker
                  key={p._id || idx}
                  position={[p.location.lat, p.location.lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => onSelect && onSelect(p)
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: "190px", fontFamily: "system-ui", lineHeight: "1.5" }}>
                      <strong style={{ color, fontSize: "14px" }}>{p.title}</strong><br />
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {(p.description || "").slice(0, 90)}{(p.description || "").length > 90 ? "…" : ""}
                      </span>
                      <br /><br />
                      <span style={{ background: `${color}22`, color, border: `1px solid ${color}55`, padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "600" }}>
                        {p.urgency} Urgency
                      </span>
                      &nbsp;<span style={{ fontSize: "11px", color: "#888" }}>{p.status}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}

        {mapMode === "heat" && <HeatLayer problems={problems} />}

        {userLocation && (
          <Marker position={userLocation} icon={userIcon} zIndexOffset={1000}>
            <Popup>
              <div style={{ fontFamily: "system-ui", textAlign: "center", padding: "4px 2px" }}>
                <strong style={{ color: "#6366f1", fontSize: "13px" }}>📍 You are here</strong>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
