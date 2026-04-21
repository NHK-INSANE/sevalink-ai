"use client";

import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useState, useCallback, useMemo } from "react";

/**
 * MapLibreView component - A modern, vector-tile based map engine.
 * 
 * @param {Array} markers - Array of objects { lat, lng, id, color, element, popupContent }
 * @param {Object} center - { lat, lng } initial center
 * @param {Number} zoom - Initial zoom level
 * @param {Function} onMapClick - Callback function for map clicks (returns { lat, lng })
 * @param {String} height - CSS height string
 * @param {String} mapStyle - MapLibre GL style URL
 */
export default function MapLibreView({
  markers = [],
  center = { lat: 22.3, lng: 87.3 },
  zoom = 10,
  onMapClick = null,
  height = "400px",
  mapStyle = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
}) {
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);

  // Default view state
  const initialViewState = useMemo(() => ({
    longitude: center.lng,
    latitude: center.lat,
    zoom: zoom
  }), [center.lng, center.lat, zoom]);

  const handleMapClick = useCallback((e) => {
    if (onMapClick) {
      onMapClick({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng
      });
    }
    // Clear selection on map click
    setSelectedMarkerId(null);
  }, [onMapClick]);

  const selectedMarker = useMemo(() => 
    markers.find(m => m.id === selectedMarkerId), 
    [markers, selectedMarkerId]
  );

  return (
    <div style={{ height, width: "100%", position: "relative" }} className="rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-white">
      <Map
        initialViewState={initialViewState}
        mapStyle={mapStyle}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%" }}
        // attributionControl={false}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />

        {markers.map((m, i) => (
          <Marker
            key={m.id || i}
            longitude={m.lng || m.longitude}
            latitude={m.lat || m.latitude}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedMarkerId(m.id || i);
              if (m.onClick) m.onClick(m);
            }}
          >
            {m.element || (
              <div 
                className="cursor-pointer transition-transform hover:scale-125"
                style={{
                  background: m.color || "#ef4444",
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  border: "2px solid white",
                  boxShadow: `0 0 10px ${m.color || "#ef4444"}`
                }} 
              />
            )}
          </Marker>
        ))}

        {selectedMarker && selectedMarker.popupContent && (
          <Popup
            longitude={selectedMarker.lng || selectedMarker.longitude}
            latitude={selectedMarker.lat || selectedMarker.latitude}
            anchor="bottom"
            onClose={() => setSelectedMarkerId(null)}
            closeButton={false}
            offset={10}
            className="modern-popup"
          >
            <div className="text-slate-900 min-w-[200px]">
              {selectedMarker.popupContent}
            </div>
          </Popup>
        )}
      </Map>

      <style jsx global>{`
        .modern-popup .maplibregl-popup-content {
          background: white;
          color: #1e293b;
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .modern-popup .maplibregl-popup-tip {
          border-top-color: white;
        }
      `}</style>
    </div>
  );
}
