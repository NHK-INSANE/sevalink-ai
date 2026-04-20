"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "./components/Navbar";
import ProblemCard from "./components/ProblemCard";
import { getProblems, updateProblemStatus } from "./utils/api";

const MapView = dynamic(() => import("./components/MapView"), { ssr: false });

const STAT_CONFIG = [
  {
    key: "total",
    label: "Total Problems",
    icon: "📊",
    color: "from-indigo-600/20 to-purple-600/20",
    border: "border-indigo-500/20",
    text: "text-indigo-300",
  },
  {
    key: "critical",
    label: "Critical",
    icon: "🔴",
    color: "from-red-600/20 to-red-800/10",
    border: "border-red-500/20",
    text: "text-red-300",
  },
  {
    key: "high",
    label: "High Priority",
    icon: "🟠",
    color: "from-orange-600/20 to-orange-800/10",
    border: "border-orange-500/20",
    text: "text-orange-300",
  },
  {
    key: "resolved",
    label: "Resolved",
    icon: "✅",
    color: "from-emerald-600/20 to-emerald-800/10",
    border: "border-emerald-500/20",
    text: "text-emerald-300",
  },
];

export default function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProblems = async () => {
    try {
      setError(null);
      const data = await getProblems();
      setProblems(data);
    } catch (e) {
      setError("Could not connect to backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
    const interval = setInterval(fetchProblems, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id, status) => {
    await updateProblemStatus(id, status);
    setProblems((prev) =>
      prev.map((p) => (p._id === id ? { ...p, status } : p))
    );
  };

  const stats = {
    total: problems.length,
    critical: problems.filter((p) => p.urgency === "Critical").length,
    high: problems.filter((p) => p.urgency === "High").length,
    resolved: problems.filter((p) => p.status === "Resolved").length,
  };

  const recentProblems = problems.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Command Center
            </span>
          </h1>
          <p className="text-slate-400 text-lg">
            Real-time civic crisis dashboard powered by AI
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {STAT_CONFIG.map(({ key, label, icon, color, border, text }) => (
            <div
              key={key}
              className={`glass rounded-xl p-5 bg-gradient-to-br ${color} border ${border}`}
            >
              <div className="text-2xl mb-1">{icon}</div>
              <div className={`text-3xl font-bold ${text}`}>
                {loading ? "—" : stats[key]}
              </div>
              <div className="text-slate-500 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              🗺️ Live Crisis Map
            </h2>
            <span className="text-xs text-slate-500 italic">Toggle markers / heatmap →</span>
          </div>
          <div className="glass rounded-xl overflow-hidden border border-white/5">
            {!loading && <MapView problems={problems} />}
            {loading && (
              <div className="h-[500px] flex items-center justify-center text-slate-600">
                Loading map…
              </div>
            )}
          </div>
        </div>

        {/* Recent Problems */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              🚨 Recent Reports
            </h2>
            <a href="/problems" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="glass rounded-xl h-40 animate-pulse bg-white/3"
                />
              ))}
            </div>
          ) : recentProblems.length === 0 ? (
            <div className="text-center py-20 text-slate-600">
              <div className="text-5xl mb-4">🌐</div>
              <p className="text-lg">No problems reported yet.</p>
              <a
                href="/submit"
                className="inline-block mt-4 btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              >
                Submit the first one
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProblems.map((p) => (
                <ProblemCard
                  key={p._id}
                  problem={p}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
