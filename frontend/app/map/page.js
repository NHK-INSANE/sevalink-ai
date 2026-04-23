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
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-card)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span className="loader" />
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Initializing Map…</span>
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
      <div className="min-h-screen bg-[var(--bg-main)]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 md:px-10 pt-32 pb-20 space-y-12">
          <div className="h-10 bg-white/5 rounded-2xl w-64 animate-pulse"></div>
          <div className="h-[70vh] bg-white/5 rounded-[2.5rem] border border-white/5 p-3">
             <SkeletonMap />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition duration-300">
      <Navbar />
      <PageWrapper>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight gradient-text">
              Global Crisis Map
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-2 font-medium">
              Real-time synchronization of crisis reports, volunteer assets, and NGO operations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={sendSOS}
              disabled={sendingSOS}
              className="btn-primary !bg-red-600 !shadow-[0_0_20px_rgba(220,38,38,0.3)] !px-6"
            >
              {sendingSOS ? (
                <div className="loader-small border-red-200"></div>
              ) : (
                <>
                  <span className="animate-pulse">🚨</span>
                  Broadcast SOS
                </>
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`btn-secondary !text-xs !px-5 ${showHeatmap ? "!bg-indigo-500/10 !border-indigo-500/30 !text-indigo-400" : ""}`}
            >
              {showHeatmap ? "Hide Heatmap" : "Crisis Heatmap"}
            </motion.button>
          </div>
        </div>

        {/* SOS Alert Banner */}
        <AnimatePresence>
          {sosAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8 flex items-center gap-6 bg-red-600/90 backdrop-blur-xl text-white px-6 py-5 rounded-[2rem] shadow-2xl border border-red-400/30"
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl animate-bounce">🚨</div>
              <div className="flex-1">
                <div className="font-bold text-lg leading-tight uppercase tracking-tight">SOS EMERGENCY DETECTED</div>
                <div className="text-red-100 text-sm mt-1">
                  "{sosAlert.message}" — <span className="font-bold">{sosAlert.senderName || "Unknown"}</span>
                </div>
              </div>
              <button onClick={() => setSosAlert(null)} className="w-10 h-10 bg-black/10 hover:bg-black/20 rounded-xl flex items-center justify-center transition-colors">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Container */}
        <div className="card p-3 !rounded-[2.5rem] shadow-2xl border-white/5 relative overflow-hidden group">
          {/* Floating Category Filter */}
          <div className="map-controls absolute top-6 left-6 z-[10] flex gap-1 p-1">
            {MODES.map((mode) => (
              <motion.button
                whileTap={{ scale: 0.95 }}
                key={mode.id}
                onClick={() => setType(mode.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition text-[10px] font-bold uppercase tracking-widest ${
                  type === mode.id
                    ? "bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20"
                    : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{mode.icon}</span>
                <span className={type === mode.id ? "block" : "hidden md:block"}>{mode.label}</span>
              </motion.button>
            ))}
          </div>

          <div className="absolute top-6 right-6 z-[10]">
            <div className="glass px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Signal</span>
            </div>
          </div>

          <div className="h-[60vh] sm:h-[75vh] rounded-[2rem] overflow-hidden border border-white/5">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
          {[
            { label: "Active Reports", val: problems.length, color: "text-red-500" },
            { label: "Partner NGOs",   val: ngos.length,     color: "text-blue-500" },
            { label: "Available Assets", val: helpers.length,  color: "text-emerald-500" },
            { label: "Critical Priority", val: problems.filter(p => p.urgency?.toLowerCase() === "critical").length, color: "text-orange-500" },
          ].map((s) => (
            <motion.div 
              whileHover={{ y: -5 }}
              key={s.label} 
              className="card p-6 !rounded-2xl border-white/5 hover:border-white/10"
            >
              <div className={`text-3xl font-bold ${s.color} tracking-tight`}>{s.val}</div>
              <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-2">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </main>
      </PageWrapper>
    </div>
  );
}
