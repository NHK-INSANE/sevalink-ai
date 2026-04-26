"use client";
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers } from "../utils/api";
import { getUser } from "../utils/auth";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#080B14]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin shadow-2xl shadow-purple-500/40" />
        <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em]">Neural Grid Syncing...</span>
      </div>
    </div>
  ),
});

const MODES = [
  { id: "all",      label: "Global"     },
  { id: "problems", label: "Incidents" },
  { id: "ngo",      label: "Partners"       },
];

export default function MapPage() {
  const [type, setType]         = useState("all");
  const [problems, setProblems] = useState([]);
  const [ngos, setNgos]         = useState([]);
  const [personnelCount, setPersonnelCount] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [sosAlert, setSosAlert] = useState(null);
  const [isLocated, setIsLocated] = useState(false);

  const fetchData = async () => {
    try {
      const [pRes, uRes] = await Promise.all([
        axios.get(`${API_BASE}/api/problems`),
        axios.get(`${API_BASE}/api/users`)
      ]);
      
      const pData = pRes.data.success ? pRes.data.data : pRes.data;
      const uData = uRes.data;

      const validProblems = (Array.isArray(pData) ? pData : []).filter(p => 
        p.status?.toLowerCase() !== "resolved" && ((p.location?.lat && p.location?.lng) || (p.latitude && p.longitude))
      );
      
      const validNgos = (Array.isArray(uData) ? uData : []).filter(u => 
        u.role?.toLowerCase() === "ngo" && ((u.location?.lat && u.location?.lng) || (u.latitude && u.longitude))
      );

      const helpers = (Array.isArray(uData) ? uData : []).filter(u => 
        ["volunteer", "worker", "Volunteer", "Worker"].includes(u.role?.toLowerCase())
      ).length;

      setProblems(validProblems);
      setNgos(validNgos);
      setPersonnelCount(helpers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    socket.on("new-problem", (newProb) => {
      if (newProb.location?.lat) setProblems(prev => [newProb, ...prev]);
    });

    socket.on("problem-updated", (updated) => {
      if (updated.status?.toLowerCase() === "resolved") {
        setProblems(prev => prev.filter(p => p._id !== updated._id));
      } else {
        setProblems(prev => prev.map(p => p._id === updated._id ? updated : p));
      }
    });

    return () => {
      socket.off("new-problem");
      socket.off("problem-updated");
    };
  }, []);

  const handleLocateToggle = () => {
    setIsLocated(!isLocated);
    window.dispatchEvent(new CustomEvent("map-toggle-user", { detail: { show: !isLocated } }));
    toast.success(!isLocated ? "GPS Synchronized 📍" : "Location Hidden 🕶️");
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-white pb-24 font-inter">
      <Navbar />
      <PageWrapper className="pt-28 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 border-b border-white/5 pb-10">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Tactical Map</h1>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Global satellite view of active operational nodes.</p>
            </div>
            
            <div className="flex bg-white/[0.02] p-1.5 rounded-2xl border border-white/5">
              {MODES.map((mode) => (
                <button
                  key={mode.id} onClick={() => setType(mode.id)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    type === mode.id ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-gray-600 hover:text-white"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: "Active Reports", value: problems.length, color: "bg-red-500" },
              { label: "Partner NGOs", value: ngos.length, color: "bg-blue-500" },
              { label: "Available Helpers", value: personnelCount, color: "bg-emerald-500" }
            ].map((s, i) => (
              <div key={i} className="card !p-8 flex items-center gap-8 !rounded-[2.5rem] bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all">
                <div className={`w-3 h-3 rounded-full ${s.color} shadow-[0_0_15px_rgba(255,255,255,0.2)] animate-pulse`} />
                <div>
                  <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-2">{s.label}</p>
                  <h2 className="text-4xl font-black text-white tracking-tighter">{s.value}</h2>
                </div>
              </div>
            ))}
          </div>

          <div className="card !p-4 !rounded-[3rem] relative bg-white/[0.01] border-white/10 shadow-2xl">
            <div className="h-[70vh] rounded-[2.5rem] overflow-hidden relative">
              <MapView
                problems={problems}
                ngos={ngos}
                type={type}
                height="100%"
                zoom={6}
              />
              
              <div className="absolute bottom-10 left-10 z-[1000] space-y-4 bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4">Node Legend</p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">NGO Command Node</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#dc2626] shadow-[0_0_10px_rgba(220,38,38,0.6)]" />
                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Critical Intensity</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#f97316] shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">High Priority Area</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#eab308] shadow-[0_0_10px_rgba(234,179,8,0.6)]" />
                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Medium Alert</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Routine Support</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleLocateToggle}
                className={`absolute top-10 right-10 z-[1000] h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-2xl transition-all ${
                  isLocated ? "bg-purple-600 text-white border-transparent" : "bg-black/60 backdrop-blur-xl text-white border-white/10 hover:bg-white/10"
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
