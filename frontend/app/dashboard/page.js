"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import Counter from "../components/Counter";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers } from "../utils/api";
import { getUser } from "../utils/auth";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const MapView = dynamic(() => import("../components/MapView"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900 animate-pulse rounded-xl" />
});

export default function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [sortNearest, setSortNearest] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [counts, setCounts] = useState({ total: 0, volunteers: 0, workers: 0, ngos: 0 });
  const prevCriticalRef = useRef(0);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const fetchProblems = async () => {
    try {
      setError(null);
      const data = await getProblems();
      const newCritical = data.filter((p) => p.urgency === "Critical").length;
      if (prevCriticalRef.current > 0 && newCritical > prevCriticalRef.current) {
        toast("🚨 New critical issue reported!", {
          icon: "⚠️",
          style: { background: "#1e1e2e", color: "#f87171", border: "1px solid #ef444440" },
          duration: 5000,
        });
      }
      prevCriticalRef.current = newCritical;
      setProblems(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      setError("Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsersList(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProblems();
    fetchUsers();
    
    // 🌐 Socket.IO Real-time Logic
    const socket = io(API_BASE);
    
    socket.on("connect", () => console.log("Connected to SevaLink Real-time Engine ⚡"));
    
    socket.on("new-problem", (newProb) => {
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
      setLastUpdate(new Date().toLocaleTimeString());
    });

    socket.on("emergency-alert", (prob) => {
      toast.error(`🚨 EMERGENCY: ${prob.title}`, {
        duration: 8000,
        position: "top-center",
        style: {
          background: "#ef4444",
          color: "#fff",
          fontWeight: "bold",
          border: "2px solid #fff"
        }
      });
    });

    return () => socket.disconnect();
  }, []);

  const openCount = problems.filter(p => p.status?.toLowerCase() === "open").length;
  const resolvedCount = problems.filter(p => p.status?.toLowerCase() === "resolved").length;
  const progressCount = problems.filter(p => p.status?.toLowerCase() === "in progress" || p.status?.toLowerCase() === "in-progress").length;

  const volunteersCount = usersList.filter(u => u.role?.toLowerCase() === "volunteer").length;
  const workersCount = usersList.filter(u => u.role?.toLowerCase() === "worker").length;
  const ngosCount = usersList.filter(u => u.role?.toLowerCase() === "ngo").length;

  const criticalCount = problems.filter(p => p.urgency?.toLowerCase() === "critical").length;
  const highCount = problems.filter(p => p.urgency?.toLowerCase() === "high").length;
  const mediumCount = problems.filter(p => p.urgency?.toLowerCase() === "medium").length;
  const lowCount = problems.filter(p => p.urgency?.toLowerCase() === "low").length;

  const categoryCount = {};
  problems.forEach(p => {
    const cat = p.category || "Other";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const totalProblems = problems.length || 1;
  const categoryData = Object.keys(categoryCount).map(cat => ({
    name: cat,
    value: categoryCount[cat],
    percent: ((categoryCount[cat] / totalProblems) * 100).toFixed(1)
  })).sort((a, b) => b.value - a.value);

  // 🔢 Live Counter Animation Logic
  useEffect(() => {
    const target = {
      total: problems.length,
      volunteers: volunteersCount,
      workers: workersCount,
      ngos: ngosCount
    };
    
    const interval = setInterval(() => {
      setCounts(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(target).forEach(k => {
          if (prev[k] < target[k]) {
            next[k] = Math.min(prev[k] + Math.ceil(target[k] / 20), target[k]);
            changed = true;
          } else if (prev[k] > target[k]) {
            next[k] = target[k];
            changed = true;
          }
        });
        if (!changed) clearInterval(interval);
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [problems.length, volunteersCount, workersCount, ngosCount]);

  const handleLocateAndSort = async () => {
    if (sortNearest) {
      setSortNearest(false);
      return;
    }
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortNearest(true);
      toast.success("Sorting by distance");
    } catch (err) {
      toast.error("Location permission required");
    }
  };

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  const sortedProblems = sortNearest && userLoc
    ? [...problems].sort((a, b) => {
        const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
        const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
        return d1 - d2;
      })
    : problems;

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617]">
        <Navbar />
        <main className="page-container">
          <div className="animate-pulse space-y-6">
            <div className="h-7 bg-white/5 rounded w-40 mb-8" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="card h-24" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {[1,2,3].map(i => <div key={i} className="card h-52" />)}
            </div>
            <div className="card h-[400px]" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />

      <PageWrapper>
        <main className="page-container">

          {/* ── PAGE HEADER ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Command Center</h1>
              <p className="text-gray-500 text-sm mt-1">
                Logged in as <span className="text-gray-300">{user?.name}</span>
                {user?.role && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/8 text-gray-400">
                    {user.role}
                  </span>
                )}
                {lastUpdate && <span className="ml-2 text-[10px] text-gray-600">· {lastUpdate}</span>}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="flex items-center gap-2">
              <button onClick={handleLocateAndSort} className="btn-secondary text-sm">
                📍 {sortNearest ? "Reset Sort" : "Nearest"}
              </button>
              <Link href="/submit">
                <button className="btn-primary text-sm">+ Initialize Report</button>
              </Link>
            </motion.div>
          </div>

          {/* ── KPI CARDS ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {[
              { label: "Total Problems",  value: counts.total,      icon: "🗂" },
              { label: "Volunteers",      value: counts.volunteers,  icon: "🤝" },
              { label: "Field Workers",   value: counts.workers,     icon: "🔧" },
              { label: "Partner NGOs",    value: counts.ngos,        icon: "🏢" },
            ].map((s, i) => (
              <div key={i} className="card flex items-start gap-4">
                <span className="text-2xl mt-0.5">{s.icon}</span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-white leading-none"><Counter value={s.value} /></p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── ANALYTICS ROW ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6"
          >
            {/* Problem Flow */}
            <div className="card">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-5">Problem Flow</p>
              <div className="space-y-3">
                {[
                  { label: "Open Issues",    val: openCount,     dot: "bg-red-400" },
                  { label: "In Progress",    val: progressCount, dot: "bg-yellow-400" },
                  { label: "Resolved",       val: resolvedCount, dot: "bg-green-400" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                      <span className="text-sm text-gray-300">{r.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribution */}
            <div className="card">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-5">Category Distribution</p>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {categoryData.length === 0 ? (
                  <p className="text-xs text-gray-600 py-4">No data yet</p>
                ) : categoryData.map(c => (
                  <div key={c.name} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm text-gray-300 flex-1 truncate">{c.name}</span>
                    <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-purple-500/60 rounded-full" style={{ width: `${c.percent}%` }} />
                    </div>
                    <span className="text-[11px] text-gray-500 w-8 text-right">{c.percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgency Matrix */}
            <div className="card">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-5">Urgency Matrix</p>
              <div className="space-y-3">
                {[
                  { label: "Critical", count: criticalCount, bar: "bg-red-500",    text: "text-red-400"    },
                  { label: "High",     count: highCount,     bar: "bg-orange-500", text: "text-orange-400" },
                  { label: "Medium",   count: mediumCount,   bar: "bg-yellow-500", text: "text-yellow-400" },
                  { label: "Low",      count: lowCount,      bar: "bg-green-500",  text: "text-green-400"  },
                ].map(u => (
                  <div key={u.label} className="flex items-center gap-3">
                    <span className={`text-[11px] font-bold uppercase tracking-wider w-14 ${u.text}`}>{u.label}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${u.bar} opacity-70`}
                        style={{ width: `${Math.min((u.count / (problems.length || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-white w-6 text-right">{u.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── LIVE MAP ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}
            className="card p-0 overflow-hidden mb-8"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div>
                <p className="text-sm font-semibold text-white">Live Operations Map</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{problems.length} active incidents</p>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            </div>
            <div className="h-[420px] w-full">
              <MapView problems={problems} type="problems" height="100%" zoom={6} center={[22.3, 87.3]} />
            </div>
          </motion.div>

          {/* ── RECENT REPORTS ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">
                {sortNearest ? "Nearest Problems" : "Recent Reports"}
              </h2>
              <Link href="/problems" className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors">
                View All →
              </Link>
            </div>

            {problems.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-white font-medium">No active reports</p>
                <p className="text-gray-500 text-sm mt-1">The platform is currently clear.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sortedProblems.slice(0, 6).map(p => (
                  <ProblemCard key={p._id} problem={p} />
                ))}
              </div>
            )}
          </motion.div>

        </main>
      </PageWrapper>

      {/* ── FAB ── */}
      <div className="fixed bottom-7 right-7 z-50">
        <Link href="/submit">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="w-13 h-13 flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-600/30 border border-white/15 text-xl"
            title="New Report"
          >
            ＋
          </motion.button>
        </Link>
      </div>
    </div>
  );
}

