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
import { useRouter } from "next/navigation";

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
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard</h1>
              <p className="text-[#9CA3AF] text-[13px] mt-1 font-medium tracking-wide flex items-center gap-2">
                <span>Logged in as <span className="text-white">{user?.name || "User"}</span></span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-gray-300 font-bold">
                  {user?.role ? (user.role.toLowerCase() === 'citizen' ? 'User' : user.role) : 'User'}
                </span>
                {lastUpdate && <span className="text-gray-600">· {lastUpdate}</span>}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <button
                onClick={handleLocateAndSort}
                className="btn-secondary !text-xs !px-5 !py-2"
              >
                {sortNearest ? "Reset Sort" : "Nearest"}
              </button>
              <Link href="/submit">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary !text-xs !px-5 !py-2 flex items-center gap-2"
                  style={{ boxShadow: "0 0 20px rgba(99,102,241,0.35)" }}
                >
                  <span className="text-base leading-none">+</span>
                  Initialize Report
                </motion.button>
              </Link>
            </motion.div>
          </div>

          <div className="flex flex-col gap-4">
            {/* ── TOP STATS ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {[
                { label: "Total Problems",  value: counts.total      },
                { label: "Volunteers",      value: counts.volunteers  },
                { label: "Field Workers",   value: counts.workers     },
                { label: "Partner NGOs",    value: counts.ngos        },
              ].map((s, i) => (
                <div key={i} className="card">
                  <p className="text-[11px] tracking-[0.08em] text-[#9CA3AF] mb-2">{s.label}</p>
                  <p className="text-[20px] font-semibold text-white leading-none"><Counter value={s.value} /></p>
                </div>
              ))}
            </motion.div>

            {/* ── MAIN SECTION ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            >
              {/* LEFT COLUMN */}
              <div className="flex flex-col gap-4">
                {/* Problem Flow */}
                <div className="card">
                  <p className="text-[11px] tracking-[0.08em] text-[#9CA3AF] mb-4">Problem Flow</p>
                  <div className="space-y-2">
                    {[
                      { label: "Open Issues", val: openCount,     dot: "bg-red-400"    },
                      { label: "In Progress", val: progressCount, dot: "bg-yellow-400" },
                      { label: "Resolved",    val: resolvedCount, dot: "bg-green-400"  },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                          <span className="text-[13px] text-gray-300">{r.label}</span>
                        </div>
                        <span className="text-[13px] font-medium text-white">{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Urgency Matrix */}
                <div className="card">
                  <p className="text-[11px] tracking-[0.08em] text-[#9CA3AF] mb-4">Urgency Matrix</p>
                  <div className="space-y-3">
                    {[
                      { label: "Critical", count: criticalCount, bar: "bg-red-500",    text: "text-red-400"    },
                      { label: "High",     count: highCount,     bar: "bg-orange-500", text: "text-orange-400" },
                      { label: "Medium",   count: mediumCount,   bar: "bg-yellow-500", text: "text-yellow-400" },
                      { label: "Low",      count: lowCount,      bar: "bg-green-500",  text: "text-green-400"  },
                    ].map(u => (
                      <div key={u.label} className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider w-12 shrink-0 ${u.text}`}>{u.label}</span>
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${u.bar} opacity-70`}
                            style={{ width: `${Math.min((u.count / (problems.length || 1)) * 100, 100)}%` }} />
                        </div>
                        <span className="text-[13px] font-medium text-white w-5 text-right">{u.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE (WIDE) */}
              <div className="card lg:col-span-2">
                <p className="text-[11px] tracking-[0.08em] text-[#9CA3AF] mb-4">Category Distribution</p>
                <div className="space-y-2">
                  {categoryData.length === 0 ? (
                    <p className="text-[13px] text-gray-600 py-4">No data yet</p>
                  ) : categoryData.map(c => (
                    <div key={c.name} className="grid grid-cols-[120px_1fr_50px] items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-[13px] text-gray-300 truncate">{c.name}</span>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden w-full">
                        <div className="h-full bg-purple-500/60 rounded-full" style={{ width: `${c.percent}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-500 text-right">{c.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── LIVE MAP ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}
              className="card p-0 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 bg-[#0f172a]/50">
                <div>
                  <p className="text-[13px] font-semibold text-white">Live Operations Map</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">{problems.length} active incidents</p>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] text-green-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="h-[320px] w-full rounded-b-[10px] overflow-hidden relative z-0">
                <MapView problems={problems} type="problems" height="100%" zoom={6} center={[22.3, 87.3]} />
              </div>
            </motion.div>

            {/* ── FEATURED: ADD NEW REPORT ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.28 }}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white tracking-tight">Featured</h2>
                <Link href="/problems" className="text-purple-400 text-xs font-medium hover:text-purple-300 transition-colors">
                  Browse All →
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* CTA Card */}
                <Link href="/submit" className="block group">
                  <motion.div
                    whileHover={{ scale: 1.015, y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    className="relative card overflow-hidden cursor-pointer h-full min-h-[160px] flex flex-col justify-between"
                    style={{
                      background: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 100%)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      boxShadow: "0 0 40px rgba(99,102,241,0.12) inset"
                    }}
                  >
                    {/* Glow orb */}
                    <div
                      className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
                      style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
                    />
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <p className="text-white font-semibold text-sm mb-1">Submit New Report</p>
                      <p className="text-[#9CA3AF] text-[12px] leading-relaxed">
                        Flag a crisis in your area. AI instantly classifies urgency and alerts nearby responders.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold mt-5 group-hover:gap-3 transition-all">
                      Initialize Report
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.div>
                </Link>

                {/* Top 2 critical/high featured problems */}
                {(() => {
                  const featured = [...problems]
                    .filter(p => p.urgency === "Critical" || p.urgency === "High")
                    .sort((a, b) => (a.urgency === "Critical" ? -1 : 1))
                    .slice(0, 2);
                  if (featured.length === 0) {
                    return (
                      <div className="card lg:col-span-2 flex items-center justify-center py-8">
                        <p className="text-gray-600 text-[13px]">No critical or high-urgency reports at this time.</p>
                      </div>
                    );
                  }
                  return featured.map(p => (
                    <Link key={p._id} href={`/problems`} className="block group">
                      <motion.div
                        whileHover={{ scale: 1.015, y: -2 }}
                        whileTap={{ scale: 0.985 }}
                        className="card h-full min-h-[160px] flex flex-col justify-between cursor-pointer transition-all"
                        style={{
                          border: p.urgency === "Critical"
                            ? "1px solid rgba(239,68,68,0.2)"
                            : "1px solid rgba(249,115,22,0.2)",
                          background: p.urgency === "Critical"
                            ? "linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(15,23,42,0.9) 100%)"
                            : "linear-gradient(135deg, rgba(249,115,22,0.07) 0%, rgba(15,23,42,0.9) 100%)"
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                p.urgency === "Critical"
                                  ? "bg-red-500/15 text-red-400"
                                  : "bg-orange-500/15 text-orange-400"
                              }`}
                            >
                              {p.urgency}
                            </span>
                            <span className="text-[10px] text-gray-600 uppercase tracking-wider">{p.category?.[0] || p.category || "Uncategorized"}</span>
                          </div>
                          <p className="text-white text-[13px] font-semibold leading-snug line-clamp-2 mb-2">{p.title}</p>
                          <p className="text-gray-500 text-[11px] leading-relaxed line-clamp-2">{p.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-[10px] text-gray-600">
                            {p.location?.address ? p.location.address.split(",").slice(0, 2).join(",") : "Location unavailable"}
                          </span>
                          <span className={`text-[10px] font-semibold group-hover:opacity-80 transition-opacity ${
                            p.urgency === "Critical" ? "text-red-400" : "text-orange-400"
                          }`}>
                            View →
                          </span>
                        </div>
                      </motion.div>
                    </Link>
                  ));
                })()}
              </div>
            </motion.div>

            {/* ── RECENT REPORTS ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.34 }}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  {sortNearest ? "Nearest Problems" : "Recent Reports"}
                </h2>
                <Link href="/problems" className="text-purple-400 text-xs font-medium hover:text-purple-300 transition-colors">
                  View All →
                </Link>
              </div>

              {problems.length === 0 ? (
                <div className="card text-center py-12">
                  <p className="text-white font-medium text-sm">No active reports</p>
                  <p className="text-gray-500 text-xs mt-1">The platform is currently clear.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedProblems.slice(0, 6).map(p => (
                    <ProblemCard key={p._id} problem={p} />
                  ))}
                </div>
              )}
            </motion.div>
          </div>

        </main>
      </PageWrapper>

    </div>
  );
}

