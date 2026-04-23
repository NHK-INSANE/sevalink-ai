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

  // Loading State with Skeleton Premium UX
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617]">
        <Navbar />
        <main className="container pt-28 pb-20">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white/5 rounded-md w-48 mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 card"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-64 card"></div>
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
      <main className="container pt-28 pb-20">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Command Center
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Synchronized as <span className="text-white">{user?.name}</span>
              {user?.role && <span className="ml-2 uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-sm bg-white/10 text-gray-300">{user.role}</span>}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex gap-3"
          >
            <button
              onClick={handleLocateAndSort}
              className="btn-secondary"
            >
              📍 {sortNearest ? "Reset Sort" : "Nearest"}
            </button>
            <Link href="/submit">
              <button className="btn-primary">
                Initialize Report
              </button>
            </Link>
          </motion.div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Problems", value: counts.total },
            { label: "Volunteers", value: counts.volunteers },
            { label: "Field Workers", value: counts.workers },
            { label: "Partner NGOs", value: counts.ngos }
          ].map((stat, i) => (
            <div key={i} className="card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-white">
                <Counter value={stat.value} />
              </p>
            </div>
          ))}
        </div>

        {/* ANALYTICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-5">Problem Flow</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-gray-300 text-sm">Open Issues</span>
                <span className="font-semibold text-white">{openCount}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-gray-300 text-sm">In Progress</span>
                <span className="font-semibold text-white">{progressCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Resolved Cases</span>
                <span className="font-semibold text-white">{resolvedCount}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-5">Distribution</h3>
            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {categoryData.length === 0 ? (
                <p className="text-xs text-gray-500 py-6">No data yet</p>
              ) : categoryData.map(c => (
                <div key={c.name} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-gray-300 truncate">{c.name}</span>
                  <span className="text-xs font-medium text-gray-400">{c.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-5">Urgency Matrix</h3>
            <div className="space-y-3">
              {[
                { name: "Critical", count: criticalCount, color: "text-red-400" },
                { name: "High", count: highCount, color: "text-orange-400" },
                { name: "Medium", count: mediumCount, color: "text-yellow-400" },
                { name: "Low", count: lowCount, color: "text-green-400" },
              ].map(u => (
                <div key={u.name} className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-widest ${u.color}`}>{u.name}</span>
                  <span className="text-sm font-semibold text-white">{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAP SECTION */}
        <div className="card p-0 mb-12 overflow-hidden border border-white/10">
          <div className="h-[450px] w-full relative">
            <MapView 
              problems={problems} 
              type="problems" 
              height="100%" 
              zoom={6} 
              center={[22.3, 87.3]}
            />
          </div>
        </div>

        {/* RECENT REPORTS */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {sortNearest ? "Nearest Solutions" : "Recent Reports"}
            </h2>
            <Link href="/problems" className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors">View All →</Link>
          </div>

          {problems.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-white font-medium text-lg">No active reports found</p>
              <p className="text-gray-400 text-sm mt-2">The platform is currently clear.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProblems.slice(0, 6).map((p) => (
                <ProblemCard key={p._id} problem={p} />
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
