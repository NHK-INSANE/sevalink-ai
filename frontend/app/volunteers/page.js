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
  { key: "all",       label: "All Personnel" },
  { key: "volunteer", label: "Volunteers"  },
  { key: "worker",    label: "Field Workers" },
];

function VolunteersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
      
      const helpers = (Array.isArray(uRes.data) ? uRes.data : []).filter(u => 
        ["volunteer", "worker", "Volunteer", "Worker"].includes(u.role?.toLowerCase())
      );
      setUsers(helpers);
      setProblems((Array.isArray(pRes.data) ? pRes.data : pRes.data.data || []).filter(p => p.status !== "RESOLVED"));
    } catch (err) {
      toast.error("Network synchronization failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocate = async () => {
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortBy("nearest");
      toast.success("GPS Proximity Locked");
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

  const filtered = users.filter((u) => {
    if (currentUser && (u._id === currentUser._id || u._id === currentUser.id)) return false;
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      const code = String(u.customId || u.displayId || "").toLowerCase();
      const name = String(u.name || "").toLowerCase();
      if (!code.includes(s) && !name.includes(s)) return false;
    }
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

  const canAssign = () => {
    if (!currentUser) return false;
    const myRole = currentUser.role?.toLowerCase();
    return ["ngo", "admin"].includes(myRole);
  };

  const submitAssignment = async () => {
    if (!selectedProbId) return toast.error("Select a target mission.");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${selectedProbId}/assign`, {
        userId: selectedUser._id
      }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(`${selectedUser.name} mobilization request sent.`);
      setShowAssignModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Deployment failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-white pb-24 font-inter">
      <Navbar />
      <PageWrapper className="pt-28 px-6">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 border-b border-white/5 pb-10">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Coworkers</h1>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Coordinate with field specialists and verified helpers.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
               <div className="relative group">
                 <input
                   placeholder="Search by ID or Name..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
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

          <div className="flex flex-wrap gap-2 mb-10">
            {ROLE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterRole(key)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterRole === key ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "bg-white/5 text-gray-600 border border-white/5 hover:border-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatePresence>
              {loading ? (
                [...Array(8)].map((_, i) => <div key={i} className="card h-64 animate-pulse !rounded-[2.5rem] bg-white/5" />)
              ) : sorted.length === 0 ? (
                <div className="col-span-full py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
                  <p className="text-gray-600 font-black uppercase tracking-[0.2em] text-[10px]">No verified coworkers found in this sector</p>
                </div>
              ) : (
                sorted.map((u) => {
                  const skills = Array.from(new Set([...(u.skills || []), u.skill].filter(Boolean)));
                  return (
                    <motion.div 
                      layout key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="card !p-10 flex flex-col gap-8 group relative overflow-hidden !rounded-[2.5rem] bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all shadow-2xl"
                    >
                      <div className="space-y-2">
                         <h3 className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors truncate tracking-tighter uppercase">{u.name}</h3>
                         <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">ID: {u.customId || u.displayId || u._id.slice(-6).toUpperCase()}</p>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                            <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Expertise Unit</p>
                            <div className="flex flex-wrap gap-1.5">
                               {skills.slice(0, 3).map(s => (
                                 <span key={s} className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest">{s}</span>
                               ))}
                            </div>
                         </div>
                         <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate">
                            <span className="text-emerald-500">📍</span>
                            <span className="truncate">{u.address || u.location?.address || "Field Operator"}</span>
                         </div>
                      </div>

                      <div className="mt-auto pt-6 flex gap-3 border-t border-white/5">
                         <button 
                          onClick={() => router.push(`/profile/${u._id}`)}
                          className="flex-1 btn-secondary !py-3 !text-[9px] !font-black uppercase tracking-widest !rounded-xl"
                         >
                            Intel
                         </button>
                         {canAssign() && (
                           <button 
                            onClick={() => { setSelectedUser(u); setShowAssignModal(true); }}
                            className="flex-1 btn-primary !py-3 !text-[9px] !font-black uppercase tracking-widest !rounded-xl"
                           >
                              Deploy
                           </button>
                         )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </PageWrapper>

      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} 
              className="relative w-full max-w-md card !p-12 space-y-10 shadow-[0_0_50px_rgba(147,51,234,0.1)] !rounded-[3rem] bg-[#0B1120] border-white/10"
            >
              <div className="text-center">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Mobilize Unit</h2>
                <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">Assigning {selectedUser?.name} to Active Mission</p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 ml-1">Operational Node Selection</label>
                <select 
                  value={selectedProbId}
                  onChange={(e) => setSelectedProbId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-purple-500 outline-none transition-all font-bold"
                >
                  <option value="" className="bg-[#0B1120]">-- SELECT MISSION ID --</option>
                  {problems.map(p => (
                    <option key={p._id} value={p._id} className="bg-[#0B1120]">{p.title} ({p.problemId})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-4">
                 <button 
                  onClick={submitAssignment} 
                  disabled={isSubmitting || !selectedProbId}
                  className="bg-purple-600 hover:bg-purple-500 text-white py-5 text-xs font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-20"
                 >
                   {isSubmitting ? "TRANSMITTING..." : "Confirm Deployment"}
                 </button>
                 <button onClick={() => setShowAssignModal(false)} className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700 hover:text-white transition-colors">Abort Logic</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VolunteersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white font-black uppercase tracking-[0.4em] animate-pulse">Syncing Tactical Network...</div>}>
      <VolunteersContent />
    </Suspense>
  );
}
