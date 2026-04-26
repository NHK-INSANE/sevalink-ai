"use client";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser } from "../utils/auth";
import { getProblems, getUsers, getStats } from "../utils/api";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import ProblemCard from "../components/ProblemCard";
import VolunteerDashboard from "../components/dashboards/VolunteerDashboard";
import AdminDashboard from "../components/dashboards/AdminDashboard";
import NgoDashboard from "../components/dashboards/NgoDashboard";
import { motion, AnimatePresence } from "framer-motion";
import { getUserLocation } from "../utils/location";
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import LiveLegend from "../components/LiveLegend";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const MapView = dynamic(() => import("../components/MapView"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900 animate-pulse rounded-xl" />
});

function SkeletonStats() {
  return (
    <div className="card h-28 flex flex-col justify-center gap-3">
      <div className="h-2 w-16 bg-white/5 rounded-full" />
      <div className="h-8 w-24 bg-white/5 rounded-lg" />
    </div>
  );
}

function Counter({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (start === end) return;
    let totalDuration = 1000;
    let increment = end / (totalDuration / 16);
    let timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{count}</>;
}

export default function Dashboard() {
  const router = useRouter();
  const [problems, setProblems] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [isLocated, setIsLocated] = useState(false);
  const [mapZoom, setMapZoom] = useState(6);
  const [sortNearest, setSortNearest] = useState(false);
  const [user, setUser] = useState({ role: "volunteer", name: "Guest" });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [counts, setCounts] = useState({ total: 0, volunteers: 0, workers: 0, ngos: 0 });

  const fetchDashboardData = async () => {
    try {
      const [problemData, userData, statsData] = await Promise.all([
        getProblems(),
        getUsers(),
        getStats()
      ]);

      setProblems(Array.isArray(problemData) ? problemData : []);
      setUsersList(Array.isArray(userData) ? userData : []);
      
      const pCount = Array.isArray(problemData) ? problemData.length : 0;
      const uList = Array.isArray(userData) ? userData : [];

      setCounts({
        total: statsData?.problems || pCount,
        volunteers: statsData?.responders || uList.filter(u => String(u?.role || "").toLowerCase() === "volunteer").length,
        workers: statsData?.workers || uList.filter(u => String(u?.role || "").toLowerCase() === "worker").length,
        ngos: statsData?.ngos || uList.filter(u => String(u?.role || "").toLowerCase() === "ngo").length
      });

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("❌ DASHBOARD FETCH ERROR:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Single initialization
    const loggedUser = getUser();
    if (loggedUser) {
      setUser(loggedUser);
    } else {
      setUser({ role: "guest", name: "Guest" });
    }
    
    fetchDashboardData();
    
    
    socket.on("new-problem", (newProb) => {
      if (!newProb?._id) return;
      toast.success(`NEW CRISIS DETECTED: ${newProb.title || "Unknown Incident"}`, {
        duration: 5000,
        position: "top-right",
        style: { background: "#0f172a", color: "#fff", border: "1px solid #ef4444" }
      });
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
    });

    socket.on("escalation", (escalatedProb) => {
      if (!escalatedProb?._id) return;
      toast(`⚠️ CRISIS ESCALATED TO CRITICAL: ${escalatedProb.title}`, {
        duration: 8000,
        icon: '⚠️',
        style: { background: "#7f1d1d", color: "#fff", border: "1px solid #ef4444", fontWeight: "bold" }
      });
      setProblems(prev => prev.map(p => p._id === escalatedProb._id ? escalatedProb : p));
    });

    socket.on("problem-updated", (updatedProb) => {
      setProblems(prev => prev.map(p => p._id === updatedProb._id ? updatedProb : p));
    });

    socket.on("responder_moved", (data) => {
      setUsersList(prev => prev.map(u => 
        u._id === data.id ? { ...u, location: { lat: data.lat, lng: data.lng } } : u
      ));
    });

    socket.on("pre_alert", (data) => {
      toast(`🔮 PREDICTIVE ALERT: ${data.message}`, {
        duration: 10000,
        icon: '🔮',
        style: { background: "#4c1d95", color: "#fff", border: "1px solid #a855f7", fontWeight: "bold" }
      });
    });

    const handleDenied = () => setIsLocated(false);
    window.addEventListener("map-user-denied", handleDenied);

    return () => {
      socket.off("new-problem");
      socket.off("escalation");
      socket.off("problem-updated");
      socket.off("responder_moved");
      socket.off("pre_alert");
      window.removeEventListener("map-user-denied", handleDenied);
    };
  }, []);

  const safeProblems = useMemo(() => Array.isArray(problems) ? problems : [], [problems]);
  const safeUsers = useMemo(() => Array.isArray(usersList) ? usersList : [], [usersList]);

  const openCount = useMemo(() => safeProblems.filter(p => String(p?.status || "").toLowerCase() === "open").length, [safeProblems]);
  const resolvedCount = useMemo(() => safeProblems.filter(p => String(p?.status || "").toLowerCase() === "resolved").length, [safeProblems]);
  const progressCount = useMemo(() => safeProblems.filter(p => {
    const s = String(p?.status || "").toLowerCase();
    return s === "in_progress" || s === "in progress" || s === "in-progress";
  }).length, [safeProblems]);

  const criticalCount = useMemo(() => safeProblems.filter(p => String(p?.severity || p?.urgency || "").toLowerCase() === "critical").length, [safeProblems]);
  const highCount = useMemo(() => safeProblems.filter(p => String(p?.severity || p?.urgency || "").toLowerCase() === "high").length, [safeProblems]);
  const mediumCount = useMemo(() => safeProblems.filter(p => String(p?.severity || p?.urgency || "").toLowerCase() === "medium").length, [safeProblems]);
  const lowCount = useMemo(() => safeProblems.filter(p => String(p?.severity || p?.urgency || "").toLowerCase() === "low").length, [safeProblems]);

  const volunteersCount = useMemo(() => safeUsers.filter(u => String(u?.role || "").toLowerCase() === "volunteer").length, [safeUsers]);
  const workersCount = useMemo(() => safeUsers.filter(u => String(u?.role || "").toLowerCase() === "worker").length, [safeUsers]);
  const ngosCount = useMemo(() => safeUsers.filter(u => String(u?.role || "").toLowerCase() === "ngo").length, [safeUsers]);

  const categoryCount = {};
  safeProblems.forEach(p => {
    const cat = p?.category || "Other";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const totalProblems = safeProblems.length || 1;
  const categoryData = useMemo(() => Object.keys(categoryCount).map(cat => ({
    name: cat,
    value: categoryCount[cat],
    percent: ((categoryCount[cat] / totalProblems) * 100).toFixed(1)
  })).sort((a, b) => b.value - a.value), [categoryCount, totalProblems]);

  // Risk Prediction Engine
  const predictedHotspots = useMemo(() => {
    const zones = {};
    safeProblems.forEach(p => {
      if (!p.location?.lat) return;
      const key = `${Math.round(p.location.lat)},${Math.round(p.location.lng)}`;
      zones[key] = (zones[key] || 0) + 1;
    });
    return Object.entries(zones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [safeProblems]);

  // Dummy data for trend chart
  const trendData = [
    { day: "Mon", cases: 12 },
    { day: "Tue", cases: 18 },
    { day: "Wed", cases: 10 },
    { day: "Thu", cases: 25 },
    { day: "Fri", cases: 30 },
    { day: "Sat", cases: 22 },
    { day: "Sun", cases: openCount },
  ];

  const handleLocateToggle = () => {
    const nextState = !isLocated;
    setIsLocated(nextState);
    window.dispatchEvent(new CustomEvent("map-toggle-user", { detail: { show: nextState } }));
    
    if (nextState) {
      toast.success("Locating system... 📍");
    } else {
      toast("Operations hidden", { icon: "🕶️" });
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

  const sortedProblems = [...safeProblems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentProblems = sortedProblems.slice(0, 3);

  const renderRoleSpecific = () => {
    const role = String(user?.role || "").toLowerCase() || "volunteer";
    if (role === "admin") return <AdminDashboard problems={safeProblems} usersList={safeUsers} lastUpdate={lastUpdate} />;
    if (role === "ngo") return <NgoDashboard problems={safeProblems} usersList={safeUsers} />;
    return <VolunteerDashboard problems={safeProblems} userLoc={userLoc} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B14] text-white pb-24">
        <Navbar />
        <PageWrapper className="pt-28 px-6">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="h-10 bg-white/5 rounded-2xl w-64" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => <SkeletonStats key={i} />)}
            </div>
            <div className="h-[400px] bg-white/5 rounded-3xl" />
          </div>
        </PageWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] pb-24">
      <Navbar />
      
      <PageWrapper>
        <main className="max-w-7xl mx-auto pt-28 px-6 lg:px-8">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                Command Center
              </h1>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  System Online
                </span>
                <span className="w-px h-3 bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{user?.name || "Guest Observer"}</span>
              </div>
            </div>

            <Link href="/submit" className="btn-primary !px-8 !py-4 shadow-xl shadow-purple-500/20">
              Report Incident
            </Link>
          </div>

          {/* GUEST ALERT */}
          {!getUser() && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md"
            >
              <p className="text-sm text-gray-400 font-medium">Viewing as a Guest. Some features like discussion and AI unit assignment are restricted.</p>
              <div className="flex gap-4">
                <Link href="/login" className="text-xs font-bold text-gray-500 hover:text-white transition-colors">Login</Link>
                <Link href="/register" className="btn-secondary !py-2 !px-5 !text-xs">Register</Link>
              </div>
            </motion.div>
          )}

          {/* STATS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Active Reports", value: counts.total, color: "text-purple-400" },
              { label: "Total Helpers",  value: counts.volunteers, color: "text-blue-400" },
              { label: "NGO Partners",   value: counts.ngos, color: "text-emerald-400" },
              { label: "Field Staff",    value: counts.workers, color: "text-orange-400" },
            ].map((s, i) => (
              <div key={i} className="card p-6 !rounded-2xl hover:border-purple-500/30 transition-all group">
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-4">{s.label}</p>
                <p className={`text-4xl font-bold ${s.color} tracking-tight group-hover:scale-105 transition-transform origin-left`}>
                  <Counter value={s.value} />
                </p>
              </div>
            ))}
          </div>

          {/* ANALYTICS & TRENDS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            {/* Operational Flow */}
            <div className="lg:col-span-4 card p-8 !rounded-3xl flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">Operational Status</h3>
                <div className="space-y-4">
                  {[
                    { label: "Critical Priority", value: criticalCount, color: "text-red-500", bg: "bg-red-500/10" },
                    { label: "Active Missions", value: progressCount, color: "text-amber-500", bg: "bg-amber-500/10" },
                    { label: "Resolved Nodes", value: resolvedCount, color: "text-emerald-500", bg: "bg-emerald-500/10" }
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-xs font-medium text-gray-400">{stat.label}</span>
                      <span className={`text-xs font-bold ${stat.color} ${stat.bg} px-2.5 py-1 rounded-lg`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5">
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
                  Last telemetry update: <span className="text-gray-400">{lastUpdate || "Synchronizing..."}</span>
                </p>
              </div>
            </div>

            {/* Main Trend Chart */}
            <div className="lg:col-span-8 card p-8 !rounded-3xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Crisis Trajectory (7 Days)</h3>
                <div className="flex gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.5)]" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Cases</span>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorTrajectory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <Tooltip 
                      contentStyle={{ background: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", fontSize: "11px", fontWeight: "bold" }}
                      itemStyle={{ color: "#a855f7" }}
                    />
                    <Area type="monotone" dataKey="cases" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorTrajectory)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} tick={{dy: 10}} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROLE-SPECIFIC GRID */}
          <div className="mb-12">
            {renderRoleSpecific()}
          </div>

          {/* LIVE OPERATIONS MAP */}
          <div className="card p-4 !rounded-[2rem] overflow-hidden group">
            <div className="p-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Live Grid Overlay</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Real-time Satellite Feed</p>
              </div>
              <button 
                onClick={() => router.push('/map')}
                className="btn-secondary !py-2 !px-5 !text-[10px]"
              >
                Full Screen View
              </button>
            </div>
            <div className="h-[500px] rounded-[1.5rem] overflow-hidden border border-white/5 shadow-inner">
                >
                  🚨 SOS
                </button>
                <button 
                  onClick={handleLocateToggle}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-lg transition-all ${
                    isLocated ? "bg-gray-700 text-gray-300 border-white/10" : "bg-white text-black border-white hover:bg-gray-200"
                  }`}
                >
                  {isLocated ? "Hide Me" : "Locate Me"}
                </button>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              <div className="h-[500px]">
                <MapView 
                  problems={safeProblems} 
                  type="problems" 
                  height="100%" 
                  zoom={userLoc ? 14 : 6} 
                  center={[22.3, 87.3]} 
                  showHeatmap={true} 
                  zoomToUser={true}
                  onZoomChange={setMapZoom}
                />
              </div>
            </div>
          </div>

          {/* ── RECENT ACTIVITY ── */}
          <div className="space-y-10 px-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Recent Activity</h2>
                <p className="text-sm text-gray-500 font-medium">Latest reports from the last 24 hours</p>
              </div>
              <button 
                onClick={() => router.push("/problems")}
                className="group flex items-center gap-2 text-indigo-400 text-sm font-bold hover:underline"
              >
                View All Problems
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recentProblems.length === 0 ? (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-3xl">
                  <p className="text-gray-600 font-medium italic">No recent reports found in this sector.</p>
                </div>
              ) : (
                recentProblems.map((p) => (
                  <ProblemCard key={p._id} problem={p} />
                ))
              )}
            </div>
          </div>
        </main>
      </PageWrapper>
    </div>
  );
}
