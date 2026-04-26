"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers, apiRequest } from "../utils/api";
import { SkeletonMap } from "../components/Skeleton";
import { getUser } from "../utils/auth";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";
import Link from "next/link";
import LiveLegend from "../components/LiveLegend";

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
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>MAP NODE SYNCING...</span>
      </div>
    </div>
  ),
});

const MODES = [
  { id: "all",      label: "All Assets"     },
  { id: "problems", label: "Crisis Reports"  },
  { id: "ngo",      label: "NGOs"            },
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
  const [mapZoom, setMapZoom]   = useState(6);
  const [isLocated, setIsLocated] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
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
    
    socket.on("new-problem", (newProb) => {
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
      toast("New crisis report on map", {
        duration: 3000,
        style: { fontSize: "13px" },
      });
    });

    socket.on("problem-updated", (updatedProb) => {
      setProblems(prev => prev.map(p => p._id === updatedProb._id ? updatedProb : p));
    });

    socket.on("sos-alert", (data) => {
      // Play alert sound
      try {
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.play().catch(e => console.log("Audio play blocked by browser:", e));
      } catch (e) {}

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
      toast.error(`SOS: ${data.message} — from ${data.senderName || "Unknown"}`, {
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
        toast(`SUCCESS: You've been assigned: "${problemTitle}"`, {
          duration: 6000,
          style: { background: "#1e3a8a", color: "#bfdbfe", fontWeight: "600" },
        });
      }
    });

    socket.on("dispatch", (data) => {
      if (user && (user._id === data.responderId || user.id === data.responderId)) {
        toast(`🚨 You have been dispatched to a crisis!`, {
          duration: 10000,
          icon: '🚨',
          style: { background: "#7f1d1d", color: "#fff", border: "1px solid #ef4444", fontWeight: "bold" }
        });
      }
    });

    socket.on("responder_moved", (data) => {
      setNgos(prev => prev.map(u => 
        u._id === data.id ? { ...u, location: { lat: data.lat, lng: data.lng } } : u
      ));
    });

    socket.on("pre_alert", (data) => {
      toast(`🔮 PREDICTIVE ALERT: ${data.message}`, {
        duration: 10000,
        icon: '🔮',
        style: { background: "#4c1d95", color: "#fff", border: "1px solid #a855f7", fontWeight: "bold" }
      });
    });

    socket.on("heatmap_update", (data) => {
      console.log("🔥 Heatmap data received:", data.length, "points");
      setHeatmapPoints(data);
    });

    socket.on("live_locations", (locations) => {
      // locations: { userId: { lat, lng, name, role } }
      const activeHelpers = Object.values(locations);
      setHelpers(prev => {
        // Merge live data with static data
        // We keep static helpers but override coordinates for those who are live
        return prev.map(h => {
          const live = activeHelpers.find(l => l.userId === h._id);
          if (live) {
            return { ...h, location: { lat: live.lat, lng: live.lng }, isLive: true };
          }
          return h;
        });
      });
    });

    const handleDenied = () => setIsLocated(false);
    window.addEventListener("map-user-denied", handleDenied);

    return () => {
      socket.off("new-problem");
      socket.off("problem-updated");
      socket.off("sos-alert");
      socket.off("assigned");
      socket.off("dispatch");
      socket.off("responder_moved");
      socket.off("pre_alert");
      socket.off("heatmap_update");
      window.removeEventListener("map-user-denied", handleDenied);
    };
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
          severity:   "critical"
        }),
      });

      // 🔥 Emit to OPS Command Center
      socket.emit("sos_alert", {
        location: { lat: position.coords.latitude, lng: position.coords.longitude },
        message: "Emergency! Immediate help needed!",
        senderName: user?.name || "Anonymous",
        severity: "critical"
      });

      toast.success("SOS sent to all connected users!");
    } catch {
      toast.error("Could not send SOS — enable location access");
    } finally {
      setSendingSOS(false);
    }
  };

  const handleLocateToggle = () => {
    const nextState = !isLocated;
    setIsLocated(nextState);
    window.dispatchEvent(new CustomEvent("map-toggle-user", { detail: { show: nextState } }));
    
    if (nextState) {
      toast.success("Initializing GPS sync... 📍");
    } else {
      toast("Location hidden", { icon: "🕶️" });
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
        <div className="page-wrapper pt-28 pb-20">
          <main className="flex flex-col gap-[32px]">

        {/* ── PAGE HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Live Operations Map</h1>
            <p className="text-[#9CA3AF] text-[13px] mt-1 font-medium">
              Real-time visualization of crisis reports, responders, and NGO activity across regions.
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
            <Link href="/submit" className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-lg text-white text-xs font-bold shadow-md transition-colors">
              Report Incident
            </Link>
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
              <span className="text-xs font-black uppercase tracking-widest text-white px-2 py-1 bg-red-700 rounded-lg">SOS ALERT</span>
              <div className="flex-1">
                <div className="font-bold text-sm uppercase tracking-tight">SOS Emergency Detected</div>
                <div className="text-red-100 text-xs mt-0.5">
                  "{sosAlert.message}" — <span className="font-bold">{sosAlert.senderName || "Unknown"}</span>
                </div>
              </div>
              <button onClick={() => setSosAlert(null)} className="px-3 py-1 bg-black/10 hover:bg-black/25 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors uppercase">CLOSE</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATS ROW (above map) */}
        <div className="stats-grid">
          {[
            { label: "Active Reports",    val: problems.length,                                                               color: "text-red-400",     dot: "bg-red-500"     },
            { label: "Partner NGOs",      val: ngos.length,                                                                   color: "text-blue-400",    dot: "bg-blue-500"    },
            { label: "Available Assets",  val: helpers.length,                                                                color: "text-emerald-400", dot: "bg-emerald-500" },
            { label: "Critical Priority", val: problems.filter(p => (p.severity || p.urgency || "").toLowerCase() === "critical").length,         color: "text-orange-400",  dot: "bg-orange-500"  },
          ].map((s) => (
            <div key={s.label} className="stat-card flex items-center gap-4">
              <span className={`w-3 h-3 rounded-full shrink-0 ${s.dot}`} />
              <div>
                <div className={`text-2xl font-bold tracking-tight leading-none ${s.color}`}>{s.val}</div>
                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FILTER ROW: Filters (left) + Live count (right) ── */}
        <div className="flex items-center justify-between gap-4 mb-5">
          {/* Mode filter pills */}
          <div className="flex items-center gap-3">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setType(mode.id)}
                className={`map-filter-card ${type === mode.id ? "active" : ""}`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Live indicator + counts */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">Live Link</span>
            <span className="text-[11px] text-gray-600 ml-1">{problems.length} incidents · {ngos.length} NGOs</span>
          </div>
        </div>

        {/* ── MAP CARD ── */}
          <div className="flex justify-between items-end mb-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Real-time Geospatial Visualization</h2>
              {mapZoom >= 8 && <LiveLegend showCount={true} stats={{
                critical: problems.filter(p => (p.severity || p.urgency || "").toLowerCase() === "critical").length,
                high:     problems.filter(p => (p.severity || p.urgency || "").toLowerCase() === "high").length,
                medium:   problems.filter(p => (p.severity || p.urgency || "").toLowerCase() === "medium").length,
                low:      problems.filter(p => (p.severity || p.urgency || "").toLowerCase() === "low").length,
                ngos:     ngos.length
              }} />}
            </div>
            <div className="flex gap-3 mb-2">
              <button 
                onClick={sendSOS}
                disabled={sendingSOS}
                className="bg-red-600 hover:bg-red-700 h-9 px-4 rounded-xl text-white text-[9px] font-black shadow-xl transition-all flex items-center gap-2 hover:scale-105 active:scale-95 border border-red-400/30 uppercase tracking-widest"
              >
                {sendingSOS ? <div className="loader-small" /> : <>🚨 SOS</>}
              </button>
              
              <button 
                onClick={handleLocateToggle}
                className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-xl transition-all flex items-center justify-center gap-2 ${
                  isLocated ? "bg-gray-700 text-gray-300 border-white/10" : "bg-white text-black border-white hover:bg-gray-200"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                {isLocated ? "Hide Me" : "Locate Me"}
              </button>
            </div>
          </div>

          <div className="relative card !p-0 overflow-hidden border border-white/10 shadow-2xl group">
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
                heatmapData={heatmapPoints}
                onZoomChange={setMapZoom}
              />
            </div>
          </div>
        </main>
      </div>
      </PageWrapper>
    </div>
  );
}
