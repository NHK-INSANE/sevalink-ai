"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-slate-900 rounded-2xl animate-pulse" />
});

export default function MapPage() {
  const [problems, setProblems] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [mapType, setMapType] = useState("all");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [probRes, userRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/problems`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`)
        ]);

        const problemsData = await probRes.json();
        const usersData = await userRes.json();

        setProblems(problemsData);
        
        // Filter users for Helpers and NGOs
        const helpersList = usersData.filter(u => u.role === "Volunteer" || u.role === "Worker");
        const ngosList = usersData.filter(u => u.role === "NGO");
        
        setHelpers(helpersList);
        setNgos(ngosList);
        
      } catch (err) {
        console.error("Map page data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProblems =
    filter === "All"
      ? problems
      : problems.filter((p) => p.urgency === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              Crisis Control Map
            </h1>
            <p className="text-slate-400 text-sm">
              Visualize real-time reports and resources on the ground.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="glass p-1 rounded-xl flex gap-1 border border-white/5">
              {[
                { id: "all", label: "All", icon: "🌐" },
                { id: "problems", label: "Problems", icon: "🔴" },
                { id: "ngo", label: "NGOs", icon: "🟢" },
                { id: "helpers", label: "Helpers", icon: "🔵" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMapType(m.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    mapType === m.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {mapType === "problems" && (
              <div className="glass p-1 rounded-lg flex gap-1 border border-white/5 self-end">
                {["All", "Critical", "High", "Medium", "Low"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                      filter === f
                        ? "bg-white/10 text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-1 border border-white/10 overflow-hidden shadow-2xl relative">
          {loading ? (
            <div className="h-[600px] w-full bg-slate-900 animate-pulse flex items-center justify-center">
              <div className="text-slate-500 flex flex-col items-center gap-4">
                <span className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                Initializing Tactical Map...
              </div>
            </div>
          ) : (
            <MapView
              type={mapType}
              problems={filteredProblems}
              helpers={helpers}
              ngos={ngos}
            />
          )}

          {/* Map Overlay Legend */}
          <div className="absolute bottom-6 left-6 z-[1000] glass p-4 rounded-2xl border border-white/10 text-xs shadow-2xl">
            <h4 className="font-bold mb-3 text-slate-300 uppercase tracking-widest text-[9px]">Legend</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="text-slate-300 font-medium tracking-wide">Problems</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                <span className="text-slate-300 font-medium tracking-wide">NGO Centers</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                <span className="text-slate-300 font-medium tracking-wide">Volunteers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
