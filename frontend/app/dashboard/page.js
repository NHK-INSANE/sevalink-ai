"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import TiltCard from "../components/TiltCard";
import Counter from "../components/Counter";
import PageWrapper from "../components/PageWrapper";
import { getProblems, updateProblemStatus, getUsers } from "../utils/api";
import { getUser } from "../utils/auth";
import { getUserLocation } from "../utils/location";
import { SkeletonCard, SkeletonStats } from "../components/Skeleton";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { io } from "socket.io-client";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const MapView = dynamic(() => import("../components/MapView"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900 animate-pulse rounded-xl" />
});

const STAT_CONFIG = [
  {
    key: "total",
    label: "Total Problems",
    icon: "📊",
    color: "from-indigo-600/20 to-purple-600/20",
    border: "border-indigo-500/20",
    text: "text-indigo-600",
  },
  {
    key: "volunteers",
    label: "Total Volunteers",
    icon: "🤝",
    color: "from-blue-600/20 to-blue-800/10",
    border: "border-blue-500/20",
    text: "text-blue-600",
  },
  {
    key: "workers",
    label: "Total Workers",
    icon: "🔧",
    color: "from-orange-600/20 to-orange-800/10",
    border: "border-orange-500/20",
    text: "text-orange-600",
  },
  {
    key: "ngos",
    label: "Total NGOs",
    icon: "🏢",
    color: "from-emerald-600/20 to-emerald-800/10",
    border: "border-emerald-500/20",
    text: "text-emerald-600",
  },
];

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

  // Category with Percentage logic
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

  const pieData = categoryData.filter(d => d.value > 0);
  
  const urgencyData = [
    { name: "Critical", value: criticalCount, fill: "#ef4444" },
    { name: "High", value: highCount, fill: "#f97316" },
    { name: "Medium", value: mediumCount, fill: "#eab308" },
    { name: "Low", value: lowCount, fill: "#22c55e" },
  ];
  const COLORS = ["#6366f1", "#ec4899", "#8b5cf6", "#14b8a6"];

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

  // Loading State with Skeletons
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-10 mt-16 space-y-12 pt-16">
          <div className="h-12 bg-white/5 rounded-2xl w-64 animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SkeletonStats /> <SkeletonStats /> <SkeletonStats /> <SkeletonStats />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="card h-64 animate-pulse bg-white/5 border-white/5" />
             <div className="card h-64 animate-pulse bg-white/5 border-white/5" />
             <div className="card h-64 animate-pulse bg-white/5 border-white/5" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition duration-300">
      <Navbar />
      
      <PageWrapper>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 space-y-12">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight gradient-text">
              Command Dashboard
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-2 font-medium">
              Synchronized as <span className="text-[var(--primary)]">{user?.name}</span>
              {user?.role && <span className="opacity-60 uppercase text-[10px] ml-2 tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{user.role}</span>}
            </p>
          </div>

          <div className="flex w-full md:w-auto gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLocateAndSort}
              className="btn-secondary !text-xs !px-6"
            >
              📍 {sortNearest ? "Reset Sort" : "Sort by Nearest"}
            </motion.button>
            <Link href="/submit">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-glow !text-xs !px-8 shadow-[0_10px_30px_var(--primary-glow)]"
              >
                + Initialize Report
              </motion.button>
            </Link>
          </div>
        </div>

        {/* AI Intelligence Layer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TiltCard className="!p-8 flex justify-between items-center border-gradient">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Neural Core Status</p>
              <h2 className="text-2xl font-extrabold text-emerald-400 tracking-tight">
                Active & Learning
              </h2>
            </div>
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute" />
              <div className="w-3 h-3 bg-emerald-500 rounded-full relative" />
            </div>
          </TiltCard>

          <TiltCard className="!p-8 border-white/5">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">System Insights</h3>
            <ul className="space-y-3">
              {[
                { icon: "🚨", text: `${problems.filter(p => p.urgency === 'Critical').length} Critical events detected` },
                { icon: "🧑‍🤝‍🧑", text: `${problems.filter(p => p.status === 'In Progress').length} Active deployments` },
                { icon: "📍", text: "Zone 4 high-risk identified" }
              ].map((insight, i) => (
                <li key={i} className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-medium">
                  <span className="opacity-100">{insight.icon}</span>
                  {insight.text}
                </li>
              ))}
            </ul>
          </TiltCard>

          <TiltCard className="!p-8 border-white/5">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Regional Pressure Index</p>
            <div className="space-y-3">
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "78%" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">High Intensity</span>
                <span className="text-[10px] font-bold text-white">78%</span>
              </div>
            </div>
          </TiltCard>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card hover:border-[var(--primary)] group">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Total Problems</p>
            <p className="text-4xl font-bold text-white group-hover:text-[var(--primary)] transition-colors">
              <Counter value={problems.length} />
            </p>
          </div>

          <div className="card hover:border-[var(--primary)] group">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Volunteers</p>
            <p className="text-4xl font-bold text-white group-hover:text-[var(--primary)] transition-colors">
              <Counter value={volunteersCount} />
            </p>
          </div>

          <div className="card hover:border-[var(--primary)] group">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Field Workers</p>
            <p className="text-4xl font-bold text-white group-hover:text-[var(--primary)] transition-colors">
              <Counter value={workersCount} />
            </p>
          </div>

          <div className="card hover:border-[var(--primary)] group">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Partner NGOs</p>
            <p className="text-4xl font-bold text-white group-hover:text-[var(--primary)] transition-colors">
              <Counter value={ngosCount} />
            </p>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="card !p-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-6">📈 Problem Flow</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)] text-sm font-medium">Open Issues</span>
                <span className="font-bold text-blue-400 text-lg">{openCount}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)] text-sm font-medium">In Progress</span>
                <span className="font-bold text-yellow-400 text-lg">{progressCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm font-medium">Resolved Cases</span>
                <span className="font-bold text-emerald-400 text-lg">{resolvedCount}</span>
              </div>
            </div>
          </div>

          <div className="card !p-8 lg:col-span-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-6">📊 Distribution</h3>
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {categoryData.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] text-center py-12">No categorized data yet</p>
              ) : categoryData.map(c => (
                <div key={c.name} className="flex justify-between items-center pb-3 border-b border-[var(--border)] last:border-0">
                  <span className="text-xs text-white font-medium truncate">{c.name}</span>
                  <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full border border-[var(--primary)]/20">{c.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card !p-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-6">⚡ Urgency Matrix</h3>
            <div className="space-y-5">
              {[
                { name: "Critical", count: criticalCount, badge: "badge-critical" },
                { name: "High", count: highCount, badge: "badge-high" },
                { name: "Medium", count: mediumCount, badge: "badge-medium" },
                { name: "Low", count: lowCount, badge: "badge-low" },
              ].map(u => (
                <div key={u.name} className="flex items-center justify-between">
                  <span className={`badge ${u.badge} !text-[10px] !px-4`}>{u.name}</span>
                  <span className="text-lg font-bold text-white">{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="card !p-4 !rounded-[2rem] shadow-2xl overflow-hidden border-white/5 relative">
          <div className="absolute top-8 left-8 z-10">
            <h2 className="text-xs font-bold text-white uppercase tracking-[0.2em] bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
              Live Operation Map
            </h2>
          </div>
          <div className="h-[400px] sm:h-[500px] rounded-[1.5rem] overflow-hidden">
            <MapView 
              problems={problems} 
              type="problems" 
              height="100%" 
              zoom={6} 
              center={[22.3, 87.3]}
            />
          </div>
        </div>

        {/* Recent Reports */}
        <div className="space-y-10">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {sortNearest ? "📍 Nearest Solutions" : "🕒 Recent Reports"}
            </h2>
            <Link href="/problems" className="text-[var(--primary)] text-sm font-bold uppercase tracking-widest hover:text-white transition-colors">View All Archive →</Link>
          </div>

          {problems.length === 0 ? (
            <div className="card !p-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-3xl mb-6">📂</div>
              <p className="text-white font-bold text-xl">No active reports found</p>
              <p className="text-[var(--text-secondary)] text-sm mt-2 max-w-sm">The platform is currently clear. Any new reports will appear here in real-time.</p>
              <Link href="/submit" className="btn-primary mt-8 !px-10">
                Submit Report
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedProblems.slice(0, 6).map((p) => (
                <ProblemCard key={p._id} problem={p} />
              ))}
            </div>
          )}
        </div>
      </main>
      </PageWrapper>

      {/* Floating Action Buttons */}
      <div className="fab">
        <Link 
          href="/submit" 
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 btn-glow text-white flex items-center justify-center rounded-[1.25rem] shadow-[0_10px_40px_var(--primary-glow)] hover:scale-110 active:scale-95 transition text-2xl border border-white/10"
            title="New Report"
          >
            ➕
          </motion.button>
        </Link>
      </div>
    </div>
  );
}
