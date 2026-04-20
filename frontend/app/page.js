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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Map controls
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
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

  useEffect(() => {
    fetchProblems();
    const interval = setInterval(fetchProblems, 5000); // real-time: every 5s
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
  
  const volunteerCount = Math.max(12, problems.length * 2);
  const ngoCount = Math.max(4, Math.floor(problems.length / 2) + 2);

  const stats = { total: problems.length };

  const recentProblems = problems.slice(0, 6);

  const filteredProblems =
    filter === "All" ? problems : problems.filter((p) => p.urgency === filter);

  const handleLocationSearch = async () => {
    if (!locationQuery.trim()) return;
    setLocationLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
      } else {
        toast.error("Location not found. Try a different search term.");
      }
    } catch {
      toast.error("Search failed. Check your connection.");
    } finally {
      setLocationLoading(false);
    }
  };

  // 📍 Locate Me — GPS detect + drop user pin
  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        console.log("📍 User location detected:", lat, lng);
        setUserLocation([lat, lng]);
        setMapCenter([lat, lng]);
        toast.success("You are here! 📍");
      },
      () => toast.error("Location permission denied")
    );
  };

  // 🔴 Auto-focus first Critical problem when problems load
  useEffect(() => {
    if (problems.length === 0) return;
    const critical = problems.find(
      (p) => p.urgency === "Critical" && p.location?.lat && p.location?.lng
    );
    if (critical) {
      setMapCenter([critical.location.lat, critical.location.lng]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problems.length === 0 ? 0 : problems[0]?._id]); // only on first load

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

        {/* Map */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">🗺️ Live Crisis Map</h2>
            <div className="flex items-center gap-3">
              {/* Live pulse indicator */}
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Live
              </span>
              {lastUpdate && (
                <span className="text-xs text-slate-500">Updated {lastUpdate}</span>
              )}
              <span className="text-xs text-slate-500 italic">Toggle markers / heatmap →</span>
            </div>
          </div>

          {/* Location Search + My Location */}
          <div className="flex gap-2 mb-3">
            <input
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
              placeholder="🔍 Search location… (e.g. Mumbai, Delhi)"
              className="flex-1 glass border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
            <button
              onClick={handleLocationSearch}
              disabled={locationLoading}
              className="btn-primary px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
            >
              {locationLoading ? "…" : "Go"}
            </button>
            <button
              id="my-location-btn"
              onClick={handleMyLocation}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold glass border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/60 transition-all"
              title="Drop a pin at your current location"
            >
              📍 Locate Me
            </button>
          </div>

          {/* Urgency filter pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: "All",      color: "bg-indigo-600" },
              { label: "Critical", color: "bg-red-600" },
              { label: "High",     color: "bg-orange-500" },
              { label: "Medium",   color: "bg-yellow-500" },
              { label: "Low",      color: "bg-emerald-600" },
            ].map(({ label, color }) => (
              <button
                key={label}
                onClick={() => setFilter(label)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  filter === label
                    ? `${color} text-white border-transparent shadow`
                    : "glass border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {label === "All" ? "🗺️" : label === "Critical" ? "🔴" : label === "High" ? "🟠" : label === "Medium" ? "🟡" : "🟢"} {label}
                {label !== "All" && (
                  <span className="ml-1 opacity-60">
                    ({problems.filter((p) => p.urgency === label).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="glass rounded-xl overflow-hidden border border-white/5 relative">
            {!loading && (
              <MapView
                problems={filteredProblems}
                onSelect={setSelected}
                center={mapCenter}
                userLocation={userLocation}
              />
            )}
            {loading && (
              <div className="h-[500px] flex items-center justify-center text-slate-600">
                Loading map…
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel — shows when a marker is clicked */}
        {selected && (
          <div className="fixed right-4 top-20 z-[2000] w-80 glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Urgency header stripe */}
            <div
              className="h-1.5 w-full"
              style={{
                background:
                  selected.urgency === "Critical" ? "#ef4444" :
                  selected.urgency === "High"     ? "#f97316" :
                  selected.urgency === "Medium"    ? "#eab308" : "#22c55e",
              }}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h2 className="font-bold text-white text-base leading-snug">{selected.title}</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-500 hover:text-white transition-colors text-lg leading-none mt-0.5 shrink-0"
                >✕</button>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                {selected.description || "No description provided."}
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Urgency</span>
                  <span
                    className="px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      color: selected.urgency === "Critical" ? "#f87171" : selected.urgency === "High" ? "#fb923c" : selected.urgency === "Medium" ? "#facc15" : "#4ade80",
                      background: selected.urgency === "Critical" ? "#ef444422" : selected.urgency === "High" ? "#f9731622" : selected.urgency === "Medium" ? "#eab30822" : "#22c55e22",
                    }}
                  >{selected.urgency}</span>
                </div>
                {typeof selected.score === "number" && selected.score > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">AI Score</span>
                    <span className="text-indigo-300 font-semibold">{selected.score}/100</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Status</span>
                  <span className="text-slate-300">{selected.status}</span>
                </div>
                {selected.requiredSkill && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Skill needed</span>
                    <span className="text-slate-300">{selected.requiredSkill}</span>
                  </div>
                )}
              </div>

              {/* Get Directions */}
              {selected.location?.lat && selected.location?.lng && (
                <div className="mt-4 pt-4 border-t border-white/8">
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${selected.location.lat},${selected.location.lng}`;
                      window.open(url, "_blank");
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 hover:border-blue-400/60 transition-all"
                  >
                    🧭 Get Directions
                  </button>
                  <p className="text-center text-[10px] text-slate-600 mt-1.5">Opens Google Maps from your location</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Problems */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              🚨 Recent Reports
            </h2>
            <a href="/problems" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="glass rounded-xl h-40 animate-pulse bg-white/3"
                />
              ))}
            </div>
          ) : recentProblems.length === 0 ? (
            <div className="text-center py-20 text-slate-600">
              <div className="text-5xl mb-4">🌐</div>
              <p className="text-lg">No problems reported yet.</p>
              <a
                href="/submit"
                className="inline-block mt-4 btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              >
                Submit the first one
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProblems.map((p) => (
                <ProblemCard
                  key={p._id}
                  problem={p}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      </motion.main>
    </div>
  );
}
