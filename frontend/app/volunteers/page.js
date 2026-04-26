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
  { key: "worker",    label: "Field Staff" },
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
      
      const helpers = Array.isArray(uRes.data) ? uRes.data.filter(u => 
        ["volunteer", "worker"].includes(u.role?.toLowerCase())
      ) : [];
      
      setUsers(helpers);
      setProblems(Array.isArray(pRes.data.data) ? pRes.data.data.filter(p => p.status !== "resolved") : []);
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
      toast.success("GPS Lock: Proximity sorting active.");
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
      const code = String(u.customId || u.displayId || u._id).toLowerCase();
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
    if (!selectedProbId) return toast.error("Select a mission target.");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${selectedProbId}/assign`, {
        userId: selectedUser._id
      }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(`${selectedUser.name} added to deployment queue.`);
      setShowAssignModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Mobilization failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Responder Network</h1>
              <p className="text-sm text-gray-500 font-medium">Verify and coordinate specialized field personnel.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <input
                placeholder="Search ID or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!w-64 !rounded-xl !py-3 !px-5"
              />
              <select 
                value={sortBy} 
                onChange={(e) => e.target.value === "nearest" ? handleLocate() : setSortBy(e.target.value)}
                className="!bg-white/5 !border-none !rounded-xl !py-3 !px-4 !text-xs !font-bold uppercase tracking-widest text-gray-400 cursor-pointer"
              >
                <option value="name">Sort: Name</option>
                <option value="nearest">Sort: Nearest</option>
              </select>
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-fit">
            {ROLE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterRole(key)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterRole === key ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-gray-500 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* GRID */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <div key={i} className="card h-80 animate-pulse" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-32 text-center card border-dashed border-white/10">
              <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">No personnel matching criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sorted.map((u) => {
                const skills = Array.from(new Set([...(u.skills || []), u.skill].filter(Boolean)));
                const isVol = u.role?.toLowerCase() === "volunteer";
                const isBusy = u.status === "busy";
                const dist = userLoc ? getDistance(userLoc.lat, userLoc.lng, u.location?.lat, u.location?.lng) : null;

                return (
                  <motion.div 
                    layout key={u._id} 
                    className="card flex flex-col group relative overflow-hidden"
                  >
                    <div className="p-6 pb-0 flex justify-between items-start">
                       <div className="w-12 h-12 rounded-2xl bg-purple-600/10 flex items-center justify-center text-xl font-bold text-purple-400 border border-purple-500/20">
                          {u.name?.[0]?.toUpperCase()}
                       </div>
                       <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${isBusy ? "border-red-500/20 text-red-500 bg-red-500/5" : "border-emerald-500/20 text-emerald-500 bg-emerald-500/5"}`}>
                          {isBusy ? "Busy" : "Ready"}
                       </span>
                    </div>

                    <div className="p-6 flex-1 space-y-4">
                       <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors truncate">{u.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[9px] font-black uppercase tracking-widest ${isVol ? "text-emerald-500" : "text-blue-500"}`}>
                                {isVol ? "Volunteer" : "Field Staff"}
                             </span>
                             <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">ID: {String(u.customId || u.displayId || u._id).slice(-6).toUpperCase()}</span>
                          </div>
                       </div>

                       <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                             <span>📍</span>
                             <span className="truncate">{u.address || "Sector Unassigned"}</span>
                          </div>
                          {dist !== null && (
                            <div className="text-[9px] font-bold text-purple-400 uppercase tracking-widest bg-purple-500/5 w-fit px-2 py-0.5 rounded-md">
                               {dist.toFixed(1)} km away
                            </div>
                          )}
                       </div>

                       <div className="flex flex-wrap gap-1.5">
                          {skills.slice(0, 3).map(s => (
                            <span key={s} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[9px] font-bold text-gray-400 uppercase tracking-tight">{s}</span>
                          ))}
                          {skills.length > 3 && <span className="text-[9px] font-bold text-gray-600">+{skills.length - 3}</span>}
                       </div>
                    </div>

                    <div className="p-6 pt-0 mt-auto flex flex-col gap-2">
                       {canAssign() && (
                         <button 
                          onClick={() => { setSelectedUser(u); setShowAssignModal(true); }}
                          className="btn-primary !py-2.5 !text-[10px] !font-black uppercase tracking-widest"
                         >
                            Mobilize
                         </button>
                       )}
                       <button 
                        onClick={() => router.push(`/chat?id=${u._id}`)}
                        className="btn-secondary !py-2.5 !text-[10px] !font-black uppercase tracking-widest"
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

      {/* ASSIGN MODAL */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
              className="relative w-full max-w-md card !p-10 space-y-8 shadow-2xl"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-1">Personnel Mobilization</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Deploying {selectedUser?.name} to Active Duty</p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Select Mission Target</label>
                <select 
                  value={selectedProbId}
                  onChange={(e) => setSelectedProbId(e.target.value)}
                  className="w-full !rounded-2xl !p-4 !text-sm"
                >
                  <option value="">-- Mission List --</option>
                  {problems.map(p => (
                    <option key={p._id} value={p._id}>{p.title} ({p.problemId})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3">
                 <button 
                  onClick={submitAssignment} 
                  disabled={isSubmitting || !selectedProbId}
                  className="btn-primary !py-4 !text-[10px] !font-black uppercase tracking-[0.2em]"
                 >
                   {isSubmitting ? "Processing..." : "Authorize Deployment"}
                 </button>
                 <button onClick={() => setShowAssignModal(false)} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Abort</button>
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
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-white font-black uppercase tracking-[0.3em] animate-pulse">Syncing Network...</div>}>
      <VolunteersContent />
    </Suspense>
  );
}
