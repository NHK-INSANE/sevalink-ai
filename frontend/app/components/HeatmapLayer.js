"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    const heatPoints = points.map(p => {
      // Return [lat, lng, intensity]
      let intensity = 0.5;
      if (p.urgency === "Critical") intensity = 1.0;
      else if (p.urgency === "High") intensity = 0.8;
      
      return [p.lat, p.lng, intensity];
    });

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}
