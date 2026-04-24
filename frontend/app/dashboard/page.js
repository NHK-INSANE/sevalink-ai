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
        volunteers: statsData?.responders || uList.filter(u => u?.role?.toLowerCase() === "volunteer").length,
        workers: statsData?.workers || uList.filter(u => u?.role?.toLowerCase() === "worker").length,
        ngos: statsData?.ngos || uList.filter(u => u?.role?.toLowerCase() === "ngo").length
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

    return () => {
      socket.off("new-problem");
    };
  }, []);

  const safeProblems = useMemo(() => Array.isArray(problems) ? problems : [], [problems]);
  const safeUsers = useMemo(() => Array.isArray(usersList) ? usersList : [], [usersList]);

  const openCount = safeProblems.filter(p => p?.status?.toLowerCase() === "open").length;
  const resolvedCount = safeProblems.filter(p => p?.status?.toLowerCase() === "resolved").length;
  const progressCount = safeProblems.filter(p => p?.status?.toLowerCase() === "in progress" || p?.status?.toLowerCase() === "in-progress").length;

  const volunteersCount = safeUsers.filter(u => u?.role?.toLowerCase() === "volunteer").length;
  const workersCount = safeUsers.filter(u => u?.role?.toLowerCase() === "worker").length;
  const ngosCount = safeUsers.filter(u => u?.role?.toLowerCase() === "ngo").length;

  const criticalCount = safeProblems.filter(p => p?.urgency?.toLowerCase() === "critical").length;
  const highCount = safeProblems.filter(p => p?.urgency?.toLowerCase() === "high").length;
  const mediumCount = safeProblems.filter(p => p?.urgency?.toLowerCase() === "medium").length;
  const lowCount = safeProblems.filter(p => p?.urgency?.toLowerCase() === "low").length;

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

  const handleLocateAndSort = async () => {
    if (sortNearest) {
      setSortNearest(false);
      return;
    }
    try {
      const loc = await getUserLocation();
      if (loc) {
        setUserLoc(loc);
        setSortNearest(true);
        toast.success("Sorting by distance active");
      }
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

  const sortedProblems = [...safeProblems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentProblems = sortedProblems.slice(0, 3);

  const renderRoleSpecific = () => {
    const role = user?.role?.toLowerCase() || "volunteer";
    if (role === "admin") return <AdminDashboard problems={safeProblems} usersList={safeUsers} lastUpdate={lastUpdate} />;
    if (role === "ngo") return <NgoDashboard problems={safeProblems} usersList={safeUsers} />;
    return <VolunteerDashboard problems={safeProblems} userLoc={userLoc} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <Navbar />
        <main className="page-wrapper pt-[120px]">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-white/5 rounded-2xl w-64" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => <SkeletonStats key={i} />)}
            </div>
            <div className="h-[400px] bg-white/5 rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0f1a] to-[#05070d] text-white selection:bg-indigo-500/30">
      <Navbar />
      
      <PageWrapper>
        <main className="page-wrapper pt-10 px-6 lg:px-10 space-y-8 pb-32">
          
          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 px-2 mt-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Command Dashboard
              </h1>
              <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                <div className="flex items-center gap-1.5 font-bold">
                  System Live
                </div>
                <span className="w-px h-3 bg-white/10" />
                <span className="text-indigo-400">{user?.role || "Guest Observer"}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/submit" className="bg-purple-600 hover:bg-purple-700 px-6 py-2.5 rounded-lg text-white font-bold transition-all shadow-lg shadow-purple-500/20">
                Report New Crisis
              </Link>
            </div>
          </div>

          {/* ── GUEST ALERT ── */}
          {!getUser() && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-300 font-medium">Viewing as a Guest. Some features like discussion and AI unit assignment are restricted.</p>
              </div>
              <div className="flex gap-3">
                <Link href="/login" className="px-5 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors">Login</Link>
                <Link href="/register" className="px-5 py-2 text-xs font-bold text-indigo-400 bg-indigo-400/10 rounded-xl hover:bg-indigo-400/20 transition-all">Register</Link>
              </div>
            </motion.div>
          )}

          {/* ── STATS CARDS ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Active Reports", value: counts.total },
              { label: "Total Helpers",  value: counts.volunteers },
              { label: "NGO Partners",   value: counts.ngos },
              { label: "Field Staff",    value: counts.workers },
            ].map((s, i) => (
              <div key={i} className="glass-card hover-premium p-8">
                <div className="mb-4">
                  <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{s.label}</p>
                </div>
                <p className="text-4xl font-bold text-white tracking-tight">
                  <Counter value={s.value} />
                </p>
              </div>
            ))}
          </div>


          {/* ── ANALYTICS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            {/* Operational Flow */}
            <div className="glass-card p-6 border border-white/10">
              <h3 className="mb-4 font-semibold text-white">Operational Flow</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Open</span>
                  <span className="text-red-400 font-bold">{openCount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">In Progress</span>
                  <span className="text-yellow-400 font-bold">{progressCount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Resolved</span>
                  <span className="text-green-400 font-bold">{resolvedCount}</span>
                </div>
              </div>

              <hr className="my-4 border-white/10" />

              <h4 className="mb-2 text-sm text-gray-500 font-semibold uppercase tracking-wider">Urgency Levels</h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Critical</span>
                  <span className="text-red-500 font-bold">{criticalCount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">High</span>
                  <span className="text-orange-400 font-bold">{highCount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Medium</span>
                  <span className="text-yellow-400 font-bold">{mediumCount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Low</span>
                  <span className="text-green-400 font-bold">{lowCount}</span>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="card lg:col-span-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-8">Incident Categories</h3>
              <div className="space-y-5">
                {categoryData.length === 0 ? (
                   <p className="text-xs text-gray-600 text-center py-10 italic">Awaiting data...</p>
                ) : categoryData.slice(0, 4).map(c => (
                  <div key={c.name} className="space-y-2 group">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-gray-400 group-hover:text-gray-200 transition-colors truncate">{c.name}</span>
                      <span className="text-[10px] font-black text-indigo-400">{c.percent}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out" 
                        style={{ width: `${c.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Incident Trend Chart */}
            <div className="card lg:col-span-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-8">Incident Trend (Last 7 Days)</h3>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "10px" }}
                    />
                    <Area type="monotone" dataKey="cases" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCases)" />
                    <XAxis dataKey="day" stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── ROLE-SPECIFIC SECTION ── */}
          <div className="mb-16">
            {renderRoleSpecific()}
          </div>

          {/* ── LIVE MAP ── */}
          <div className="space-y-4 mb-20 px-2">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Live Operations Map</h2>
              <p className="text-sm text-gray-400">
                Real-time visualization of crisis reports, responders, and NGO activity across regions.
              </p>
            </div>

            <div className="mb-2">
              <LiveLegend showCount={false} />
            </div>

            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              <div className="absolute top-4 right-4 flex gap-3 z-[1000]">
                <button 
                  onClick={handleLocateAndSort}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg text-white text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-lg transition-all"
                >
                  {sortNearest ? "Show All" : "Locate Me"}
                </button>
                <button className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2">
                  🚨 SOS
                </button>
              </div>
              <div className="h-[500px]">
                <MapView problems={safeProblems} type="problems" height="100%" zoom={6} center={[22.3, 87.3]} showHeatmap={true} />
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
