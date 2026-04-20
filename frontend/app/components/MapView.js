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
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
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
 * FixMap — Invalidates size twice:
 * 1) immediately (catches quick unmount/remount)
 * 2) after 800ms (catches CSS transitions and tab switches)
 */
function FixMap() {
  const map = useMap();
  useEffect(() => {
    const fix = () => {
      map.invalidateSize();
    };
    
    fix(); // immediate
    const timer = setTimeout(fix, 800);
    
    window.addEventListener("resize", fix);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", fix);
    };
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
    if (!problems.length) return;

    let heatLayer;
    const loadHeat = async () => {
      await import("leaflet.heat");
      const points = problems
        .filter(p => p.location?.lat && p.location?.lng)
        .map(p => [p.location.lat, p.location.lng, Math.max((p.score || 30) / 100, 0.1)]);

      heatLayer = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 14,
        gradient: { 0.4: "blue", 0.6: "cyan", 0.7: "lime", 0.8: "yellow", 1.0: "red" }
      }).addTo(map);
    };

    loadHeat();

    return () => {
      if (heatLayer) map.removeLayer(heatLayer);
    };
  }, [problems, map]);

  return null;
}

export default function MapView({
  problems = [],
  ngos = [],
  helpers = [],
  type = "problems",
  onSelect,
  center,
  userLocation,
}) {
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
  const LIGHT_URL = "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";

  const ngoIcon = useMemo(() => new L.DivIcon({
    className: "",
    iconSize:  [18, 18],
    iconAnchor:[9, 9],
    html: `
      <div style="
        width:18px;height:18px;border-radius:50%;
        background:#22c55e;
        box-shadow:0 0 0 4px rgba(34,197,94,0.35), 0 0 16px rgba(34,197,94,0.7);
        border:2px solid #fff;
      "></div>
    `,
  }), []);

  const helperIcon = useMemo(() => new L.DivIcon({
    className: "",
    iconSize:  [18, 18],
    iconAnchor:[9, 9],
    html: `
      <div style="
        width:18px;height:18px;border-radius:50%;
        background:#3b82f6;
        box-shadow:0 0 0 4px rgba(59,130,246,0.35), 0 0 16px rgba(59,130,246,0.7);
        border:2px solid #fff;
      "></div>
    `,
  }), []);

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
        {type === "problems" && (
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
        )}
      </div>

      {/* Legends */}
      <div className="absolute bottom-3 left-3 z-[1000] glass rounded-lg p-2 text-xs space-y-1 pointer-events-none">
        {type === "problems" ? (
          mapMode === "markers" ? (
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
          )
        ) : type === "ngo" ? (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />
            <span className="text-slate-300">NGO Location</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#3b82f6", boxShadow: "0 0 4px #3b82f6" }} />
            <span className="text-slate-300">Helper / Volunteer</span>
          </div>
        )}
      </div>

      <MapContainer
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

        {type === "all" && (
          <>
            {/* Problems Layer in ALL mode */}
            {validProblems.map((p, idx) => (
              <Marker
                key={`p-all-${p._id || idx}`}
                position={[p.location?.lat || 22.3, p.location?.lng || 87.3]}
                icon={makeIcon(p.urgency)}
              >
                <Popup>
                  <strong style={{ color: URGENCY_COLOR[p.urgency] }}>Problem: {p.title}</strong><br />
                  <span>Urgency: {p.urgency}</span>
                </Popup>
              </Marker>
            ))}

            {/* NGOs Layer in ALL mode */}
            {ngos.map((n, i) => n.location?.lat && (
              <Marker
                key={`n-all-${i}`}
                position={[n.location.lat, n.location.lng]}
                icon={ngoIcon}
              >
                <Popup>
                  <strong style={{ color: "#22c55e" }}>NGO: {n.name}</strong><br />
                  <span>{n.address || "Community Center"}</span>
                </Popup>
              </Marker>
            ))}

            {/* Helpers Layer in ALL mode */}
            {helpers.map((h, i) => h.location?.lat && (
              <Marker
                key={`h-all-${i}`}
                position={[h.location.lat, h.location.lng]}
                icon={helperIcon}
              >
                <Popup>
                  <strong style={{ color: "#3b82f6" }}>Helper: {h.name}</strong><br />
                  <span>{h.role} ({h.skill || "General"})</span>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {type === "problems" && mapMode === "markers" && (
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
                  position={[p.location?.lat || 22.3, p.location?.lng || 87.3]}
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
                      {typeof p.score === "number" && p.score > 0 && (
                        <div style={{ marginTop: "6px", fontSize: "11px", color: "#818cf8" }}>
                          ⚡ AI Score: <strong>{p.score}/100</strong>
                        </div>
                      )}
                      <div style={{ marginTop: "6px", fontSize: "10px", color: "#555", fontStyle: "italic" }}>
                        Click marker for details & directions
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}

        {type === "problems" && mapMode === "heat" && <HeatLayer problems={problems} />}

        {type === "ngo" && ngos.map((n, i) => n.location?.lat && (
          <Marker
            key={`ngo-${i}`}
            position={[n.location.lat, n.location.lng]}
            icon={ngoIcon}
          >
            <Popup>
              <div style={{ fontFamily: "system-ui", minWidth: "150px" }}>
                <strong style={{ color: "#22c55e", fontSize: "14px" }}>{n.name}</strong><br />
                <span style={{ fontSize: "12px", color: "#666" }}>Registered NGO</span>
                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #eee" }}>
                  <button className="w-full py-1.5 rounded bg-green-50 text-green-600 text-[10px] font-bold border border-green-200">
                    View Details
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {type === "helpers" && helpers.map((h, i) => h.location?.lat && (
          <Marker
            key={`helper-${i}`}
            position={[h.location.lat, h.location.lng]}
            icon={helperIcon}
          >
            <Popup>
              <div style={{ fontFamily: "system-ui", minWidth: "150px" }}>
                <strong style={{ color: "#3b82f6", fontSize: "14px" }}>{h.name}</strong><br />
                <span style={{ fontSize: "12px", color: "#666" }}>{h.role}</span>
                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #eee" }}>
                  <button className="w-full py-1.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200">
                    Contact {h.role}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))      }

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
