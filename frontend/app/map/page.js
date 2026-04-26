"use client";

import { useEffect, useState, useMemo } from "react";
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

const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Map Node Syncing...</span>
      </div>
    </div>
  ),
});

const MODES = [
  { id: "all",      label: "Global View"     },
  { id: "problems", label: "Critical reports" },
  { id: "ngo",      label: "NGO Nodes"       },
];

export default function MapPage() {
  const [type, setType]         = useState("all");
  const [problems, setProblems] = useState([]);
  const [ngos, setNgos]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sosAlert, setSosAlert] = useState(null);
  const [isLocated, setIsLocated] = useState(false);
  const user = getUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [problemData, users] = await Promise.all([getProblems(), getUsers()]);
        
        // Strictly filter for items with locations
        const validProblems = (Array.isArray(problemData) ? problemData : []).filter(p => 
          (p.location?.lat && p.location?.lng) || (p.latitude && p.longitude)
        );
        const validNgos = (Array.isArray(users) ? users : []).filter(u => 
          (u.role?.toLowerCase() === "ngo") && ((u.location?.lat && u.location?.lng) || (u.latitude && u.longitude))
        );

        setProblems(validProblems);
        setNgos(validNgos);
      } catch (err) {
        toast.error("Map data link failure");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    socket.on("new-problem", (newProb) => {
      if (!newProb.location?.lat) return;
      setProblems(prev => [newProb, ...prev]);
    });

    socket.on("sos-alert", (data) => {
      setSosAlert(data);
      setTimeout(() => setSosAlert(null), 10000);
    });

    return () => {
      socket.off("new-problem");
      socket.off("sos-alert");
    };
  }, []);

  const handleLocateToggle = () => {
    setIsLocated(!isLocated);
    window.dispatchEvent(new CustomEvent("map-toggle-user", { detail: { show: !isLocated } }));
    toast.success(!isLocated ? "GPS Synchronized 📍" : "Location Hidden 🕶️");
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <main className="pt-32 px-6 max-w-7xl mx-auto space-y-8">
        <div className="h-10 w-64 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-[70vh] card !p-0 animate-pulse" />
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Live Operations Map</h1>
              <p className="text-sm text-gray-500 font-medium">Global tactical view of authorized nodes and verified reports.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-xl">
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setType(mode.id)}
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      type === mode.id ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SOS BANNER */}
          <AnimatePresence>
            {sosAlert && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-red-600 p-6 rounded-[2rem] flex items-center justify-between shadow-2xl shadow-red-500/20"
              >
                <div className="flex items-center gap-6">
                  <span className="text-4xl">🚨</span>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">Emergency Broadcast</h3>
                    <p className="text-sm text-red-100 font-medium italic">"{sosAlert.message}" — Reported by {sosAlert.senderName}</p>
                  </div>
                </div>
                <button onClick={() => setSosAlert(null)} className="btn-secondary !bg-white/10 !border-white/20 !text-white !py-2 !px-4 !text-[10px]">Dismiss</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card !p-8 flex items-center gap-6">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Active Reports</p>
                <h2 className="text-3xl font-black text-white">{problems.length}</h2>
              </div>
            </div>
            <div className="card !p-8 flex items-center gap-6">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Partner NGOs</p>
                <h2 className="text-3xl font-black text-white">{ngos.length}</h2>
              </div>
            </div>
            <div className="card !p-8 flex items-center gap-6">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Global Coverage</p>
                <h2 className="text-3xl font-black text-white">Active</h2>
              </div>
            </div>
          </div>

          {/* MAP CARD */}
          <div className="card !p-3 !rounded-[2.5rem] relative group border-white/10">
            <div className="h-[65vh] rounded-[2rem] overflow-hidden relative">
              <MapView
                problems={problems}
                ngos={ngos}
                type={type}
                height="100%"
                zoom={6}
              />
              
              {/* FIXED LEGEND */}
              <div className="absolute bottom-8 left-8 z-[1000] space-y-3 bg-black/60 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Tactical Legend</p>
                <div className="flex items-center gap-4">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest">NGO Command Nodes</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest">Critical Reports</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest">High Priority</span>
                </div>
              </div>

              {/* LOCATE TOGGLE */}
              <button 
                onClick={handleLocateToggle}
                className={`absolute top-8 right-8 z-[1000] h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-2xl transition-all ${
                  isLocated ? "bg-purple-600 text-white border-purple-500" : "bg-black/60 backdrop-blur-xl text-white border-white/10 hover:bg-white/10"
                }`}
              >
                {isLocated ? "🛰️ GPS Locked" : "📍 Locate Me"}
              </button>
            </div>
          </div>

        </div>
      </PageWrapper>
    </div>
  );
}
