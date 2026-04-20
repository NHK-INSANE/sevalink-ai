"use client";
import { useEffect, useRef, useState } from "react";

export default function MapView({ problems = [] }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [mapMode, setMapMode] = useState("markers"); // "markers" | "heat"
  const [mounted, setMounted] = useState(false);

  const urgencyColors = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#22c55e",
  };

  const urgencyRadius = {
    Critical: 18,
    High: 14,
    Medium: 11,
    Low: 9,
  };

  const validProblems = problems.filter(
    (p) => p.location?.lat && p.location?.lng
  );

  // Initialize the map once
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      await import("leaflet.heat");

      if (leafletMapRef.current) return; // already initialized

      const map = L.map(mapRef.current, {
        center: [22.3, 87.3],
        zoom: 10,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      leafletMapRef.current = map;

      // Build markers layer group
      const markersGroup = L.layerGroup();
      validProblems.forEach((p) => {
        const color = urgencyColors[p.urgency] || urgencyColors.Medium;
        const radius = urgencyRadius[p.urgency] || 11;

        const circle = L.circleMarker([p.location.lat, p.location.lng], {
          color,
          fillColor: color,
          fillOpacity: 0.75,
          weight: 2,
          radius,
        });

        const scoreRow =
          typeof p.score === "number" && p.score > 0
            ? `<br/><span style="font-size:11px;color:${color};font-weight:600">Score: ${p.score}/100</span>`
            : "";

        const matchedSection = p.requiredSkill
          ? `<br/><span style="font-size:10px;color:#888">Skill needed: ${p.requiredSkill}</span>`
          : "";

        circle.bindPopup(`
          <div style="min-width:180px;font-family:system-ui">
            <strong style="color:${color};font-size:14px">${p.title}</strong><br/>
            <span style="font-size:12px;color:#999">${(p.description || "").slice(0, 80)}${(p.description || "").length > 80 ? "…" : ""}</span>
            <br/><br/>
            <span style="background:${color}22;color:${color};border:1px solid ${color}55;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600">
              ${p.urgency} Urgency
            </span>
            &nbsp;<span style="font-size:11px;color:#777">${p.status}</span>
            ${scoreRow}
            ${matchedSection}
          </div>
        `);

        markersGroup.addLayer(circle);
      });
      markersLayerRef.current = markersGroup;
      markersGroup.addTo(map);

      // Build heat layer
      const heatData = validProblems.map((p) => [
        p.location.lat,
        p.location.lng,
        Math.max((p.score || 30) / 100, 0.1), // intensity from score
      ]);

      const heat = L.heatLayer(heatData, {
        radius: 35,
        blur: 20,
        maxZoom: 14,
        gradient: {
          0.0: "#22c55e",
          0.4: "#eab308",
          0.7: "#f97316",
          1.0: "#ef4444",
        },
      });
      heatLayerRef.current = heat;
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

  // Switch layers when mapMode changes
  useEffect(() => {
    const map = leafletMapRef.current;
    const heatLayer = heatLayerRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !heatLayer || !markersGroup) return;

    if (mapMode === "heat") {
      if (map.hasLayer(markersGroup)) map.removeLayer(markersGroup);
      if (!map.hasLayer(heatLayer)) heatLayer.addTo(map);
    } else {
      if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
      if (!map.hasLayer(markersGroup)) markersGroup.addTo(map);
    }
  }, [mapMode]);

  if (!mounted) return null;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Toggle buttons */}
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

      {/* Legend */}
      {mapMode === "markers" && (
        <div className="absolute bottom-3 left-3 z-[1000] glass rounded-lg p-2 text-xs space-y-1">
          {[
            { label: "Critical", color: "#ef4444" },
            { label: "High", color: "#f97316" },
            { label: "Medium", color: "#eab308" },
            { label: "Low", color: "#22c55e" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: color }}
              />
              <span className="text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      )}

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
