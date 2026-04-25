"use client";
import { useEffect, useState, Suspense } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const ROLE_FILTERS = [
  { key: "all",       label: "All Responders" },
  { key: "volunteer", label: "Volunteers"  },
  { key: "worker",    label: "Field Workers" },
];

function VolunteersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addMemberTo = searchParams.get("addMemberTo");
  
  const [users, setUsers] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("all");
  const [userLoc, setUserLoc] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProbId, setSelectedProbId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      
      const helpers = uRes.data.filter(u => 
        ["volunteer", "worker"].includes(u.role?.toLowerCase())
      );
      setUsers(helpers);
      setProblems(pRes.data.filter(p => p.status !== "RESOLVED"));
    } catch (err) {
      toast.error("Failed to sync responder network.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocate = async () => {
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortBy("nearest");
      toast.success("GPS Lock: Proximity sorting active.");
    } catch (err) {
      toast.error("Location services offline.");
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

  const filtered = users.filter((u) => {
    // 1. Exclude self
    if (currentUser && (u._id === currentUser._id || u._id === currentUser.id)) return false;

    // 2. Search
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      const code = String(u.customId || u.displayId || "").toLowerCase();
      const name = String(u.name || "").toLowerCase();
      if (!code.includes(s) && !name.includes(s)) return false;
    }

    // 3. Tab filter
    if (filterRole !== "all" && u.role?.toLowerCase() !== filterRole) return false;

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "nearest" && userLoc) {
      const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
      const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
      return d1 - d2;
    }
    return (a.name || "").localeCompare(b.name || "");
  });

  const canAssign = (targetRole) => {
    if (!currentUser) return false;
    const myRole = currentUser.role?.toLowerCase();
    const tRole = targetRole?.toLowerCase();
    if (["ngo", "admin"].includes(myRole)) return true;
    if (myRole === "worker" && tRole === "volunteer") return true;
    if (myRole === "volunteer" && tRole === "volunteer") return true;
    return false;
  };

  const submitAssignment = async () => {
    if (!selectedProbId) return toast.error("Select a target mission.");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${selectedProbId}/request`, {
        type: "assign",
        userId: selectedUser._id
      }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(`${selectedUser.name} added to deployment queue.`);
      setShowAssignModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Deployment failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-white">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase">Responder Network</h1>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Global tactical personnel & field specialist pool</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
               <div className="relative">
                  <input
                    placeholder="Search by ID or Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* ── FILTERS ── */}
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterRole(key)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  filterRole === key ? "bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-500/20" : "bg-white/5 text-gray-500 border-white/5 hover:border-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── GRID ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => <div key={i} className="bg-[#0f172a]/20 h-80 rounded-[2.5rem] animate-pulse" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-32 text-center bg-[#0f172a]/10 border border-dashed border-white/5 rounded-[3rem]">
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No matching responders found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {sorted.map((u) => {
                const skills = Array.from(new Set([...(u.skills || []), u.skill].filter(Boolean)));
                const isVol = u.role?.toLowerCase() === "volunteer";
                const isBusy = u.status === "busy";
                const dist = userLoc ? getDistance(userLoc.lat, userLoc.lng, u.location?.lat, u.location?.lng) : null;

                return (
                  <motion.div 
                    layout
                    key={u._id} 
                    className="bg-[#0f172a]/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-6 group hover:border-white/10 transition-all shadow-2xl relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start">
                       <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xl font-black text-white">
                          {u.name?.[0]?.toUpperCase()}
                       </div>
                       <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${isBusy ? "border-red-500/30 text-red-400 bg-red-500/5" : "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"}`}>
                          {isBusy ? "Busy" : "Available"}
                       </div>
                    </div>

                    <div className="space-y-1">
                       <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">{u.name}</h3>
                       <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isVol ? "text-emerald-400" : "text-blue-400"}`}>
                             {isVol ? "Volunteer" : "Field Worker"}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-gray-700" />
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{u.customId || u.displayId}</span>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center gap-3 text-gray-500 text-[10px] font-bold">
                          <span>📍</span>
                          <span className="truncate">{u.address || "Field Operator"}</span>
                       </div>
                       {dist !== null && (
                         <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                            {dist.toFixed(1)} km from your location
                         </div>
                       )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-4 border-t border-white/5">
                       {skills.slice(0, 3).map(s => (
                         <span key={s} className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-bold text-gray-400 uppercase tracking-tight">{s}</span>
                       ))}
                       {skills.length > 3 && <span className="text-[9px] font-bold text-gray-600">+{skills.length - 3} more</span>}
                    </div>

                    <div className="mt-auto pt-4 flex flex-col gap-3">
                       {canAssign(u.role) && (
                         <button 
                          onClick={() => { setSelectedUser(u); setShowAssignModal(true); }}
                          className="w-full py-3.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg"
                         >
                            Assign to Mission
                         </button>
                       )}
                       <button 
                        onClick={() => router.push(`/chat?id=${u._id}`)}
                        className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                       >
                          Establish Link
                       </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </PageWrapper>

      {/* ── ASSIGN MODAL ── */}
      <AnimatePresence>
        {showAssignModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999]" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="fixed inset-x-4 top-[20%] md:inset-x-auto md:left-1/2 md:-ml-[200px] md:w-[400px] bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 z-[10000] shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-black uppercase tracking-widest text-white">Mobilize Personnel</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Assigning {selectedUser?.name} to deployment</p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 ml-2">Select Active Mission</label>
                <select 
                  value={selectedProbId}
                  onChange={(e) => setSelectedProbId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-5 text-sm text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-inner"
                >
                  <option value="">-- Choose Mission --</option>
                  {problems.map(p => (
                    <option key={p._id} value={p._id} className="bg-[#0f172a]">{p.title} ({p.problemId})</option>
                  ))}
                </select>
                <div className="relative">
                   <div className="absolute left-5 top-5 text-[10px] font-black text-gray-700 uppercase tracking-widest">Manual ID:</div>
                   <input 
                    placeholder="PRB-XXXXXX"
                    onChange={(e) => {
                      const found = problems.find(p => p.problemId === e.target.value.toUpperCase());
                      if (found) setSelectedProbId(found._id);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-5 pl-24 text-sm text-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                   />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                 <button 
                  onClick={submitAssignment} 
                  disabled={isSubmitting || !selectedProbId}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all"
                 >
                   {isSubmitting ? "Processing..." : "Authorize Deployment"}
                 </button>
                 <button onClick={() => setShowAssignModal(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Cancel Request</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VolunteersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white font-black uppercase tracking-[0.3em] animate-pulse">Synchronizing Network...</div>}>
      <VolunteersContent />
    </Suspense>
  );
}
