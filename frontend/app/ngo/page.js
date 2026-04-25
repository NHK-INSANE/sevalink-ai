"use client";
import { useEffect, useState, Suspense } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { SkeletonCard } from "../components/Skeleton";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

function NGOContent() {
  const router = useRouter();
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedNgo, setSelectedNgo] = useState(null);
  const [connectReason, setConnectReason] = useState("");
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ngoQuery, setNgoQuery] = useState("");

  const locateNgo = (ngo) => {
    if (ngo.location?.lat && ngo.location?.lng) {
      router.push(`/map?lat=${ngo.location.lat}&lng=${ngo.location.lng}&title=${encodeURIComponent(ngo.ngoName || ngo.name || "NGO")}`);
    } else {
      toast.error("NGO location not available");
    }
  };

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

  const filteredNgos = ngos.filter(n => {
    if (ngoQuery) {
      const code = (n.displayId || n.customId || "").toLowerCase();
      if (!code.includes(ngoQuery.toLowerCase())) return false;
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
        toast.success(`Request sent to ${selectedNgo.ngoName || selectedNgo.name}`);
        setShowRequestModal(false);
        router.push("/problems");
      } else toast.error(data.error || "Request failed");
    } catch (err) { toast.error("Connection failed"); }
    finally { setIsSubmitting(false); }
  };

  const submitConnectRequest = async () => {
    if (!user) return toast.error("Please login to connect");
    if (!connectReason.trim()) return toast.error("Please provide a reason");
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE.replace("/api", "")}/api/connect`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          fromUser: user._id || user.id,
          toUser: selectedNgo._id,
          fromName: user.name,
          message: connectReason
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Request sent to ${selectedNgo.ngoName || selectedNgo.name}`);
        setShowConnectModal(false);
        setConnectReason("");
      } else {
        toast.error(data.error || "Failed to send request");
      }
    } catch (err) {
      toast.error("Connection failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Navbar />
      <PageWrapper>
        <div className="page-wrapper pt-28 pb-20">
          <main className="flex flex-col gap-[32px]">
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Registered NGOs</h1>
              <p className="text-[var(--text-secondary)] text-sm font-medium">Active organizations coordinating response on SevaLink.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                placeholder="Search NGO ID (e.g. NGO-99439011)"
                value={ngoQuery}
                onChange={(e) => setNgoQuery(e.target.value)}
                className="bg-[#0B1220] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-300 outline-none hover:border-purple-500/50 focus:border-purple-500 transition w-64 shadow-lg"
              />
              <div className="relative group">
                <select 
                  value={sortBy} 
                  onChange={(e) => {
                    if (e.target.value === "nearest" && !userLoc) handleLocate();
                    else setSortBy(e.target.value);
                  }}
                  className="bg-[#0B1220] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold text-gray-300 outline-none hover:border-purple-500/50 transition cursor-pointer appearance-none shadow-lg w-40"
                >
                  <option value="name" className="bg-[#0B1220]">Sort by Name</option>
                  <option value="nearest" className="bg-[#0B1220]">Sort by Nearest</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 group-hover:text-purple-400 transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          </div>

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
                <div key={ngo._id} className="card card-hover-effect !p-6 flex flex-col gap-0 relative">
                  
                  <div className="absolute top-3 right-3 z-10">
                    <button 
                      onClick={() => locateNgo(ngo)}
                      className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5"
                    >
                      📍 Locate
                    </button>
                  </div>

                  <div className="flex justify-between items-start pb-4 mb-4 border-b border-white/5 mt-4">
                    <div className="flex-1 pr-16">
                      <h3 className="text-lg font-black text-white tracking-tight leading-none group-hover:text-indigo-400 transition-colors">{ngo.ngoName || ngo.name || "Unnamed NGO"}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div 
                          className="flex items-center gap-1.5 group/id cursor-pointer" 
                          onClick={() => {
                            const idText = ngo.displayId || ngo.customId || "NGO-PENDING";
                            navigator.clipboard.writeText(idText);
                            toast.success("NGO ID copied to clipboard");
                          }}
                        >
                          <span className="text-[10px] font-mono text-indigo-400/80 bg-indigo-400/5 px-2 py-0.5 rounded border border-indigo-400/10 uppercase tracking-widest group-hover/id:border-indigo-400/30 transition-all">
                            {ngo.displayId || ngo.customId || "NGO-PENDING"}
                          </span>
                          <svg className="opacity-40 group-hover/id:opacity-100 transition-opacity text-indigo-400" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-tighter">Verified Partner</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mb-6">
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-gray-500 font-semibold text-[10px] uppercase tracking-wider mt-0.5">Email</span>
                      <span className="text-gray-300 truncate max-w-[160px] text-right font-medium">{ngo.email}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-semibold text-[10px] uppercase tracking-wider">Phone</span>
                      <span className="text-gray-300 font-medium">{ngo.phone || "Not listed"}</span>
                    </div>
                    <div className="flex justify-between items-start text-sm pt-3 border-t border-white/5 mt-1">
                      <span className="text-gray-500 font-bold text-[9px] uppercase tracking-widest mt-1">HQ Address</span>
                      <span className="text-gray-300 text-[11px] text-right max-w-[160px] font-medium leading-relaxed">{ngo.address || "Location Access Pending"}</span>
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

      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConnectModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[#0B1220] p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl relative z-10">
              <h2 className="text-xl font-extrabold text-white mb-2">Connect with {selectedNgo?.ngoName || selectedNgo?.name}</h2>
              <textarea placeholder="Reason..." value={connectReason} onChange={(e) => setConnectReason(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-purple-500 transition-all mb-6 resize-none" />
              <div className="flex gap-3">
                <button onClick={() => setShowConnectModal(false)} className="flex-1 py-3 text-xs font-bold text-gray-400">Cancel</button>
                <button onClick={submitConnectRequest} disabled={isSubmitting} className="flex-[2] py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-indigo-500/20 disabled:opacity-50">{isSubmitting ? "Sending..." : "Send Request"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRequestModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[#0B1220] p-7 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl relative z-10">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter">{requestType === 'lead' ? 'Leadership' : 'Mission'} Request</h2>
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">To: {selectedNgo?.ngoName || selectedNgo?.name}</p>
              </div>
              <div className="space-y-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Target Problem (Select or Enter ID)</label>
                  <select value={selectedProbId} onChange={(e) => setSelectedProbId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-purple-500 transition-all appearance-none">
                    <option value="" className="bg-[#0B1220]">-- Choose Problem --</option>
                    {problems.filter(p => p.status !== "Resolved").map(p => (
                      <option key={p._id} value={p._id} className="bg-[#0B1220]">{p.title} ({p.problemId})</option>
                    ))}
                  </select>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[10px] font-bold text-gray-600 uppercase tracking-widest">ENTER ID:</div>
                    <input 
                      type="text" 
                      placeholder="PRB-XXXXXX"
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        const found = problems.find(p => p.problemId === val || p.displayId === val);
                        if (found) setSelectedProbId(found._id);
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-24 text-sm text-white outline-none focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Your Personnel Code (ID)</label>
                   <input 
                     type="text" 
                     placeholder="VOL-XXXXXX / WKR-XXXXXX"
                     className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-purple-500 transition-all"
                   />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowRequestModal(false)} className="flex-1 py-3.5 text-xs font-bold text-gray-400">Cancel</button>
                <button onClick={submitJoinRequest} disabled={isSubmitting} className="flex-[2] py-3.5 rounded-xl text-xs font-black uppercase text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-xl shadow-purple-500/20">{isSubmitting ? "Submitting..." : "Send Request"}</button>
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
    <Suspense fallback={<div className="min-h-screen bg-[#0B1220] flex items-center justify-center text-white font-black uppercase tracking-[0.4em]">Syncing Global Grid...</div>}>
      <NGOContent />
    </Suspense>
  );
}
