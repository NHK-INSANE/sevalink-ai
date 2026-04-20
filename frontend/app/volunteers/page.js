"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function VolunteersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    fetch("https://sevalink-backend-bmre.onrender.com/api/users")
      .then((res) => res.json())
      .then((data) => {
        const workers = data.filter(
          (u) =>
            u.role?.toLowerCase() === "volunteer" ||
            u.role?.toLowerCase() === "worker"
        );
        setUsers(workers);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filterRole === "all"
      ? users
      : users.filter((u) => u.role?.toLowerCase() === filterRole);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">🔧 Volunteers & Workers</h1>
            <p className="text-slate-400 text-sm">
              People actively helping resolve civic issues on SevaLink
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2">
            {[
              { key: "all", label: "All", color: "indigo" },
              { key: "volunteer", label: "🤝 Volunteers", color: "emerald" },
              { key: "worker", label: "🔧 Workers", color: "orange" },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setFilterRole(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  filterRole === key
                    ? `bg-${color}-600/20 text-${color}-300 border-${color}-500/40`
                    : "glass border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-xl h-32 animate-pulse bg-white/3 border border-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
            <div className="text-5xl mb-4">🤝</div>
            <p className="text-slate-400 font-semibold text-lg">No volunteers or workers registered yet</p>
            <p className="text-slate-600 text-sm mt-1">Join as a volunteer to start helping</p>
            <a
              href="/register"
              className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold hover:bg-emerald-600/30 transition-all"
            >
              Register as Volunteer →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((u, i) => {
              const isVol = u.role?.toLowerCase() === "volunteer";
              return (
                <div
                  key={u._id || i}
                  className="glass rounded-xl p-5 border border-white/8 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg ${
                        isVol
                          ? "bg-gradient-to-br from-emerald-600 to-teal-600"
                          : "bg-gradient-to-br from-orange-600 to-amber-600"
                      }`}
                    >
                      {isVol ? "🤝" : "🔧"}
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-sm leading-tight">
                        {u.name || "Unnamed"}
                      </h2>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          isVol
                            ? "text-emerald-300 bg-emerald-500/15"
                            : "text-orange-300 bg-orange-500/15"
                        }`}
                      >
                        {isVol ? "Volunteer" : "Worker"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {u.email && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>📧</span> <span className="truncate">{u.email}</span>
                      </div>
                    )}
                    {u.phone && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>📞</span> <span>{u.phone}</span>
                      </div>
                    )}
                    {u.address && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>📍</span> <span>{u.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {u.skills && u.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {u.skills.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
