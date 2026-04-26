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
  const [requestType, setRequestType] = useState("assign"); // "assign", "lead", "other"
  const [selectedProbId, setSelectedProbId] = useState("");
  const [inputUserId, setInputUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNgo, setSelectedNgo] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const u = JSON.parse(localStorage.getItem("seva_user") || "null");
      setCurrentUser(u);
      if (u) setInputUserId(u.id || u._id);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, pRes] = await Promise.all([
        axios.get(`${API_BASE}/api/users`),
        axios.get(`${API_BASE}/api/problems`)
      ]);
      const onlyNgos = (Array.isArray(uRes.data) ? uRes.data : []).filter(u => u.role?.toLowerCase() === "ngo");
      setNgos(onlyNgos);
      setProblems(Array.isArray(pRes.data) ? pRes.data : pRes.data.data || []);
    } catch (err) {
      toast.error("Failed to sync partners.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (ngo) => {
    if (!currentUser) return toast.error("Authentication required.");
    router.push(`/chat?id=${ngo._id}`);
  };

  const handleOpenRequest = (ngo) => {
    if (!currentUser) return toast.error("Authentication required.");
    setSelectedNgo(ngo);
    setShowRequestModal(true);
  };

  const submitRequest = async () => {
    if (requestType === "other") {
       handleConnect(selectedNgo);
       return;
    }
    if (!selectedProbId) return toast.error("Select a target mission.");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      // This sends an automated message to the NGO as requested
      await axios.post(`${API_BASE}/api/problems/${selectedProbId}/${requestType}`, {
        targetUserId: inputUserId
      }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(`Request transmitted to ${selectedNgo.name}.`);
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
      toast.success("GPS Lock: Proximity active.");
    } catch (err) {
      toast.error("Location services unavailable.");
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
      const code = String(n.displayId || n.customId || n._id).toLowerCase();
      const name = String(n.ngoName || n.name || "").toLowerCase();
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
    const nameA = String(a.ngoName || a.name || "").toLowerCase();
    const nameB = String(b.ngoName || b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="min-h-screen bg-[#080B14] text-white pb-24 font-inter">
      <Navbar />
      <PageWrapper className="pt-28 px-6">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 border-b border-white/5 pb-10">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">NGO Partners</h1>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Coordinate with authorized mission organizations.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
               <div className="relative group">
                 <input
                   placeholder="Search by ID or Name..."
                   value={ngoQuery}
                   onChange={(e) => setNgoQuery(e.target.value)}
                   className="w-64 bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-xs text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-700 font-bold"
                 />
                 <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
               </div>
               
               <select 
                value={sortBy} 
                onChange={(e) => e.target.value === "nearest" ? handleLocate() : setSortBy(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-2xl py-3.5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 outline-none cursor-pointer focus:border-purple-500"
               >
                  <option value="name">Sort by Name</option>
                  <option value="nearest">Sort by Nearest</option>
               </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {loading ? (
                [...Array(6)].map((_, i) => <div key={i} className="card h-64 animate-pulse !rounded-[2.5rem] bg-white/5" />)
              ) : sortedNgos.length === 0 ? (
                <div className="col-span-full py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
                  <p className="text-gray-600 font-black uppercase tracking-[0.2em] text-[10px]">No partners found in this sector</p>
                </div>
              ) : (
                sortedNgos.map((ngo) => (
                  <motion.div 
                    layout key={ngo._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="card !p-10 flex flex-col gap-8 group relative overflow-hidden !rounded-[2.5rem] bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all shadow-2xl"
                  >
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors truncate tracking-tighter uppercase">{ngo.ngoName || ngo.name || "Partner NGO"}</h3>
                       <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">ID: {ngo.customId || ngo.displayId || ngo._id.slice(-6).toUpperCase()}</p>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-3">
                          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate">
                             <span className="text-emerald-500">📍</span>
                             <span className="truncate">{ngo.address || ngo.location?.address || "Region Office"}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate">
                             <span className="text-purple-400">📧</span>
                             <span className="truncate">{ngo.email || "Contact Pending"}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate">
                             <span className="text-blue-400">🌐</span>
                             <span className="truncate">{ngo.ngoContact || ngo.website || "No digital portal"}</span>
                          </div>
                       </div>
                    </div>

                    <div className="mt-auto pt-6 flex gap-3 border-t border-white/5">
                       <button 
                        onClick={() => handleConnect(ngo)}
                        className="flex-1 btn-secondary !py-3 !text-[9px] !font-black uppercase tracking-widest !rounded-xl"
                       >
                          Contact
                       </button>
                       <button 
                        onClick={() => handleOpenRequest(ngo)}
                        className="flex-1 btn-primary !py-3 !text-[9px] !font-black uppercase tracking-widest !rounded-xl"
                       >
                          Request Help
                       </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </PageWrapper>

      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRequestModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} 
              className="relative w-full max-w-md card !p-12 space-y-10 shadow-[0_0_50px_rgba(147,51,234,0.1)] !rounded-[3rem] bg-[#0B1120] border-white/10"
            >
              <div className="text-center">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Request Assistance</h2>
                <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">Transmitting to {selectedNgo?.ngoName || selectedNgo?.name}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 ml-1">Mission Identification</label>
                  <input placeholder="Enter Problem ID" value={selectedProbId} onChange={(e) => setSelectedProbId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-purple-500 outline-none font-bold" />
                  <input placeholder="Enter User ID" value={inputUserId} onChange={(e) => setInputUserId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-purple-500 outline-none font-bold" />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 ml-1">Tactical Selection</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["assign", "lead", "other"].map(t => (
                      <button 
                        key={t} onClick={() => setRequestType(t)}
                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${requestType === t ? "bg-purple-600 text-white border-transparent" : "bg-white/5 text-gray-600 border-white/5"}`}
                      >
                        {t === 'assign' ? 'Assign Request' : t === 'lead' ? 'Leadership' : 'Others'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                 <button 
                  onClick={submitRequest} 
                  disabled={isSubmitting || (!selectedProbId && requestType !== 'other')}
                  className="bg-purple-600 hover:bg-purple-500 text-white py-5 text-xs font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-20"
                 >
                   {isSubmitting ? "TRANSMITTING..." : "Transmit Request"}
                 </button>
                 <button onClick={() => setShowRequestModal(false)} className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700 hover:text-white transition-colors">Abort</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NGOPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white font-black uppercase tracking-[0.4em] animate-pulse">Syncing Command Hub...</div>}>
      <NGOContent />
    </Suspense>
  );
}
