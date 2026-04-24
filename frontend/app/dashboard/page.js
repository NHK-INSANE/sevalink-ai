"use client";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getUser } from "../utils/auth";
import { getProblems, getUsers, getStats } from "../utils/api";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import ProblemCard from "../components/ProblemCard";
import VolunteerDashboard from "../components/dashboards/VolunteerDashboard";
import AdminDashboard from "../components/dashboards/AdminDashboard";
import NgoDashboard from "../components/dashboards/NgoDashboard";
import { motion } from "framer-motion";
import { getUserLocation } from "../utils/location";

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
    
    const socket = io(API_BASE);
    socket.on("new-problem", (newProb) => {
      if (!newProb?._id) return;
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
    });

    return () => socket.disconnect();
  }, []);

  const safeProblems = Array.isArray(problems) ? problems : [];
  const safeUsers = Array.isArray(usersList) ? usersList : [];

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
  const categoryData = Object.keys(categoryCount).map(cat => ({
    name: cat,
    value: categoryCount[cat],
    percent: ((categoryCount[cat] / totalProblems) * 100).toFixed(1)
  })).sort((a, b) => b.value - a.value);

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
  const recentProblems = sortedProblems.slice(0, 6);

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
        <main className="page-wrapper pt-[120px] pb-32">
          
          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 px-2">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Command Dashboard
              </h1>
              <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  System Live
                </div>
                <span className="w-px h-3 bg-white/10" />
                <span className="text-indigo-400">{user?.role || "Guest Observer"}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleLocateAndSort} className="btn-secondary !text-[11px] !px-6 !py-3 !rounded-xl border-white/5 bg-white/5 hover:bg-white/10">
                {sortNearest ? "Reset Filter" : "Sort by Nearest"}
              </button>
              <Link href="/submit" className="btn-primary !text-[11px] !px-6 !py-3 !rounded-xl shadow-lg shadow-indigo-500/20">
                Report Incident
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
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
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
              { label: "Active Reports", value: counts.total, icon: "📡" },
              { label: "Total Helpers",  value: counts.volunteers, icon: "🤝" },
              { label: "NGO Partners",   value: counts.ngos, icon: "🏢" },
              { label: "Field Staff",    value: counts.workers, icon: "🛠️" },
            ].map((s, i) => (
              <div key={i} className="card group hover:border-indigo-500/30 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{s.label}</p>
                  <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{s.icon}</span>
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
            <div className="card">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-8">Operational Flow</h3>
              <div className="space-y-6">
                {[
                  { label: "Unassigned",  val: openCount,     dot: "bg-red-500",    color: "text-red-400" },
                  { label: "In Progress", val: progressCount, dot: "bg-yellow-500", color: "text-yellow-400" },
                  { label: "Resolved",    val: resolvedCount, dot: "bg-emerald-500", color: "text-emerald-400" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full ${r.dot} shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:scale-125 transition-transform`} />
                      <span className="text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">{r.label}</span>
                    </div>
                    <span className={`text-xl font-bold ${r.color}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="card lg:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-8">Incident Categories</h3>
              <div className="space-y-5">
                {categoryData.length === 0 ? (
                   <p className="text-xs text-gray-600 text-center py-10 italic">Awaiting data...</p>
                ) : categoryData.slice(0, 5).map(c => (
                  <div key={c.name} className="space-y-2 group">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-gray-400 group-hover:text-gray-200 transition-colors truncate">{c.name}</span>
                      <span className="text-[10px] font-black text-indigo-400">{c.percent}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out" 
                        style={{ width: `${c.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── ROLE-SPECIFIC SECTION ── */}
          <div className="mb-16">
            {renderRoleSpecific()}
          </div>

          {/* ── LIVE MAP ── */}
          <div className="space-y-6 mb-20 px-2">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Live Operations Map</h2>
                <p className="text-sm text-gray-500 font-medium max-w-lg leading-relaxed">Real-time geospatial tracking of all reported crisis points and field activity across the sector.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-5 bg-white/5 backdrop-blur-2xl px-5 py-2.5 rounded-2xl border border-white/10">
                {[
                  { label: "Critical", dot: "bg-red-500" },
                  { label: "High",     dot: "bg-orange-500" },
                  { label: "Medium",   dot: "bg-yellow-500" },
                  { label: "Low",      dot: "bg-green-500" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${l.dot} shadow-[0_0_8px_rgba(255,255,255,0.1)]`} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card !p-0 overflow-hidden border-white/10 shadow-2xl rounded-[32px] group">
              <div className="h-[600px] grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700">
                <MapView problems={safeProblems} type="problems" height="100%" zoom={6} center={[22.3, 87.3]} />
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
              <Link href="/problems" className="group flex items-center gap-2 text-indigo-400 text-sm font-bold">
                View Archive 
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
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
