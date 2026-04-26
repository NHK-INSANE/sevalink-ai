"use client";
import { useEffect, useState, useRef, useMemo } from "react";
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
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const MapView = dynamic(() => import("../components/MapView"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900 animate-pulse rounded-[2rem]" />
});

function Counter({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (start === end) { setCount(end); return; }
    let totalDuration = 1000;
    let increment = end / (totalDuration / 16);
    let timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span className="text-white">{count}</span>;
}

export default function Dashboard() {
  const router = useRouter();
  const [problems, setProblems] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [isLocated, setIsLocated] = useState(false);
  const [user, setUser] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [problemData, userData] = await Promise.all([getProblems(), getUsers()]);
      const probs = Array.isArray(problemData) ? problemData : (problemData?.data || []);
      const users = Array.isArray(userData) ? userData : (userData?.data || []);
      
      setProblems(probs);
      setUsersList(users);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Dashboard Sync Error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loggedUser = getUser();
    setUser(loggedUser || { role: "guest", name: "Guest Observer" });
    fetchDashboardData();
    
    socket.on("new-problem", (newProb) => {
      if (!newProb?._id) return;
      toast.success(`NEW CRISIS: ${newProb.title}`, { position: "top-right" });
      setProblems(prev => prev.find(p => p._id === newProb._id) ? prev : [newProb, ...prev]);
    });

    socket.on("escalation", (p) => {
      toast.error(`CRITICAL ESCALATION: ${p.title}`);
      setProblems(prev => prev.map(old => old._id === p._id ? p : old));
    });

    return () => {
      socket.off("new-problem");
      socket.off("escalation");
    };
  }, []);

  const safeProblems = useMemo(() => Array.isArray(problems) ? problems : [], [problems]);
  const safeUsers = useMemo(() => Array.isArray(usersList) ? usersList : [], [usersList]);

  // FINAL POLISH COUNTS (Step 10 + Fixes)
  const stats = useMemo(() => {
    const p = safeProblems;
    return {
      critical: p.filter(x => x.severity?.toLowerCase() === "critical").length,
      high: p.filter(x => x.severity?.toLowerCase() === "high").length,
      medium: p.filter(x => x.severity?.toLowerCase() === "medium").length,
      low: p.filter(x => x.severity?.toLowerCase() === "low").length,
      total: p.length
    };
  }, [safeProblems]);

  const progressCount = safeProblems.filter(p => ["in_progress", "in progress", "in-progress"].includes(p.status?.toLowerCase())).length;
  const resolvedCount = safeProblems.filter(p => p.status?.toLowerCase() === "resolved").length;

  const trendData = [
    { day: "Mon", cases: 12 }, { day: "Tue", cases: 18 }, { day: "Wed", cases: 10 },
    { day: "Thu", cases: 25 }, { day: "Fri", cases: 30 }, { day: "Sat", cases: 22 },
    { day: "Sun", cases: stats.total },
  ];

  const categoryStats = useMemo(() => {
    const counts = {};
    safeProblems.forEach(p => {
       const cat = p.category || "General";
       counts[cat] = (counts[cat] || 0) + 1;
    });
    const total = safeProblems.length || 1;
    // Fix: Percentages sum to 100% properly
    const raw = Object.keys(counts).map(name => ({
      name,
      value: counts[name],
      percent: Math.round((counts[name] / total) * 100)
    })).sort((a,b) => b.value - a.value).slice(0, 5);

    // Normalize last one to ensure 100%
    const sum = raw.reduce((a, b) => a + b.percent, 0);
    if (sum > 0 && sum !== 100 && raw.length > 0) {
       raw[0].percent += (100 - sum);
    }
    return raw;
  }, [safeProblems]);

  const handleLocateToggle = () => {
    const nextState = !isLocated;
    setIsLocated(nextState);
    if (nextState) {
      navigator.geolocation.getCurrentPosition(p => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }));
      toast.success("Locating Terminal... 📍");
    } else {
      setUserLoc(null);
    }
  };

  const renderRoleSpecific = () => {
    const role = user?.role?.toLowerCase() || "volunteer";
    if (role === "admin") return <AdminDashboard problems={safeProblems} usersList={safeUsers} lastUpdate={lastUpdate} />;
    if (role === "ngo") return <NgoDashboard problems={safeProblems} usersList={safeUsers} />;
    return <VolunteerDashboard problems={safeProblems} userLoc={userLoc} />;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080B14] flex items-center justify-center">
      <div className="text-xs font-black uppercase tracking-[0.4em] text-white animate-pulse">Initializing Ops Dashboard...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080B14] text-white pb-24 font-inter">
      <Navbar />
      <PageWrapper>
        <main className="max-w-7xl mx-auto pt-28 px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-8">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Command Center</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Neural Link Active
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{user?.name} | {user?.role}</span>
              </div>
            </div>
            <Link href="/submit" className="btn-primary !px-10 !py-4 shadow-2xl shadow-purple-500/40 !rounded-2xl font-black text-xs uppercase tracking-widest">
              Report Incident
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Critical", value: stats.critical, color: "border-red-500/30" },
              { label: "High Priority", value: stats.high, color: "border-orange-500/30" },
              { label: "Medium", value: stats.medium, color: "border-yellow-500/30" },
              { label: "Low Urgency", value: stats.low, color: "border-emerald-500/30" }
            ].map((s, i) => (
              <div key={i} className={`card !p-8 !rounded-[2.5rem] hover:bg-white/[0.02] transition-all border ${s.color}`}>
                <p className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase mb-4">{s.label}</p>
                <h2 className="text-4xl font-black tracking-tighter"><Counter value={s.value} /></h2>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-4 card !p-8 !rounded-[2.5rem] flex flex-col justify-between bg-white/[0.01]">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Mission Matrix</h3>
                <div className="space-y-3">
                  {[
                    { l: "Ongoing Operations", v: progressCount, c: "text-white", b: "bg-white/5" },
                    { l: "Resolved Nodes", v: resolvedCount, c: "text-white", b: "bg-white/5" },
                    { l: "Total Reports", v: stats.total, c: "text-white", b: "bg-white/5" }
                  ].map(stat => (
                    <div key={stat.l} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{stat.l}</span>
                      <span className={`text-xs font-black ${stat.c} ${stat.b} px-3 py-1 rounded-lg border border-white/10`}>{stat.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-10 space-y-4">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Sector Categories</h3>
                 <div className="grid grid-cols-1 gap-2">
                    {categoryStats.map(c => (
                      <div key={c.name} className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-gray-400 uppercase">{c.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-purple-500" style={{ width: `${c.percent}%` }} />
                          </div>
                          <span className="text-white w-8 text-right">{c.percent}%</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            <div className="lg:col-span-8 card !p-8 !rounded-[2.5rem] bg-white/[0.01]">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">7-Day Tactical Trajectory</h3>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs><linearGradient id="cT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/><stop offset="95%" stopColor="#9333ea" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "10px" }} />
                    <Area type="monotone" dataKey="cases" stroke="#a855f7" strokeWidth={4} fill="url(#cT)" />
                    <XAxis dataKey="day" stroke="#334155" fontSize={10} axisLine={false} tickLine={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mb-12">{renderRoleSpecific()}</div>

          <div className="grid grid-cols-1 gap-12">
            <div className="card p-4 !rounded-[2.5rem] overflow-hidden">
              <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Satellite Grid</h2>
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.25em] mt-1">Live Telemetry Feed</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => router.push('/map')} className="btn-secondary !py-3 !px-8 !text-[10px] !font-black uppercase tracking-widest !rounded-xl">Full Tactical View</button>
                  <button onClick={handleLocateToggle} className={`!py-3 !px-8 !text-[10px] !font-black uppercase tracking-widest !rounded-xl transition-all ${isLocated ? "bg-emerald-600 text-white" : "btn-secondary"}`}>
                    {isLocated ? "GPS Locked" : "Locate Unit"}
                  </button>
                </div>
              </div>
              <div className="h-[500px] border border-white/5 rounded-[2rem] overflow-hidden">
                <MapView problems={safeProblems} type="problems" height="100%" zoom={userLoc ? 15 : 6} center={userLoc ? [userLoc.lat, userLoc.lng] : [22.3, 87.3]} />
              </div>
            </div>
          </div>

        </main>
      </PageWrapper>
    </div>
  );
}
