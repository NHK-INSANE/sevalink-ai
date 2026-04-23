"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers, apiRequest } from "../utils/api";
import { SkeletonMap } from "../components/Skeleton";
import { getUser } from "../utils/auth";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 animate-pulse">
      <div className="flex flex-col items-center gap-3 text-blue-600">
        <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-medium text-sm">Initializing Map...</span>
      </div>
    </div>
  ),
});

const MODES = [
  { id: "all",      label: "All Assets",      icon: "🌐" },
  { id: "problems", label: "Crisis Reports",   icon: "🔴" },
  { id: "ngo",      label: "Registered NGOs",  icon: "🏢" },
  { id: "helpers",  label: "Volunteers",       icon: "🤝" },
];

export default function MapPage() {
  const [type, setType]         = useState("all");
  const [problems, setProblems] = useState([]);
  const [ngos, setNgos]         = useState([]);
  const [helpers, setHelpers]   = useState([]);
  const [sosMarkers, setSosMarkers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sosAlert, setSosAlert] = useState(null);   // current SOS banner
  const [sendingSOS, setSendingSOS] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const user = getUser();

  // ── Fetch initial data ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [problemData, users] = await Promise.all([getProblems(), getUsers()]);
        setProblems(problemData);
        setNgos(users.filter(u => u.role === "ngo" || u.role === "NGO"));
        setHelpers(users.filter(u =>
          u.role?.toLowerCase() === "volunteer" || u.role?.toLowerCase() === "worker"
        ));
      } catch (err) {
        console.error("Map Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // ── Socket.IO ─────────────────────────────────────────────────────────
    const socket = io(API_BASE);

    socket.on("new-problem", (newProb) => {
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
      toast("📍 New crisis report on map!", {
        icon: "🔴",
        duration: 3000,
        style: { fontSize: "13px" },
      });
    });

    socket.on("problem-updated", (updatedProb) => {
      setProblems(prev => prev.map(p => p._id === updatedProb._id ? updatedProb : p));
    });

    socket.on("sos-alert", (data) => {
      // Show persistent banner
      setSosAlert(data);
      // Add to map markers
      const sosId = Date.now();
      const newSos = { ...data, id: sosId };
      setSosMarkers(prev => [newSos, ...prev]);
      
      // Auto-remove marker after 5 mins
      setTimeout(() => {
        setSosMarkers(prev => prev.filter(s => s.id !== sosId));
      }, 5 * 60 * 1000);

      // Toast too
      toast.error(`🚨 SOS: ${data.message} — from ${data.senderName || "Unknown"}`, {
        duration: 8000,
        position: "top-center",
        style: {
          background: "#dc2626",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "14px",
          border: "2px solid #fff",
        },
      });
      // Auto-hide banner after 30s
      setTimeout(() => setSosAlert(null), 30000);
    });

    socket.on("assigned", ({ helperId, problemTitle }) => {
      if (user && (user._id === helperId || user.id === helperId)) {
        toast(`✅ You've been assigned: "${problemTitle}"`, {
          icon: "📋",
          duration: 6000,
          style: { background: "#1e3a8a", color: "#bfdbfe", fontWeight: "600" },
        });
      }
    });

    return () => socket.disconnect();
  }, []);

  // ── Send SOS ──────────────────────────────────────────────────────────────
  const sendSOS = async () => {
    setSendingSOS(true);
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation
          ? navigator.geolocation.getCurrentPosition(resolve, reject)
          : reject(new Error("No geolocation"))
      );
      await apiRequest("/api/sos", {
        method: "POST",
        body: JSON.stringify({
          latitude:   position.coords.latitude,
          longitude:  position.coords.longitude,
          message:    "Emergency! Immediate help needed!",
          senderName: user?.name || "Anonymous",
        }),
      });
      toast.success("🚨 SOS sent to all connected users!");
    } catch {
      toast.error("Could not send SOS — enable location access");
    } finally {
      setSendingSOS(false);
    }
  };

  // Loading Skeleton for Map
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 md:px-10 pt-24 pb-20">
          <div className="h-10 bg-gray-100 rounded-xl w-64 mb-8 animate-pulse"></div>
          <div className="h-[70vh] bg-gray-50 rounded-3xl border border-gray-100 p-4">
             <SkeletonMap />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">🌍 Global Crisis Map</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Live tracking of problems, volunteers, and NGOs in real-time.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={sendSOS}
              disabled={sendingSOS}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl font-bold text-sm transition shadow-sm active:scale-95"
            >
              <span className={sendingSOS ? "animate-spin" : "animate-pulse"}>🚨</span>
              {sendingSOS ? "Sending..." : "Send SOS"}
            </button>

            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm border ${
                showHeatmap
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-[var(--card)] text-[var(--muted)] border-[var(--border)]"
              }`}
            >
              🔥 {showHeatmap ? "Hide Heatmap" : "Crisis Heatmap"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1 p-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl w-fit">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setType(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition text-[10px] sm:text-xs font-bold ${
                  type === mode.id
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <span>{mode.icon}</span>
                <span className={type === mode.id ? "block" : "hidden sm:block"}>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SOS Alert Banner */}
        <AnimatePresence>
          {sosAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 flex items-start gap-4 bg-red-600 text-white px-5 py-4 rounded-2xl shadow-lg border border-red-400"
            >
              <span className="text-2xl sm:text-3xl animate-bounce">🚨</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base sm:text-lg">SOS EMERGENCY</div>
                <div className="text-red-100 text-xs sm:text-sm mt-0.5 truncate">
                  {sosAlert.message} — <strong>{sosAlert.senderName || "Unknown"}</strong>
                </div>
                <div className="text-red-200 text-[10px] sm:text-xs mt-1">
                  📍 {sosAlert.latitude?.toFixed(4)}, {sosAlert.longitude?.toFixed(4)} · {new Date(sosAlert.time).toLocaleTimeString()}
                </div>
              </div>
              <button onClick={() => setSosAlert(null)} className="text-red-200 hover:text-white p-1">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Container */}
        <div className="bg-[var(--card)] p-2 sm:p-4 rounded-3xl shadow-xl border border-[var(--border)] relative overflow-hidden">
          <div className="h-[50vh] sm:h-[65vh] md:h-[70vh] rounded-2xl overflow-hidden">
            <MapView
              problems={problems}
              ngos={ngos}
              helpers={helpers}
              sosMarkers={sosMarkers}
              type={type}
              height="100%"
              zoom={6}
              zoomToUser={true}
              showHeatmap={showHeatmap}
            />
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: "Reports",     val: problems.length, icon: "🔴" },
            { label: "NGOs",        val: ngos.length,     icon: "🏢" },
            { label: "Volunteers",  val: helpers.length,  icon: "🤝" },
            { label: "Critical",    val: problems.filter(p => p.urgency?.toLowerCase() === "critical").length, icon: "⚠️" },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl text-center shadow-sm hover:shadow-md transition">
              <div className="text-lg">{s.icon}</div>
              <div className="text-xl font-bold text-[var(--text)] mt-1">{s.val}</div>
              <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
