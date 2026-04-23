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
      <main className="page-container">

        {/* ── PAGE HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Global Crisis Map</h1>
            <p className="text-[#9CA3AF] text-[13px] mt-1 font-medium">
              Real-time synchronization of crisis reports, volunteer assets, and NGO operations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`btn-secondary !text-xs !px-5 !py-2 ${showHeatmap ? "!bg-indigo-500/10 !border-indigo-500/30 !text-indigo-400" : ""}`}
            >
              {showHeatmap ? "Hide Heatmap" : "Crisis Heatmap"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={sendSOS}
              disabled={sendingSOS}
              className="btn-primary !bg-red-600 !text-xs !px-5 !py-2"
              style={{ boxShadow: "0 0 16px rgba(220,38,38,0.35)" }}
            >
              {sendingSOS ? <div className="loader-small" /> : <><span>🚨</span> Broadcast SOS</>}
            </motion.button>
          </div>
        </div>

        {/* ── SOS Alert Banner ── */}
        <AnimatePresence>
          {sosAlert && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-6 flex items-center gap-4 bg-red-600/90 backdrop-blur-xl text-white px-5 py-4 rounded-xl shadow-2xl border border-red-400/30"
            >
              <span className="text-xl animate-bounce">🚨</span>
              <div className="flex-1">
                <div className="font-bold text-sm uppercase tracking-tight">SOS Emergency Detected</div>
                <div className="text-red-100 text-xs mt-0.5">
                  "{sosAlert.message}" — <span className="font-bold">{sosAlert.senderName || "Unknown"}</span>
                </div>
              </div>
              <button onClick={() => setSosAlert(null)} className="w-7 h-7 bg-black/10 hover:bg-black/25 rounded-lg flex items-center justify-center text-xs transition-colors">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATS ROW (above map) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
          {[
            { label: "Active Reports",    val: problems.length,                                                               color: "text-red-400",     dot: "bg-red-500"     },
            { label: "Partner NGOs",      val: ngos.length,                                                                   color: "text-blue-400",    dot: "bg-blue-500"    },
            { label: "Available Assets",  val: helpers.length,                                                                color: "text-emerald-400", dot: "bg-emerald-500" },
            { label: "Critical Priority", val: problems.filter(p => p.urgency?.toLowerCase() === "critical").length,         color: "text-orange-400",  dot: "bg-orange-500"  },
          ].map((s) => (
            <div key={s.label} className="card !p-5 flex items-center gap-4">
              <span className={`w-3 h-3 rounded-full shrink-0 ${s.dot}`} />
              <div>
                <div className={`text-2xl font-bold tracking-tight leading-none ${s.color}`}>{s.val}</div>
                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAP CARD ── */}
        <div className="card !p-0 overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>

          {/* Map toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 bg-[#0f172a]/60">
            {/* Mode tabs */}
            <div className="flex items-center gap-1">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setType(mode.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    type === mode.id
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className="text-[13px]">{mode.icon}</span>
                  <span className="hidden sm:block">{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-400">Live</span>
              <span className="text-[11px] text-gray-600 ml-2">{problems.length} incidents · {helpers.length} assets</span>
            </div>
          </div>

          {/* Map itself */}
          <div className="h-[68vh] w-full relative">
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

      </main>
      </PageWrapper>
    </div>
  );
}

