"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import { getProblems } from "../utils/api";

const MapView = dynamic(() => import("../components/MapView"), { ssr: false });

export default function MapPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [mapType, setMapType] = useState("problems");
  const [selected, setSelected] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  // 🟢 Dummy NGO data
  const ngos = [
    { name: "Hope NGO", lat: 22.58, lng: 88.36 },
    { name: "Care Foundation", lat: 22.56, lng: 88.34 },
    { name: "City Relief", lat: 22.61, lng: 88.40 },
  ];

  // 🔵 Dummy helpers
  const helpers = [
    { name: "Rahul", role: "Volunteer", lat: 22.57, lng: 88.35 },
    { name: "Amit", role: "NGO Worker", lat: 22.55, lng: 88.37 },
    { name: "Priya", role: "Medical Volunteer", lat: 22.59, lng: 88.38 },
  ];

  useEffect(() => {
    getProblems()
      .then((data) => setProblems(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredProblems =
    filter === "All" ? problems : problems.filter((p) => p.urgency === filter);

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
      },
      () => alert("Location permission denied")
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">🗺️ Crisis Map</h1>
            <p className="text-slate-400 text-sm">
              Real-time visualization of problems, NGOs, and volunteers.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex p-1 glass rounded-xl border border-white/10">
              {[
                { id: "problems", label: "Problems", icon: "🔴" },
                { id: "ngo",      label: "NGOs",     icon: "🟢" },
                { id: "helpers",  label: "Helpers",  icon: "🔵" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMapType(m.id);
                    setSelected(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    mapType === m.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="w-px h-8 bg-white/10 mx-1" />

            <button
              onClick={handleMyLocation}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold glass border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 transition-all shadow-lg"
            >
              📍 Locate Me
            </button>
          </div>
        </div>

        {/* Filter pills - only for problems */}
        {mapType === "problems" && (
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { label: "All",      color: "bg-indigo-600" },
              { label: "Critical", color: "bg-red-600" },
              { label: "High",     color: "bg-orange-500" },
              { label: "Medium",   color: "bg-yellow-500" },
              { label: "Low",      color: "bg-emerald-600" },
            ].map(({ label, color }) => (
              <button
                key={label}
                onClick={() => setFilter(label)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  filter === label
                    ? `${color} text-white border-transparent shadow-lg`
                    : "glass border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {label}
                {label !== "All" && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-md bg-black/20 text-[10px]">
                    {problems.filter((p) => p.urgency === label).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: "70vh" }}>
          {!loading ? (
            <MapView
              problems={filteredProblems}
              ngos={ngos}
              helpers={helpers}
              type={mapType}
              onSelect={setSelected}
              center={mapCenter}
              userLocation={userLocation}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 font-medium">
              <span className="animate-pulse">Loading map dashboard...</span>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="fixed right-4 top-20 z-[2000] w-80 glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div
              className="h-1.5 w-full"
              style={{
                background:
                  selected.urgency === "Critical" ? "#ef4444" :
                  selected.urgency === "High"     ? "#f97316" :
                  selected.urgency === "Medium"   ? "#eab308" : "#22c55e",
              }}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h2 className="font-bold text-white text-base">{selected.title}</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-500 hover:text-white text-lg"
                >✕</button>
              </div>
              <p className="text-slate-400 text-sm mb-3">{selected.description || "No description."}</p>
              <div className="space-y-1 text-xs">
                <div className="flex gap-2"><span className="text-slate-500">Urgency</span> <span className="text-slate-300">{selected.urgency}</span></div>
                <div className="flex gap-2"><span className="text-slate-500">Status</span> <span className="text-slate-300">{selected.status}</span></div>
                {selected.requiredSkill && (
                  <div className="flex gap-2"><span className="text-slate-500">Skill</span> <span className="text-slate-300">{selected.requiredSkill}</span></div>
                )}
              </div>
              {selected.location?.lat && selected.location?.lng && (
                <div className="mt-4 pt-3 border-t border-white/8">
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.location.lat},${selected.location.lng}`, "_blank")}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 transition-all"
                  >
                    🧭 Get Directions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
