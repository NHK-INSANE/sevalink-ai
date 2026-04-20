"use client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet default icon issue in Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function ProblemMap({ problems }) {
  return (
    <MapContainer
      center={[22.3, 87.3]}
      zoom={10}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {problems.map((p, i) => (
        <Marker
          key={i}
          position={[
            p.location?.lat || 22.3,
            p.location?.lng || 87.3,
          ]}
        >
          <Popup>
            <div className="p-1">
              <h3 className="font-bold text-gray-800">{p.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{p.description}</p>
              <div className="mt-2 text-xs font-semibold">
                <span className={`px-2 py-0.5 rounded-full ${
                  p.urgency === 'Critical' ? 'bg-red-100 text-red-600' :
                  p.urgency === 'High' ? 'bg-orange-100 text-orange-600' :
                  p.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {p.urgency}
                </span>
                <span className="ml-2 text-gray-400 capitalize">{p.status}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
