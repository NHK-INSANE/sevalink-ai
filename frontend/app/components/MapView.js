"use client";
import { useEffect, useRef, useState } from "react";

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
 * Visible on dark AND light map tiles.
 */
function makeIcon(L, urgency) {
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

export default function MapView({ problems = [], onSelect, center }) {
  const mapRef        = useRef(null);
  const leafletMapRef = useRef(null);
  const heatLayerRef  = useRef(null);
  const clusterRef    = useRef(null);
  const [mapMode, setMapMode] = useState("markers");
  const [mounted,  setMounted]  = useState(false);

  const validProblems = problems.filter(
    (p) => p.location?.lat && p.location?.lng
  );

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      await import("leaflet.heat");
      await import("leaflet.markercluster");
      await import("leaflet.markercluster/dist/MarkerCluster.css");
      await import("leaflet.markercluster/dist/MarkerCluster.Default.css");

      // 🔧 Fix Webpack/Next.js breaking Leaflet's default icon paths in production
      // eslint-disable-next-line no-proto
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });


      if (leafletMapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [22.3, 87.3],
        zoom: 10,
        zoomControl: true,
      });

      // 🌑 CartoDB Dark Matter — modern dark tile
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      leafletMapRef.current = map;

      // 📍 MarkerClusterGroup with custom styles
      const cluster = L.markerClusterGroup({
        maxClusterRadius: 60,
        iconCreateFunction(group) {
          const count    = group.getChildCount();
          const markers  = group.getAllChildMarkers();
          const urgencies = ["Critical","High","Medium","Low"];
          let topColor   = URGENCY_COLOR.Low;
          for (const u of urgencies) {
            if (markers.some(m => m.options._urgency === u)) {
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
        },
      });

      validProblems.forEach((p) => {
        const icon   = makeIcon(L, p.urgency);
        const color  = URGENCY_COLOR[p.urgency] || URGENCY_COLOR.Medium;
        const marker = L.marker([p.location.lat, p.location.lng], {
          icon,
          _urgency: p.urgency,  // stored on options for cluster colour logic
        });

        const scoreRow = typeof p.score === "number" && p.score > 0
          ? `<br/><span style="font-size:11px;color:${color};font-weight:600">Score: ${p.score}/100</span>`
          : "";
        const skillRow = p.requiredSkill
          ? `<br/><span style="font-size:10px;color:#aaa">Skill needed: ${p.requiredSkill}</span>`
          : "";

        marker.bindPopup(`
          <div style="min-width:190px;font-family:system-ui;line-height:1.5">
            <strong style="color:${color};font-size:14px">${p.title}</strong><br/>
            <span style="font-size:12px;color:#aaa">
              ${(p.description || "").slice(0, 90)}${(p.description || "").length > 90 ? "…" : ""}
            </span>
            <br/><br/>
            <span style="background:${color}22;color:${color};border:1px solid ${color}55;
              padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600">
              ${p.urgency} Urgency
            </span>
            &nbsp;<span style="font-size:11px;color:#888">${p.status}</span>
            ${scoreRow}
            ${skillRow}
          </div>
        `);

        // 🖱️ Click → fire onSelect with problem data
        marker.on("click", () => {
          if (onSelect) onSelect(p);
        });

        cluster.addLayer(marker);
      });

      clusterRef.current = cluster;
      cluster.addTo(map);

      // 🔥 Heatmap layer (hidden initially)
      const heatData = validProblems.map((p) => [
        p.location.lat,
        p.location.lng,
        Math.max((p.score || 30) / 100, 0.1),
      ]);
      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 35,
        blur:   20,
        maxZoom: 14,
        gradient: {
          0.0: "#22c55e",
          0.4: "#eab308",
          0.7: "#f97316",
          1.0: "#ef4444",
        },
      });
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // 🗺️ Fly to new center when location search fires
  useEffect(() => {
    if (!center || !leafletMapRef.current) return;
    leafletMapRef.current.flyTo(center, 12, { duration: 1.2 });
  }, [center]);

  // 📐 Auto fit-bounds whenever filtered problems change
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !mounted) return;
    const pts = problems.filter((p) => p.location?.lat && p.location?.lng);
    if (pts.length === 0) return;
    const bounds = pts.map((p) => [p.location.lat, p.location.lng]);
    try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 }); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problems]);

  // Toggle layers when mapMode changes
  useEffect(() => {
    const map     = leafletMapRef.current;
    const heat    = heatLayerRef.current;
    const cluster = clusterRef.current;
    if (!map || !heat || !cluster) return;

    if (mapMode === "heat") {
      if (map.hasLayer(cluster)) map.removeLayer(cluster);
      if (!map.hasLayer(heat))  heat.addTo(map);
    } else {
      if (map.hasLayer(heat))    map.removeLayer(heat);
      if (!map.hasLayer(cluster)) cluster.addTo(map);
    }
  }, [mapMode]);

  if (!mounted) return null;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Mode toggle */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-1 glass rounded-lg p-1 shadow-lg">
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

      {/* Legend — markers mode */}
      {mapMode === "markers" && (
        <div className="absolute bottom-3 left-3 z-[1000] glass rounded-lg p-2 text-xs space-y-1">
          {[
            { label: "Critical", color: "#ef4444" },
            { label: "High",     color: "#f97316" },
            { label: "Medium",   color: "#eab308" },
            { label: "Low",      color: "#22c55e" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 4px ${color}` }}
              />
              <span className="text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend — heat mode */}
      {mapMode === "heat" && (
        <div className="absolute bottom-3 left-3 z-[1000] glass rounded-lg p-2 text-xs space-y-1">
          <div className="text-slate-400 font-medium mb-1">Intensity</div>
          <div
            className="w-24 h-2 rounded-full"
            style={{
              background:
                "linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444)",
            }}
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Low</span>
            <span>Critical</span>
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        className="h-[500px] w-full"
        style={{ background: "#1a1a2e" }}
      />
    </div>
  );
}
