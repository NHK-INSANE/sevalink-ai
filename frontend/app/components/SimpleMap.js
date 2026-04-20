"use client";

export default function SimpleMap({ lat = 22.3, lng = 87.3 }) {
  return (
    <iframe
      width="100%"
      height="300"
      style={{ border: 0 }}
      src={`https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${lat},${lng}`}
    />
  );
}
