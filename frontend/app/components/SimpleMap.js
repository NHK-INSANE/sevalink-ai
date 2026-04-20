"use client";

/**
 * SimpleMap component - A reliable fallback using OpenStreetMap iframe.
 * Works without any JS dependencies or tile loading issues.
 * 
 * @param {Number} lat - Latitude
 * @param {Number} lng - Longitude
 * @param {Number} height - Height of the map
 */
export default function SimpleMap({ lat = 22.3, lng = 87.3, height = 400 }) {
  // Bounding box: [min_lon, min_lat, max_lon, max_lat]
  const offset = 0.01;
  const bbox = `${lng - offset}%2C${lat - offset}%2C${lng + offset}%2C${lat + offset}`;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <iframe
        width="100%"
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}
      />
    </div>
  );
}
