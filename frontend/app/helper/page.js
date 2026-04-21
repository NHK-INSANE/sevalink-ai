"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { SkeletonCard } from "../components/Skeleton";
import { motion } from "framer-motion";

export default function Helper() {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((data) => {
        const filtered = data.filter(
          (u) =>
            u.role?.toLowerCase() === "volunteer" ||
            u.role?.toLowerCase() === "worker"
        );
        setHelpers(filtered);
      })
      .catch((err) => console.error("Fetch helpers error:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredHelpers = helpers.filter((h) => {
    if (filter === "all") return true;
    return h.role?.toLowerCase() === filter;
  });

  const FILTERS = [
    { id: "all", label: "All", icon: "🌐" },
    { id: "volunteer", label: "Volunteers", icon: "🤝" },
    { id: "worker", label: "Workers", icon: "🔧" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">🤝 Helpers & Volunteers</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Dedicated individuals and workers supporting the SevaLink network.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition text-[10px] sm:text-xs font-bold ${
                filter === f.id
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <span>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {filteredHelpers.length === 0 ? (
              <div className="text-center py-20 bg-[var(--card)] rounded-2xl border border-dashed border-[var(--border)] flex flex-col items-center">
                <p className="text-[var(--text)] font-bold text-lg">No helpers yet</p>
                <p className="text-[var(--muted)] text-sm mt-1">Invite volunteers to join the network.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHelpers.map((h) => (
                  <div 
                    key={h._id || h.id}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-xl text-[var(--primary)] font-bold shrink-0">
                        {h.name ? h.name[0].toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-[var(--text)] truncate tracking-tight">{h.name}</h2>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${h.role?.toLowerCase() === "volunteer" ? "text-blue-500" : "text-orange-500"}`}>
                          {h.role}
                        </span>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-2 mb-6">
                      {h.email && <div className="text-xs text-[var(--muted)] flex items-center gap-2"><span className="opacity-50">📧</span><span className="truncate">{h.email}</span></div>}
                      {h.phone && <div className="text-xs text-[var(--muted)] flex items-center gap-2"><span className="opacity-50">📞</span>{h.phone}</div>}
                      {h.address && <div className="text-xs text-[var(--muted)] flex items-center gap-2"><span className="opacity-50">📍</span><span className="truncate">{h.address}</span></div>}
                    </div>

                    {/* Skills */}
                    {(h.skills?.length > 0 || h.skill) && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {(h.skills?.length > 0 ? h.skills : [h.skill]).map((s, i) => (
                          <span key={i} className="bg-[var(--primary)]/5 border border-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active</span>
                      </div>
                      <button className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition active:scale-95">
                        Contact
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
