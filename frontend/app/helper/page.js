"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function Helper() {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`)
      .then((res) => {
        if (!res.ok) throw new Error("API failed");
        return res.json();
      })
      .then((data) => {
        // Filter roles (case-insensitive for safety)
        const filtered = data.filter(
          (u) => 
            u.role?.toLowerCase() === "volunteer" || 
            u.role?.toLowerCase() === "worker"
        );
        setHelpers(filtered);
      })
      .catch(err => console.error("Fetch helpers error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🤝 Helpers & Volunteers</h1>
          <p className="text-slate-400">
            Dedicated individuals and NGO workers from our community.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass h-48 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpers.map((h) => (
              <div key={h._id || h.id} className="glass p-6 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {h.role?.toLowerCase() === "volunteer" ? "🤝" : "🔧"}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{h.name}</h2>
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{h.role}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-slate-500">🛠 Skill:</span>
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-xs font-medium">
                      {h.skill || h.skills?.join(", ") || "General"}
                    </span>
                  </div>
                  
                  {h.ngoName && (
                    <div className="text-xs text-slate-400">
                      🏢 Under: {h.ngoName}
                    </div>
                  )}
                  
                  <hr className="border-white/5" />
                  
                  <button className="w-full py-2 rounded-xl bg-indigo-600/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all">
                    Contact Assistant
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && helpers.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p className="text-slate-500">No active helpers found in the database.</p>
          </div>
        )}
      </main>
    </div>
  );
}
