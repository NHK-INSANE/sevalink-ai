"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "./components/Navbar";
import ProblemCard from "./components/ProblemCard";
import { getProblems, updateProblemStatus } from "./utils/api";
import { getUser } from "./utils/auth";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

const MapView = dynamic(() => import("./components/MapView"), { ssr: false });
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
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Map controls

  const [lastUpdate, setLastUpdate] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // 📍 "You are here" pin
  const prevCriticalRef = useRef(0);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const fetchProblems = async () => {
    try {
      setError(null);
      const data = await getProblems();
      // 🚨 Toast if new Critical problems arrive after initial load
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
      setError("Could not connect to backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${BASE_URL}/api/users`);
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
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
    }, 5000); // real-time: every 5s
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id, status) => {
    await updateProblemStatus(id, status);
    setProblems((prev) =>
      prev.map((p) => (p._id === id ? { ...p, status } : p))
    );
  };

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

  const categoryData = [
    { name: "Food", value: foodCount },
    { name: "Medical", value: medicalCount },
    { name: "Education", value: eduCount },
    { name: "Other", value: Math.max(0, otherCount) },
  ].filter(d => d.value > 0);
  
  const pieData = categoryData.length > 0 ? categoryData : [{ name: "No Data", value: 1 }];

  const urgencyData = [
    { name: "Critical", value: criticalCount, fill: "#ef4444" },
    { name: "High", value: highCount, fill: "#f97316" },
    { name: "Medium", value: mediumCount, fill: "#eab308" },
    { name: "Low", value: lowCount, fill: "#22c55e" },
  ];
  
  const COLORS = ["#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#f59e0b"];
  
  const volunteers = usersList.filter(u => u.role?.toLowerCase() === "volunteer");
  const ngos = usersList.filter(u => u.role?.toLowerCase() === "ngo");
  const workers = usersList.filter(u => u.role?.toLowerCase() === "worker");
  
  const volunteerCount = volunteers.length;
  const ngoCount = ngos.length;

  const stats = { total: problems.length };

  const recentProblems = problems.slice(0, 6);







  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <motion.main
        className="max-w-7xl mx-auto px-6 py-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Hero */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
          
          {/* LEFT SIDE */}
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Welcome, {user ? (user.name || user.email?.split("@")[0]) : "Command Center"} 👋
              </span>
            </h1>
            <p className="text-slate-400 text-base lg:text-lg mb-1">
              Signed in as <span className="font-semibold text-slate-300">{user?.role || "User"}</span>
            </p>
            {user?.role === "Volunteer" && (
              <p className="text-slate-400 text-sm mb-1">
                Skill: <span className="text-indigo-300 font-medium">{user.skill || "Not added"}</span>
              </p>
            )}

            {/* Smart Touch */}
            {user?.role === "Volunteer" && (
              <p className="text-emerald-400 text-sm font-medium mt-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block">
                💡 You can help solve problems below
              </p>
            )}
            {(user?.role === "NGO" || user?.role === "Worker") && (
              <p className="text-indigo-400 text-sm font-medium mt-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 inline-block">
                🏢 Manage active crisis operations
              </p>
            )}

            {/* AI Feature Badge - Showing only to guests/users to keep volunteer UI cleaner */}
            {(!user || user?.role === "User") && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300 block">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
                ⚡ AI-powered urgency detection
              </div>
            )}
          </div>

          {/* RIGHT SIDE (ONLY USER/GUEST) */}
          {(!user || user?.role === "User") && (
            <div className="shrink-0 mt-2 md:mt-0">
              <a href="/submit">
                <button 
                  title="Report a new community problem"
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 mt-2 md:mt-0 rounded-xl text-white font-semibold shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  <span className="text-xl">➕</span> Submit Report
                </button>
              </a>
            </div>
          )}

        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-xl">
            <p className="text-indigo-300 text-sm font-semibold mb-1">Total Problems</p>
            <h2 className="text-3xl font-bold text-white">{problems.length}</h2>
          </div>
          <div className="glass bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl">
            <p className="text-emerald-300 text-sm font-semibold mb-1">Total Volunteers</p>
            <h2 className="text-3xl font-bold text-white">{volunteerCount}</h2>
          </div>
          <div className="glass bg-orange-500/10 border border-orange-500/20 p-5 rounded-xl">
            <p className="text-orange-300 text-sm font-semibold mb-1">Total NGOs</p>
            <h2 className="text-3xl font-bold text-white">{ngoCount}</h2>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          
          {/* Problem Flow */}
          <div className="glass p-5 rounded-xl border border-white/10">
            <p className="text-white font-semibold mb-4 flex items-center gap-2">🔄 Problem Flow</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-indigo-300 font-medium">🔵 Open</span>
                <span className="text-white font-bold text-lg">{openCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <span className="text-yellow-300 font-medium">🟡 In Progress</span>
                <span className="text-white font-bold text-lg">{progressCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-300 font-medium">🟢 Resolved</span>
                <span className="text-white font-bold text-lg">{resolvedCount}</span>
              </div>
            </div>
          </div>

          {/* Category Chart */}
          <div className="glass p-5 rounded-xl border border-white/10 flex flex-col items-center justify-center">
            <p className="text-white font-semibold self-start flex items-center gap-2">📊 Categories</p>
            <div className="w-full h-full min-h-[220px]" style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={55} paddingAngle={5}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={categoryData.length > 0 ? COLORS[index % COLORS.length] : "#334155"} stroke="rgba(255,255,255,0.1)" />
                    ))}
                  </Pie>
                  {categoryData.length > 0 && <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />}
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Urgency Chart */}
          <div className="glass p-5 rounded-xl border border-white/10 flex flex-col justify-center">
            <p className="text-white font-semibold flex items-center gap-2">📈 Urgency Levels</p>
            <div className="w-full h-full min-h-[220px]" style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={urgencyData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {urgencyData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Empty state banner — only when loaded and no data */}
        {!loading && stats.total === 0 && (
          <div className="mb-8 p-5 rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-500/5 text-center">
            <div className="text-4xl mb-3">🌐</div>
            <p className="text-slate-300 font-semibold mb-1">No active reports yet</p>
            <p className="text-slate-500 text-sm mb-4">Be the first to report a civic issue in your area</p>
            <a
              href="/submit"
              className="inline-flex items-center gap-2 btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
            >
              ➕ Submit First Report
            </a>
          </div>
        )}





        </div>

        {/* Map Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 mt-6">
          <h2 className="text-lg font-semibold mb-3">Live Problem Map</h2>
          <div style={{ height: "400px" }}>
            <MapView problems={problems} type="problems" />
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 text-sm flex-wrap text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1"><span style={{background:"#ef4444",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>Critical</span>
            <span className="flex items-center gap-1"><span style={{background:"#f97316",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>High</span>
            <span className="flex items-center gap-1"><span style={{background:"#eab308",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>Medium</span>
            <span className="flex items-center gap-1"><span style={{background:"#22c55e",width:10,height:10,borderRadius:"50%",display:"inline-block"}}></span>Low</span>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
