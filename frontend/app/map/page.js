"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import SimpleMap from "../components/SimpleMap";
import { getProblems } from "../utils/api";

export default function MapPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProblems()
      .then(setProblems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-white">Map</h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass h-[300px] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {problems.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <p className="text-slate-400 mt-5">No problems reported yet 🚫</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {problems.map((p) => (
                  <div key={p._id} className="glass p-4 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all">
                    <h3 className="font-bold mb-3 truncate text-white">{p.title}</h3>
                    <SimpleMap 
                      lat={p.location?.lat || 22.3} 
                      lng={p.location?.lng || 87.3} 
                    />
                    <div className="mt-3 flex justify-between items-center text-xs text-slate-500">
                      <span className={`px-2 py-1 rounded text-white ${
                        p.urgency === "Critical" ? "bg-red-500" :
                        p.urgency === "High" ? "bg-orange-500" :
                        p.urgency === "Medium" ? "bg-yellow-500" :
                        "bg-green-500"
                      }`}>
                        {p.urgency}
                      </span>
                      <span>{p.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
