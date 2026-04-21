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

    socket.on("sos-alert", (data) => {
      // Show persistent banner
      setSosAlert(data);
      // Add to map markers
      setSosMarkers(prev => [data, ...prev]);
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
      <div className="min-h-screen bg-white">
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="pt-24 px-6 md:px-10 max-w-7xl mx-auto pb-20">
        
        {/* Title + Subtitle (Startup Style) */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">🌍 Global Crisis Map</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Live tracking of problems, volunteers, and NGOs in real-time.
          </p>
        </div>

        {/* Action Bar (Preserved functionality) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <div className="bg-gray-50 p-1 rounded-2xl border border-gray-100 flex gap-1">
              {/* SOS Button */}
              <button
                onClick={sendSOS}
                disabled={sendingSOS}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl font-bold text-sm transition duration-200 hover:scale-105 active:scale-95 shadow-md"
              >
                <span className={sendingSOS ? "animate-spin" : "animate-pulse"}>🚨</span>
                {sendingSOS ? "Sending..." : "Send SOS"}
              </button>

              {/* Mode filter pills */}
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setType(mode.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition duration-200 text-xs font-semibold ${
                    type === mode.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <span>{mode.icon}</span>
                  {mode.label}
                </button>
              ))}

              {/* Heatmap Toggle */}
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition duration-200 shadow-sm border ${
                  showHeatmap
                    ? "bg-purple-600 text-white border-purple-500"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                🔥 {showHeatmap ? "Hide Heatmap" : "Crisis Heatmap"}
              </button>
            </div>
          </div>
        </div>

        {/* ── SOS Alert Banner ── */}
        <AnimatePresence>
          {sosAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 flex items-start gap-4 bg-red-600 text-white px-5 py-4 rounded-2xl shadow-lg border border-red-400"
            >
              <span className="text-3xl animate-bounce">🚨</span>
              <div className="flex-1">
                <div className="font-bold text-lg">SOS EMERGENCY ALERT</div>
                <div className="text-red-100 text-sm mt-0.5">
                  {sosAlert.message} — sent by <strong>{sosAlert.senderName || "Unknown"}</strong>
                </div>
                <div className="text-red-200 text-xs mt-1">
                  📍 {sosAlert.latitude?.toFixed(4)}, {sosAlert.longitude?.toFixed(4)} · {new Date(sosAlert.time).toLocaleTimeString()}
                </div>
              </div>
              <button
                onClick={() => setSosAlert(null)}
                className="text-red-200 hover:text-white text-sm mt-1"
              >✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Container (Startup Style) */}
        <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-[65vh] rounded-2xl overflow-hidden border border-gray-100"
          >
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
          </motion.div>
        </div>

        {/* Bottom Stats (Preserved functionality) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: "Total Problems", val: problems.length, icon: "🔴" },
            { label: "NGOs",           val: ngos.length,     icon: "🏢" },
            { label: "Volunteers",     val: helpers.length,  icon: "🤝" },
            { label: "Critical",       val: problems.filter(p => p.urgency?.toLowerCase() === "critical").length, icon: "⚠️" },
          ].map((s) => (
            <div key={s.label} className="bg-white/95 backdrop-blur shadow-lg border border-white p-3 rounded-2xl text-center">
              <div className="text-xl">{s.icon}</div>
              <div className="text-lg font-bold text-gray-800">{s.val}</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      </motion.div>
    </div>
  );
}
