"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "./components/Navbar";
import ProblemCard from "./components/ProblemCard";
import { getProblems, updateProblemStatus } from "./utils/api";
import { getUser } from "./utils/auth";
import { getUserLocation } from "./utils/location";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

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
    text: "text-indigo-300",
  },
  {
    key: "critical",
    label: "Critical",
    icon: "🔴",
    color: "from-red-600/20 to-red-800/10",
    border: "border-red-500/20",
    text: "text-red-300",
  },
  {
    key: "high",
    label: "High Priority",
    icon: "🟠",
    color: "from-orange-600/20 to-orange-800/10",
    border: "border-orange-500/20",
    text: "text-orange-300",
  },
  {
    key: "resolved",
    label: "Resolved",
    icon: "✅",
    color: "from-emerald-600/20 to-emerald-800/10",
    border: "border-emerald-500/20",
    text: "text-emerald-300",
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
    const interval = setInterval(() => {
      fetchProblems();
      fetchUsers();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const openCount = problems.filter(p => p.status === "Open").length;
  const resolvedCount = problems.filter(p => p.status === "Resolved").length;
  const progressCount = problems.filter(p => p.status === "In Progress").length;

  const foodCount = problems.filter(p => p.category === "Food Supply").length;
  const medicalCount = problems.filter(p => p.category === "Medical Aid").length;
  const eduCount = problems.filter(p => p.category === "Education").length;
  const otherCount = problems.length - (foodCount + medicalCount + eduCount);

  const criticalCount = problems.filter(p => p.urgency === "Critical").length;
  const highCount = problems.filter(p => p.urgency === "High").length;
  const mediumCount = problems.filter(p => p.urgency === "Medium").length;
  const lowCount = problems.filter(p => p.urgency === "Low").length;

  const pieData = [
    { name: "Food", value: foodCount },
    { name: "Medical", value: medicalCount },
    { name: "Education", value: eduCount },
    { name: "Other", value: Math.max(0, otherCount) },
  ].filter(d => d.value > 0);
  
  const urgencyData = [
    { name: "Critical", value: criticalCount, fill: "#ef4444" },
    { name: "High", value: highCount, fill: "#f97316" },
    { name: "Medium", value: mediumCount, fill: "#eab308" },
    { name: "Low", value: lowCount, fill: "#22c55e" },
  ];
  const COLORS = ["#6366f1", "#ec4899", "#8b5cf6", "#14b8a6"];

  if (loading) {
    return (
      <div className="min-h-screen premium-bg text-white">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-pulse flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Initializing System...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen premium-bg text-white">
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
            const val = s.key === "total" ? problems.length : 
                        s.key === "critical" ? criticalCount :
                        s.key === "high" ? highCount : resolvedCount;
            return (
              <div key={s.key} className="premium-card p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{s.icon}</span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                </div>
                <h2 className="text-2xl font-bold">{val}</h2>
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

          <div className="premium-card p-6 rounded-2xl flex flex-col items-center">
            <h3 className="font-bold mb-2 self-start text-sm uppercase tracking-widest text-slate-500">Categories</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData.length > 0 ? pieData : [{name: "None", value: 1}]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {(pieData.length > 0 ? pieData : [1]).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="premium-card p-6 rounded-2xl flex flex-col justify-center">
            <h3 className="font-bold mb-2 text-sm uppercase tracking-widest text-slate-500">Urgency Distribution</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer>
                <BarChart data={urgencyData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {urgencyData.map((e, index) => <Cell key={index} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-slate-400">No reports to display active areas 🚫</p>
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
