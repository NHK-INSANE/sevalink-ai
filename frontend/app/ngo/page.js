"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function NGOPage() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://sevalink-backend-bmre.onrender.com/api/users")
      .then((res) => res.json())
      .then((data) => {
        const onlyNgos = data.filter(
          (u) => u.role?.toLowerCase() === "ngo"
        );
        setNgos(onlyNgos);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">🏢 Registered NGOs</h1>
          <p className="text-slate-400 text-sm">
            Organisations actively coordinating crisis response on SevaLink
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass rounded-xl h-36 animate-pulse bg-white/3 border border-white/5" />
            ))}
          </div>
        ) : ngos.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
            <div className="text-5xl mb-4">🏢</div>
            <p className="text-slate-400 font-semibold text-lg">No NGOs registered yet</p>
            <p className="text-slate-600 text-sm mt-1">Be the first organisation to join</p>
            <a
              href="/register"
              className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-sm font-semibold hover:bg-indigo-600/30 transition-all"
            >
              Register as NGO →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ngos.map((ngo, i) => (
              <div
                key={ngo._id || i}
                className="glass rounded-xl p-5 border border-white/8 hover:border-indigo-500/30 transition-all"
              >
                {/* Header row */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-lg">
                    🏢
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-base leading-tight">
                      {ngo.ngoName || ngo.name || "Unnamed NGO"}
                    </h2>
                    <span className="text-xs text-indigo-400 font-medium">NGO</span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  {ngo.email && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-slate-500">📧</span>
                      <span className="truncate">{ngo.email}</span>
                    </div>
                  )}
                  {ngo.phone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-slate-500">📞</span>
                      <span>{ngo.phone}</span>
                    </div>
                  )}
                  {ngo.address && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-slate-500">📍</span>
                      <span>{ngo.address}</span>
                    </div>
                  )}
                  {ngo.ngoContact && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-slate-500">🌐</span>
                      <span className="truncate">{ngo.ngoContact}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
