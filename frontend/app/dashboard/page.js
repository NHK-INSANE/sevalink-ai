"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import Counter from "../components/Counter";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers, getStats } from "../utils/api";
import { getUser } from "../utils/auth";
import { getUserLocation } from "../utils/location";
import { SkeletonStats } from "../components/Skeleton";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import Link from "next/link";
import AdminDashboard from "../components/dashboards/AdminDashboard";
import NgoDashboard from "../components/dashboards/NgoDashboard";
import VolunteerDashboard from "../components/dashboards/VolunteerDashboard";

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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      setError(null);
      const [problemData, userData, statsData] = await Promise.all([
        getProblems(),
        getUsers(),
        getStats()
      ]);

      console.log("📊 DASHBOARD DATA: Sync Complete");
      
      setProblems(problemData);
      setUsersList(userData);
      
      // Update top counts with real stats from backend
      setCounts({
        total: statsData.problems || problemData.length,
        volunteers: statsData.responders || userData.filter(u => u.role?.toLowerCase() === "volunteer").length,
        workers: statsData.workers || userData.filter(u => u.role?.toLowerCase() === "worker").length,
        ngos: statsData.ngos || userData.filter(u => u.role?.toLowerCase() === "ngo").length
      });

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("❌ DASHBOARD FETCH ERROR:", e);
      setError("Sync failed. Checking connection...");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // 🌐 Socket.IO Real-time Logic
    const socket = io(API_BASE);
    
    socket.on("connect", () => console.log("Connected to SevaLink Real-time Engine [Active]"));
    
    socket.on("new-problem", (newProb) => {
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
      setLastUpdate(new Date().toLocaleTimeString());
    });

    socket.on("emergency-alert", (prob) => {
      toast.error(`ALERT: ${prob.title}`, {
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

  // Live Counter Animation Logic
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
      toast.success("Sorting by distance active");
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

  const renderRoleSpecific = () => {
    const role = user?.role?.toLowerCase();
    if (role === "admin") return <AdminDashboard problems={problems} usersList={usersList} lastUpdate={lastUpdate} />;
    if (role === "ngo") return <NgoDashboard problems={problems} usersList={usersList} />;
    return <VolunteerDashboard problems={problems} userLoc={userLoc} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17]">
        <Navbar />
        <main className="page-wrapper pt-[120px]">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-white/5 rounded-2xl w-64" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <SkeletonStats key={i} />)}
            </div>
            <div className="h-[400px] bg-white/5 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      
      <PageWrapper>
        <main className="page-wrapper pt-[120px] pb-20">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Command Dashboard</h1>
              <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                Operational Status: <span className="text-gray-300">Active</span>
                <span className="mx-2 opacity-20">|</span>
                Role: <span className="text-indigo-400 uppercase text-[10px] font-bold tracking-widest">{user?.role || "Volunteer"}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={handleLocateAndSort} className="btn-apple !text-xs !px-5 !py-2.5">
                Loc: {sortNearest ? "Reset Sort" : "Sort by Nearest"}
              </button>
              <Link href="/submit" className="btn-primary !text-xs !px-5 !py-2.5">Report Crisis</Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
            {[
              { label: "Total Reports",   value: counts.total      },
              { label: "Active Helpers",  value: counts.volunteers  },
              { label: "Field Personnel", value: counts.workers     },
              { label: "Partner NGOs",    value: counts.ngos        },
            ].map((s, i) => (
              <div key={i} className="card group hover:border-indigo-500/30 transition-all duration-300">
                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-500 mb-3 uppercase">{s.label}</p>
                <p className="text-3xl font-bold text-white leading-none group-hover:text-indigo-400 transition-colors">
                  <Counter value={s.value} />
                </p>
              </div>
            ))}
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="card">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-8">Operational Flow</h3>
              <div className="space-y-6">
                {[
                  { label: "Unassigned Reports", val: openCount,     dot: "bg-red-400",     color: "text-red-400" },
                  { label: "In Progress",        val: progressCount, dot: "bg-yellow-400",  color: "text-yellow-400" },
                  { label: "Resolved Cases",     val: resolvedCount, dot: "bg-emerald-400", color: "text-emerald-400" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${r.dot} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                      <span className="text-sm font-medium text-gray-300">{r.label}</span>
                    </div>
                    <span className={`text-lg font-bold ${r.color}`}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card lg:col-span-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-8">Incident Categories</h3>
              <div className="space-y-5">
                {categoryData.length === 0 ? (
                   <p className="text-xs text-gray-600 text-center py-10 italic">No data available</p>
                ) : categoryData.slice(0, 5).map(c => (
                  <div key={c.name} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-gray-400 truncate">{c.name}</span>
                      <span className="text-[10px] font-bold text-indigo-400">{c.percent}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${c.percent}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROLE SPECIFIC EXTENSIONS */}
          <div className="mb-16">
            {renderRoleSpecific()}
          </div>

          {/* Map Section */}
          <div className="space-y-4 mb-16">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Live Operations Map</h3>
                <p className="text-xs text-gray-500 mt-1">Real-time visualization of all active crisis markers</p>
              </div>
              
              {/* CLEAN LEGEND ABOVE MAP */}
              <div className="flex flex-wrap items-center gap-4 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mr-2">Legend</span>
                {[
                  { label: "Critical", dot: "bg-red-500",    count: criticalCount },
                  { label: "High",     dot: "bg-orange-500", count: highCount     },
                  { label: "Medium",   dot: "bg-yellow-500", count: mediumCount   },
                  { label: "Low",      dot: "bg-green-500",  count: lowCount      },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                    <span className="text-[10px] font-bold text-gray-400">{l.label}</span>
                    <span className="text-[10px] font-black text-white/40 ml-0.5">{l.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card !p-0 overflow-hidden border border-white/10 shadow-2xl">
              <div className="h-[500px]">
                <MapView problems={problems} type="problems" height="100%" zoom={6} center={[22.3, 87.3]} />
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {sortNearest ? "Nearest Solutions" : "Recent Activity"}
              </h2>
              <Link href="/problems" className="text-indigo-400 text-sm font-bold hover:text-indigo-300 transition-colors flex items-center gap-1">
                Full Database
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedProblems.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-600 italic">No reports found in this sector.</div>
              ) : (
                sortedProblems.slice(0, 6).map((p) => (
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
