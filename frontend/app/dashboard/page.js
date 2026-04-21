"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
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
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-10 mt-16">
          <div className="h-10 bg-gray-100 rounded-xl w-64 mb-8 animate-pulse"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <SkeletonStats /> <SkeletonStats /> <SkeletonStats /> <SkeletonStats />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
             {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-50 rounded-2xl animate-pulse border border-gray-100" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 transition duration-200">
      <Navbar />
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <main className="max-w-7xl mx-auto px-6 pt-24 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              Command Dashboard
            </h1>
            <p className="text-gray-500 text-sm">
              Welcome <span className="font-semibold text-gray-700">{user?.name}</span>
              {user?.role && (
                <> — Signed in as <span className="font-semibold text-blue-600 capitalize">{user.role}</span></>
              )}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleLocateAndSort}
              className={`ripple bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm text-gray-700 transition duration-200 hover:scale-105 active:scale-95 ${sortNearest ? 'grayscale' : ''}`}
            >
              📍 {sortNearest ? "Reset Sort" : "Sort by Nearest"}
            </button>
            <a href="/submit" className="ripple bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 shadow-sm text-sm hover:scale-105 active:scale-95 inline-block">
              + Report New
            </a>
          </div>
        </div>

        {/* Stats Cards (Startup Style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-10">
          <div className="bg-white p-5 rounded-xl shadow border border-gray-100 flex flex-col">
            <p className="text-gray-500 text-sm">Total Problems</p>
            <h2 className="text-2xl font-bold text-blue-600">
              <Counter value={problems.length} />
            </h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow border border-gray-100 flex flex-col">
            <p className="text-gray-500 text-sm">Volunteers</p>
            <h2 className="text-2xl font-bold text-blue-600">
              <Counter value={volunteersCount} />
            </h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow border border-gray-100 flex flex-col">
            <p className="text-gray-500 text-sm">Workers</p>
            <h2 className="text-2xl font-bold text-blue-600">
              <Counter value={workersCount} />
            </h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow border border-gray-100 flex flex-col">
            <p className="text-gray-500 text-sm">NGOs</p>
            <h2 className="text-2xl font-bold text-blue-600">
              <Counter value={ngosCount} />
            </h2>
          </div>
        </div>

        {/* Analytics Section (Clean Startup Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📈 Problem Flow</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">Open Issues</span>
                <span className="font-bold text-blue-500">{openCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">In Progress</span>
                <span className="font-bold text-yellow-500">{progressCount}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 text-sm">Resolved Cases</span>
                <span className="font-bold text-emerald-500">{resolvedCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📊 Categories</h3>
            <div className="flex-1 overflow-y-auto max-h-[180px] space-y-3 pr-1">
              {categoryData.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-10">No data</p>
              ) : categoryData.map(c => (
                <div key={c.name} className="flex justify-between items-center pb-2 border-b border-gray-50 last:border-0 grow">
                  <span className="text-xs text-gray-600 font-medium truncate grow">{c.name}</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ml-2">{c.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">⚡ Urgency</h3>
            <div className="space-y-3">
              {[
                { name: "Critical", count: criticalCount, dot: "bg-red-500", text: "text-red-500" },
                { name: "High", count: highCount, dot: "bg-orange-500", text: "text-orange-500" },
                { name: "Medium", count: mediumCount, dot: "bg-yellow-500", text: "text-yellow-500" },
                { name: "Low", count: lowCount, dot: "bg-green-500", text: "text-green-500" },
              ].map(u => (
                <div key={u.name} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${u.dot}`} />
                  <span className="text-sm text-gray-600 grow">{u.name}</span>
                  <span className={`text-sm font-bold ${u.text}`}>{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl shadow-md p-3 mt-4 mb-10 border border-gray-100 transition duration-200">
          <h3 className="font-bold mb-3 pl-2 flex items-center gap-2 text-gray-800">📍 Live Operation Map</h3>
          <div className="h-[400px] rounded-xl overflow-hidden border border-gray-100">
            <MapView 
              problems={problems} 
              type="problems" 
              height="100%" 
              zoom={6} 
              center={[22.3, 87.3]}
            />
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {sortNearest ? "📍 Nearest Solutions" : "🕒 Recent Reports"}
            </h2>
            <a href="/problems" className="text-blue-600 text-sm hover:underline font-medium">View All →</a>
          </div>

          {problems.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center">
              <span className="text-4xl mb-4 opacity-50">🚀</span>
              <p className="text-gray-900 font-bold text-lg">No problems reported yet</p>
              <p className="text-gray-500 text-sm mt-1">Be the first to report and help your community stay safe.</p>
              <a href="/submit" className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition">
                + Report Your First Crisis
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProblems.slice(0, 6).map((p) => (
                <ProblemCard key={p._id} problem={p} />
              ))}
            </div>
          )}
        </div>
      </main>
      </motion.div>

      {/* Mobile-first Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <a 
          href="/submit" 
          className="ripple bg-blue-600 text-white w-14 h-14 flex items-center justify-center rounded-full shadow-lg hover:scale-110 active:scale-95 transition duration-200 text-2xl"
        >
          ➕
        </a>
      </div>
    </div>
  );
}
