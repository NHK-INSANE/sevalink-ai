"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "./components/Navbar";
import ProblemCard from "./components/ProblemCard";
import { getProblems, updateProblemStatus, getUsers } from "./utils/api";
import { getUser } from "./utils/auth";
import { getUserLocation } from "./utils/location";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const MapView = dynamic(() => import("./components/MapView"), { 
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-pulse flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Loading live operational data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <motion.main
        className="max-w-7xl mx-auto px-6 py-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-1">
              Command Dashboard
            </h1>
            <p className="text-slate-400 text-sm">
              Monitoring {problems.length} active crisis reports
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleLocateAndSort}
              className={`premium-btn text-xs ${sortNearest ? 'grayscale' : ''}`}
            >
              📍 {sortNearest ? "Reset Sort" : "Sort by Nearest"}
            </button>
            <a href="/submit" className="premium-btn text-xs bg-indigo-600/20 border border-indigo-500/30">
              + Report New
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {STAT_CONFIG.map((s) => {
            const val = counts[s.key];
            return (
              <div key={s.key} className="premium-card p-5 rounded-2xl border-l-4 border-indigo-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{s.icon}</span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{val}</h2>
              </div>
            );
          })}
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="premium-card p-6 rounded-2xl">
            <h3 className="font-bold mb-4">Problem Flow</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-slate-400 text-sm">Open Issues</span>
                <span className="font-bold text-indigo-400">{openCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-slate-400 text-sm">In Progress</span>
                <span className="font-bold text-yellow-400">{progressCount}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400 text-sm">Resolved Cases</span>
                <span className="font-bold text-emerald-400">{resolvedCount}</span>
              </div>
            </div>
          </div>

          <div className="premium-card p-6 rounded-2xl">
            <h3 className="font-bold mb-4 text-slate-800">Categories</h3>
            <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[200px] pr-2">
              {categoryData.map(c => (
                <div key={c.name} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-600 truncate mr-2">{c.name}</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{c.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card p-6 rounded-2xl">
            <h3 className="font-bold mb-4 text-slate-800">Urgency Distribution</h3>
            <div className="space-y-3">
              {[
                { name: "Critical", count: criticalCount, color: "bg-red-500", text: "text-red-600" },
                { name: "High", count: highCount, color: "bg-orange-500", text: "text-orange-600" },
                { name: "Medium", count: mediumCount, color: "bg-yellow-500", text: "text-yellow-600" },
                { name: "Low", count: lowCount, color: "bg-emerald-500", text: "text-emerald-600" },
              ].map(u => (
                <div key={u.name} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${u.color}`} />
                  <span className="text-sm text-slate-600 flex-1">{u.name}</span>
                  <span className={`text-sm font-bold ${u.text}`}>{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="premium-card p-4 rounded-2xl mb-10">
          <h3 className="font-bold mb-4 flex items-center gap-2">📍 Live Operation Map</h3>
          <div className="h-[400px] rounded-xl overflow-hidden border border-white/10 shadow-inner">
            <MapView 
              problems={problems} 
              type="problems" 
              height="100%" 
              zoom={6} 
              center={[22.3, 87.3]}
            />
          </div>
        </div>

        {/* Recent Problems Section (Now optionally sorted by nearest) */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold italic">
              {sortNearest ? "📍 Nearest Solutions" : "🕒 Recent Reports"}
            </h2>
            <a href="/problems" className="text-indigo-400 text-sm hover:underline">View All →</a>
          </div>

          {problems.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-500 font-medium">No problems yet. Be the first to report 🚀</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProblems.slice(0, 6).map((p) => (
                <ProblemCard key={p._id} problem={p} />
              ))}
            </div>
          )}
        </div>
      </motion.main>
    </div>
  );
}
