"use client";
import { useEffect, useState, Suspense } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

function NGOContent() {
  const router = useRouter();
  const [ngos, setNgos] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [currentUser, setCurrentUser] = useState(null);
  const [ngoQuery, setNgoQuery] = useState("");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState(""); // "assign" or "lead"
  const [selectedProbId, setSelectedProbId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorShown, setErrorShown] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUser(JSON.parse(localStorage.getItem("seva_user") || "null"));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, pRes] = await Promise.all([
        axios.get(`${API_BASE}/api/users`),
        axios.get(`${API_BASE}/api/problems`)
      ]);
      const onlyNgos = uRes.data.filter(u => u.role?.toLowerCase() === "ngo");
      setNgos(onlyNgos);
      setProblems(pRes.data.filter(p => p.status !== "RESOLVED"));
    } catch (err) {
      toast.error("Failed to sync Command Centers.");
    } finally {
      setLoading(false);
    }
  };

  const locateNgo = (ngo) => {
    if (ngo.location?.lat && ngo.location?.lng) {
      router.push(`/map?ngoId=${ngo._id}&lat=${ngo.location.lat}&lng=${ngo.location.lng}&title=${encodeURIComponent(ngo.ngoName || ngo.name || "NGO")}`);
    } else {
      toast.error("GPS coordinates unavailable for this Command Center.");
    }
  };

  const handleConnect = (ngo) => {
    if (!currentUser) return toast.error("Authentication required to establish link.");
    router.push(`/chat?id=${ngo._id}`);
  };

  const handleOpenRequest = (type) => {
    if (!currentUser) return toast.error("Authentication required.");
    setRequestType(type);
    setShowRequestModal(true);
  };

  const submitRequest = async () => {
    if (!selectedProbId) return toast.error("Select a target mission.");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${selectedProbId}/request`, {
        type: requestType
      }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(requestType === 'lead' ? "Leadership request transmitted to Command Center." : "Entry request transmitted.");
      setShowRequestModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Transmission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocate = async () => {
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortBy("nearest");
      toast.success("GPS Lock: Proximity sorting active.");
      setErrorShown(false);
    } catch (err) {
      if (!errorShown) {
        toast.error("Location services offline.");
        setErrorShown(true);
      }
    }
  };

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  const filteredNgos = ngos.filter(n => {
    if (ngoQuery) {
      const q = ngoQuery.toLowerCase();
      const code = (n.displayId || n.customId || "").toLowerCase();
      const name = (n.ngoName || n.name || "").toLowerCase();
      if (!code.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  const sortedNgos = [...filteredNgos].sort((a, b) => {
    if (sortBy === "nearest" && userLoc) {
      const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
      const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
      return d1 - d2;
    }
    const nameA = (a.ngoName || a.name || "").toLowerCase();
    const nameB = (b.ngoName || b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="min-h-screen bg-[#080B14] text-white">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase">Command Centers</h1>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Active NGOs holding mission control authority</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
               <div className="relative">
                  <input
                    placeholder="Search by ID or Name..."
                    value={ngoQuery}
                    onChange={(e) => setNgoQuery(e.target.value)}
                    className="bg-[#0f172a]/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all w-64 placeholder:text-gray-600 shadow-xl"
                  />
               </div>
               <select 
                value={sortBy} 
                onChange={(e) => e.target.value === "nearest" ? handleLocate() : setSortBy(e.target.value)}
                className="bg-[#0f172a] border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all cursor-pointer"
               >
                  <option value="name">Sort: Alpha</option>
                  <option value="nearest">Sort: Proximity</option>
               </select>
            </div>
          </div>

          {/* ── GRID ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-[#0f172a]/20 h-80 rounded-[2.5rem] animate-pulse" />)}
            </div>
          ) : sortedNgos.length === 0 ? (
            <div className="py-32 text-center bg-[#0f172a]/10 border border-dashed border-white/5 rounded-[3rem]">
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No Command Centers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedNgos.map((ngo) => {
                const ngoMissions = problems.filter(p => p.team?.includes(ngo._id) || p.leader === ngo._id).length;
                const specializations = ngo.skills || ngo.specialization || ["General Relief"];
                const dist = userLoc ? getDistance(userLoc.lat, userLoc.lng, ngo.location?.lat, ngo.location?.lng) : null;

                return (
                  <motion.div 
                    layout
                    key={ngo._id} 
                    className="bg-[#0f172a]/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-6 group hover:border-indigo-500/30 transition-all shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-6 right-6">
                      <button 
                        onClick={() => locateNgo(ngo)}
                        className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        📍 Locate HQ
                      </button>
                    </div>

                    <div className="flex items-start gap-4 pr-24">
                       <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl font-black text-white shrink-0">
                          {(ngo.ngoName || ngo.name)?.[0]?.toUpperCase() || "N"}
                       </div>
                       <div className="space-y-1">
                         <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight">{ngo.name || ngo.ngoName || "Unnamed NGO"}</h3>
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-widest px-2 py-0.5 bg-purple-500/10 rounded-md border border-purple-500/20">ID: {ngo.customId || ngo.displayId || ngo._id?.slice(-8).toUpperCase()}</span>
                           <span className="w-1 h-1 rounded-full bg-gray-700" />
                           <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Verified Command</span>
                         </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                       <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-2">🛠 Specializations</p>
                          <div className="flex flex-wrap gap-2">
                             {specializations.map((s, i) => (
                               <span key={i} className="text-[10px] font-bold text-gray-300 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">{s}</span>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-3 pt-2">
                       <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                          <div className="flex items-center gap-3">
                             <span className="text-indigo-400 text-lg">📊</span>
                             <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Active Missions</span>
                          </div>
                          <span className="text-xl font-black text-white">{ngoMissions}</span>
                       </div>
                       <div className="flex items-center gap-3 text-gray-400 text-[11px] font-bold px-1">
                          <span className="text-indigo-400">📧</span>
                          <span className="truncate">{ngo.email}</span>
                       </div>
                       <div className="flex items-start gap-3 text-gray-400 text-[11px] font-bold px-1">
                          <span className="text-indigo-400">📍</span>
                          <span className="leading-relaxed">{ngo.address || "Location Access Pending"}</span>
                       </div>
                       {dist !== null && (
                         <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest pl-7">
                            {dist.toFixed(1)} km from your location
                         </div>
                       )}
                    </div>

                    <div className="mt-auto pt-6 flex flex-col gap-2">
                       <button 
                        onClick={() => handleConnect(ngo)}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                       >
                          Establish Neural Link
                       </button>
                       <div className="grid grid-cols-2 gap-2">
                         <button 
                          onClick={() => handleOpenRequest("assign")}
                          className="w-full py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                         >
                            Request Join
                         </button>
                         <button 
                          onClick={() => handleOpenRequest("lead")}
                          className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                         >
                            Request Lead
                         </button>
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </PageWrapper>

      {/* ── REQUEST MODAL ── */}
      <AnimatePresence>
        {showRequestModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRequestModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999]" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="fixed inset-x-4 top-[20%] md:inset-x-auto md:left-1/2 md:-ml-[200px] md:w-[400px] bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 z-[10000] shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-black uppercase tracking-widest text-white">Directives Request</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  Transmitting <span className="text-indigo-400">{requestType === 'lead' ? 'Leadership' : 'Entry'}</span> request to Command Center
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 ml-2">Target Mission ID</label>
                <select 
                  value={selectedProbId}
                  onChange={(e) => setSelectedProbId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-5 text-sm text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-inner"
                >
                  <option value="">-- Select Active Mission --</option>
                  {problems.map(p => (
                    <option key={p._id} value={p._id} className="bg-[#0f172a]">{p.title} ({p.problemId})</option>
                  ))}
                </select>
                <div className="relative">
                   <div className="absolute left-5 top-5 text-[10px] font-black text-gray-700 uppercase tracking-widest">Manual ID:</div>
                   <input 
                    placeholder="PRB-XXXXXX"
                    onChange={(e) => {
                      const found = problems.find(p => p.problemId === e.target.value.toUpperCase() || p.displayId === e.target.value.toUpperCase());
                      if (found) setSelectedProbId(found._id);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-5 pl-24 text-sm text-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                   />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                 <button 
                  onClick={submitRequest} 
                  disabled={isSubmitting || !selectedProbId}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all"
                 >
                   {isSubmitting ? "Transmitting..." : "Send Request"}
                 </button>
                 <button onClick={() => setShowRequestModal(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Abort Request</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NGOPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white font-black uppercase tracking-[0.3em] animate-pulse">Syncing Command Grid...</div>}>
      <NGOContent />
    </Suspense>
  );
}
