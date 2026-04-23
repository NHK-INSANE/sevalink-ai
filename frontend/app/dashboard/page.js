"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import Tilt from "react-parallax-tilt";
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

  // Loading State with Skeleton Premium UX
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a]">
        <Navbar />
        <main className="max-w-[1280px] mx-auto px-4 md:px-10 pt-28 pb-20">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-white/10 rounded-2xl w-64 mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl rounded-2xl p-6">
                  <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-white/10 rounded w-1/3"></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[1,2,3].map(i => (
                <div key={i} className="h-64 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl rounded-2xl"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <PageWrapper>
      <main className="max-w-[1280px] mx-auto px-4 md:px-10 pt-28 pb-20">
        
        {/* HERO PARALLAX SECTION */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="animate-float"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight drop-shadow-2xl">
              Command <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Center</span>
            </h1>
            <p className="text-white/60 text-sm md:text-base mt-3 font-medium">
              Synchronized as <span className="text-blue-400">{user?.name}</span>
              {user?.role && <span className="opacity-80 uppercase text-[10px] ml-3 tracking-widest px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">{user.role}</span>}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex w-full md:w-auto gap-4"
          >
            <button
              onClick={handleLocateAndSort}
              className="relative px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium overflow-hidden group backdrop-blur-md"
            >
              <span className="relative z-10 text-sm transition group-hover:text-blue-300">📍 {sortNearest ? "Reset Sort" : "Nearest"}</span>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-white/5 blur-md"></div>
            </button>
            <Link href="/submit">
              <button className="relative px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium overflow-hidden shadow-lg shadow-purple-500/25 group">
                <span className="relative z-10 text-sm drop-shadow-md">Initialize Report</span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-white/20 blur-xl"></div>
              </button>
            </Link>
          </motion.div>
        </div>

        {/* 3D TILT CARDS: INTELLIGENCE LAYER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <Tilt glareEnable={true} glareMaxOpacity={0.1} scale={1.02} tiltMaxAngleX={5} tiltMaxAngleY={5} className="h-full">
            <div className="relative group rounded-2xl overflow-hidden p-[1px] h-full">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/40 to-teal-500/40 blur-xl"></div>
              </div>
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl rounded-2xl p-8 h-full flex justify-between items-center z-10">
                <div>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Neural Core Status</p>
                  <h2 className="text-2xl font-extrabold text-emerald-400 tracking-tight drop-shadow-md">
                    Active & Learning
                  </h2>
                </div>
                <div className="relative">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full animate-ping absolute opacity-75" />
                  <div className="w-4 h-4 bg-emerald-400 rounded-full relative shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                </div>
              </div>
            </div>
          </Tilt>

          <Tilt glareEnable={true} glareMaxOpacity={0.1} scale={1.02} tiltMaxAngleX={5} tiltMaxAngleY={5} className="h-full">
            <div className="relative group rounded-2xl overflow-hidden p-[1px] h-full">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-blue-500/30 blur-xl"></div>
              </div>
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl rounded-2xl p-8 h-full z-10">
                <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-widest drop-shadow-md">System Insights</h3>
                <ul className="space-y-4">
                  {[
                    { icon: "🚨", text: `${criticalCount} Critical events detected` },
                    { icon: "🧑‍🤝‍🧑", text: `${progressCount} Active deployments` },
                    { icon: "📍", text: "Zone 4 high-risk identified" }
                  ].map((insight, i) => (
                    <li key={i} className="flex items-center gap-4 text-sm text-white/70 font-medium">
                      <span className="text-lg drop-shadow-md">{insight.icon}</span>
                      {insight.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Tilt>

          <Tilt glareEnable={true} glareMaxOpacity={0.1} scale={1.02} tiltMaxAngleX={5} tiltMaxAngleY={5} className="h-full">
            <div className="relative group rounded-2xl overflow-hidden p-[1px] h-full">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-orange-500/30 blur-xl"></div>
              </div>
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl rounded-2xl p-8 h-full z-10">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-5">Regional Pressure Index</p>
                <div className="space-y-4">
                  <div className="h-3 rounded-full bg-black/40 border border-white/5 overflow-hidden relative shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "78%" }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">High Intensity</span>
                    <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded backdrop-blur-sm">78%</span>
                  </div>
                </div>
              </div>
            </div>
          </Tilt>
        </div>

        {/* SPOTLIGHT STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Problems", value: counts.total, color: "from-blue-500/40" },
            { label: "Volunteers", value: counts.volunteers, color: "from-purple-500/40" },
            { label: "Field Workers", value: counts.workers, color: "from-emerald-500/40" },
            { label: "Partner NGOs", value: counts.ngos, color: "from-orange-500/40" }
          ].map((stat, i) => (
            <div key={i} className="relative group rounded-2xl overflow-hidden p-[1px]">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} to-transparent blur-xl`}></div>
              </div>
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl p-6 z-10 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">{stat.label}</p>
                <p className="text-4xl font-extrabold text-white drop-shadow-lg">
                  <Counter value={stat.value} />
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* APPLE STYLE ANALYTICS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="relative group rounded-3xl overflow-hidden p-[1px]">
             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-white/10 to-transparent blur-md"></div>
             <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-8 h-full z-10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 drop-shadow-sm">📈 Problem Flow</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-white/80 text-sm font-medium">Open Issues</span>
                  <span className="font-bold text-blue-400 text-xl drop-shadow-md">{openCount}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-white/80 text-sm font-medium">In Progress</span>
                  <span className="font-bold text-yellow-400 text-xl drop-shadow-md">{progressCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm font-medium">Resolved Cases</span>
                  <span className="font-bold text-emerald-400 text-xl drop-shadow-md">{resolvedCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group rounded-3xl overflow-hidden p-[1px] lg:col-span-1">
             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-white/10 to-transparent blur-md"></div>
             <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-8 h-full z-10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 drop-shadow-sm">📊 Distribution</h3>
              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {categoryData.length === 0 ? (
                  <p className="text-xs text-white/50 text-center py-12">No categorized data yet</p>
                ) : categoryData.map(c => (
                  <div key={c.name} className="flex justify-between items-center pb-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 -mx-2 rounded transition">
                    <span className="text-sm text-white font-medium truncate drop-shadow-sm">{c.name}</span>
                    <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30 backdrop-blur-sm">{c.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative group rounded-3xl overflow-hidden p-[1px]">
             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-white/10 to-transparent blur-md"></div>
             <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-8 h-full z-10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 drop-shadow-sm">⚡ Urgency Matrix</h3>
              <div className="space-y-5">
                {[
                  { name: "Critical", count: criticalCount, color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" },
                  { name: "High", count: highCount, color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" },
                  { name: "Medium", count: mediumCount, color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30" },
                  { name: "Low", count: lowCount, color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
                ].map(u => (
                  <div key={u.name} className="flex items-center justify-between hover:bg-white/5 px-2 -mx-2 py-1 rounded transition">
                    <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-md border backdrop-blur-sm ${u.color} ${u.bg} ${u.border}`}>{u.name}</span>
                    <span className="text-xl font-bold text-white drop-shadow-md">{u.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MAP SECTION PREMIUM */}
        <div className="relative rounded-[2.5rem] overflow-hidden p-[1px] mb-16 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50"></div>
          <div className="relative bg-[#0b0f1a] rounded-[2.5rem] overflow-hidden">
            <div className="absolute top-8 left-8 z-10 pointer-events-none">
              <h2 className="text-xs font-bold text-white uppercase tracking-[0.2em] bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-lg shadow-black/50">
                Live Operation Map
              </h2>
            </div>
            <div className="h-[450px] sm:h-[600px] w-full relative">
              <MapView 
                problems={problems} 
                type="problems" 
                height="100%" 
                zoom={6} 
                center={[22.3, 87.3]}
              />
              {/* Vignette effect for depth */}
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10"></div>
            </div>
          </div>
        </div>

        {/* RECENT REPORTS */}
        <div className="space-y-10">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
              {sortNearest ? "📍 Nearest Solutions" : "🕒 Recent Reports"}
            </h2>
            <Link href="/problems" className="text-blue-400 text-sm font-bold uppercase tracking-widest hover:text-white transition-colors">View All Archive →</Link>
          </div>

          {problems.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-20 text-center flex flex-col items-center shadow-xl">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-4xl mb-8 shadow-inner border border-white/5">📂</div>
              <p className="text-white font-bold text-2xl drop-shadow-md">No active reports found</p>
              <p className="text-white/50 text-base mt-3 max-w-md">The platform is currently clear. Any new reports will appear here in real-time.</p>
              <Link href="/submit">
                <button className="relative px-8 py-3 mt-8 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium overflow-hidden shadow-lg shadow-purple-500/25 group">
                  <span className="relative z-10">Submit Report</span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-white/20 blur-xl"></div>
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedProblems.slice(0, 6).map((p) => (
                <div key={p._id} className="relative group rounded-3xl overflow-hidden p-[1px]">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-b from-white/20 to-transparent blur-md"></div>
                  <div className="relative bg-[#0b0f1a] rounded-3xl h-full z-10">
                    <ProblemCard problem={p} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      </PageWrapper>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-[60]">
        <Link href="/submit">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-2xl shadow-purple-500/40 overflow-hidden group border border-white/20"
            title="New Report"
          >
            <span className="relative z-10 text-2xl drop-shadow-md">➕</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 bg-white/20 blur-lg"></div>
          </motion.button>
        </Link>
      </div>
    </div>
  );
}
