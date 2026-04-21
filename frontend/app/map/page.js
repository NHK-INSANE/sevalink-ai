"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers, apiRequest } from "../utils/api";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 transition duration-200">
      <Navbar />
      <PageWrapper>
        <main className="max-w-7xl mx-auto px-4 md:px-10 py-10">

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

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🗺️ Global Crisis Map</h1>
              <p className="text-gray-500 text-sm mt-1 font-medium">
                Live visualization of reports, relief organizations, and field volunteers.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
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
              <div className="flex flex-wrap gap-1 p-1 bg-white border border-gray-200 rounded-2xl shadow-sm">
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
              </div>

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

          {/* ── Map ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full h-[650px] rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-white"
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

          {/* ── Quick stats row below map ── */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-4">
            {[
              { label: "Total Problems", value: problems.length, color: "text-red-600" },
              { label: "NGOs",           value: ngos.length,     color: "text-emerald-600" },
              { label: "Volunteers",     value: helpers.length,  color: "text-blue-600" },
              { label: "SOS Active",     value: sosMarkers.length, color: "text-red-700" },
              { label: "Critical",
                value: problems.filter(p => p.urgency?.toLowerCase() === "critical").length,
                color: "text-orange-600"
              },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

        </main>
      </PageWrapper>
    </div>
  );
}
