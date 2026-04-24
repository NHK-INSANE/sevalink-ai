"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { SkeletonCard } from "../components/Skeleton";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function NGOPage() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedNgo, setSelectedNgo] = useState(null);
  const [connectReason, setConnectReason] = useState("");
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("seva_user")) : null;
    setUser(u);
  }, []);

  const handleLocate = async () => {
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortBy("nearest");
      toast.success("Location acquired. Sorting by proximity.");
    } catch (err) {
      toast.error("Could not get location");
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

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((data) => {
        const onlyNgos = data.filter((u) => u.role?.toLowerCase() === "ngo" || u.role === "NGO");
        setNgos(onlyNgos);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const sortedNgos = [...ngos].sort((a, b) => {
    if (sortBy === "nearest" && userLoc) {
      const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
      const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
      return d1 - d2;
    }
    const nameA = (a.ngoName || a.name || "").toLowerCase();
    const nameB = (b.ngoName || b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const [problems, setProblems] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState(""); // "join" or "lead"
  const [selectedProbId, setSelectedProbId] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/problems`).then(res => res.json()).then(setProblems);
  }, []);

  const handleOpenRequest = (ngo, type) => {
    setSelectedNgo(ngo);
    setRequestType(type);
    setShowRequestModal(true);
  };

  const submitJoinRequest = async () => {
    if (!selectedProbId) return toast.error("Please select a problem");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          ngoId: selectedNgo._id,
          problemId: selectedProbId,
          type: requestType, // "join" or "lead"
          userId: user._id || user.id
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Request for ${requestType === 'lead' ? 'leadership' : 'joining'} sent to ${selectedNgo.ngoName || selectedNgo.name}`);
        setShowRequestModal(false);
      } else toast.error(data.error || "Request failed");
    } catch (err) { toast.error("Connection failed"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Navbar />
      <PageWrapper>
        <div className="page-wrapper pt-28 pb-20">
          <main className="flex flex-col gap-[32px]">
          
          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Registered NGOs</h1>
              <p className="text-[var(--text-secondary)] text-sm font-medium">Active organizations coordinating response on SevaLink.</p>
            </div>

            <div className="flex items-center gap-3">
              <select 
                value={sortBy} 
                onChange={(e) => {
                  if (e.target.value === "nearest" && !userLoc) handleLocate();
                  else setSortBy(e.target.value);
                }}
                className="bg-[#0B1220] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-300 outline-none hover:border-purple-500/50 transition cursor-pointer"
              >
                <option value="name" className="bg-[#0B1220]">Sort by Name</option>
                <option value="nearest" className="bg-[#0B1220]">Sort by Nearest</option>
              </select>
            </div>
          </div>

          {/* ── Grid ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : sortedNgos.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
              <p className="text-white font-semibold">No NGOs found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedNgos.map((ngo) => (
                <div key={ngo._id} className="card card-hover-effect !p-6 flex flex-col gap-0">
                  <div className="flex justify-between items-start pb-4 mb-4 border-b border-white/5">
                    <h3 className="text-base font-bold text-white line-clamp-1">{ngo.ngoName || ngo.name || "Unnamed NGO"}</h3>
                    <span className="text-[9px] font-bold text-emerald-400 border border-emerald-400/30 px-2 py-0.5 rounded-md uppercase tracking-wider">Verified</span>
                  </div>

                  <div className="flex flex-col gap-2.5 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Email</span>
                      <span className="text-gray-300 truncate max-w-[160px]">{ngo.email}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Phone</span>
                      <span className="text-gray-300">{ngo.phone || "Not listed"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-auto">
                    <button 
                      onClick={() => handleConnect(ngo)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-indigo-500/20"
                      style={{ background: "linear-gradient(to right, #7c3aed, #6366f1)" }}
                    >
                      Connect with NGO
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                       <button 
                         onClick={() => handleOpenRequest(ngo, "join")}
                         className="py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                       >
                         Request Join
                       </button>
                       <button 
                         onClick={() => handleOpenRequest(ngo, "lead")}
                         className="py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 transition-all"
                       >
                         Request Lead
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </main>
        </div>
      </PageWrapper>

      {/* ── Connect Modal ── */}
      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConnectModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-[#0B1220] p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl relative z-10"
            >
              <h2 className="text-xl font-extrabold text-white mb-2">Connect with {selectedNgo?.ngoName || selectedNgo?.name}</h2>
              <p className="text-gray-400 text-sm mb-6">Briefly explain why you want to coordinate with this organization.</p>
              <textarea placeholder="Reason for connection..." value={connectReason} onChange={(e) => setConnectReason(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500 transition-all mb-6 resize-none" />
              <div className="flex gap-3">
                <button onClick={() => setShowConnectModal(false)} className="flex-1 py-3 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button 
                  onClick={submitConnectRequest} 
                  disabled={isSubmitting}
                  className="flex-[2] py-3 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 bg-gradient-to-r from-purple-600 to-indigo-600" 
                >
                  {isSubmitting ? "Sending..." : "Send Request"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Request Modal ── */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRequestModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-[#0B1220] p-7 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl relative z-10"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter">{requestType === 'lead' ? 'Leadership' : 'Mission'} Request</h2>
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">To: {selectedNgo?.ngoName || selectedNgo?.name}</p>
              </div>

              <div className="space-y-4 mb-8">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Select Target Problem</label>
                <select 
                  value={selectedProbId}
                  onChange={(e) => setSelectedProbId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-purple-500 transition-all appearance-none shadow-inner"
                >
                  <option value="">-- Choose Problem --</option>
                  {problems.filter(p => p.status !== "Resolved").map(p => (
                    <option key={p._id} value={p._id} className="bg-[#0B1220]">{p.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setShowRequestModal(false)} className="flex-1 py-3.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button 
                  onClick={submitJoinRequest} 
                  disabled={isSubmitting}
                  className="flex-[2] py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-purple-500/20 bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  {isSubmitting ? "Submitting..." : "Send Request"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
