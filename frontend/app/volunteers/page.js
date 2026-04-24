"use client";
import { useEffect, useState, Suspense } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const ROLE_FILTERS = [
  { key: "all",       label: "All Helpers" },
  { key: "volunteer", label: "Volunteers"  },
  { key: "worker",    label: "Workers"     },
];
function VolunteersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addMemberTo = searchParams.get("addMemberTo");
  const [targetProblem, setTargetProblem] = useState(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("all");
  const [userLoc, setUserLoc] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [connectReason, setConnectReason] = useState("");
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("seva_user")) : null;
    setUser(u);
  }, []);

  useEffect(() => {
    if (addMemberTo) {
      fetch(`${API_BASE}/api/problems`).then(res => res.json()).then(data => {
        const prob = data.find(p => p._id === addMemberTo);
        setTargetProblem(prob);
      });
    }
  }, [addMemberTo]);

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
    getUsers()
      .then((data) => {
        const helpers = data.filter((u) => u.role?.toLowerCase() === "volunteer" || u.role?.toLowerCase() === "worker");
        setUsers(helpers);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterRole === "all" ? users : users.filter((u) => u.role?.toLowerCase() === filterRole);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "nearest" && userLoc) {
      const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
      const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
      return d1 - d2;
    }
    return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
  });

  const [problems, setProblems] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProbId, setSelectedProbId] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/problems`).then(res => res.json()).then(setProblems);
  }, []);

  const handleConnect = (user) => {
    setSelectedUser(user);
    setShowConnectModal(true);
  };

  const handleOpenAssign = (u) => {
    setSelectedUser(u);
    setShowAssignModal(true);
  };

  const handleAddToMission = async (targetUserId) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/problems/${addMemberTo}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ memberId: targetUserId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Successfully added to the mission team");
        router.push("/problems");
      } else toast.error(data.error || "Failed to add member");
    } catch (err) { toast.error("Connection error"); }
    finally { setIsSubmitting(false); }
  };

  const submitAssignment = async () => {
    if (!selectedProbId) return toast.error("Please select a problem");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/problems/${selectedProbId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          volunteerId: selectedUser._id,
          volunteerName: selectedUser.name
        })
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else {
        toast.success(`${selectedUser.name} assigned to mission`);
        setShowAssignModal(false);
      }
    } catch (err) { toast.error("Assignment failed"); }
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
          toUser: selectedUser._id,
          fromName: user.name,
          message: connectReason
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Request sent to ${selectedUser.name}`);
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

  const canAssign = (targetRole) => {
    if (!user) return false;
    const uRole = user.role?.toLowerCase();
    const tRole = targetRole?.toLowerCase();
    if (uRole === "admin" || uRole === "ngo") return true;
    if (uRole === "worker" && tRole === "volunteer") return true;
    if (uRole === "volunteer" && tRole === "volunteer") return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Navbar />
      <PageWrapper>
        <div className="page-wrapper pt-28 pb-20">
          <main className="flex flex-col gap-[32px]">
          
          {/* ── Selection Banner ── */}
          {addMemberTo && targetProblem && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="16" x2="22" y1="11" y2="11"/></svg>
                 </div>
                 <div>
                   <h2 className="text-sm font-black uppercase text-white tracking-widest">Recruitment Mode</h2>
                   <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">Adding members to: <span className="text-purple-400">{targetProblem.title}</span></p>
                 </div>
              </div>
              <button onClick={() => router.push("/problems")} className="text-[10px] font-black uppercase text-gray-500 hover:text-white tracking-widest transition-colors">Cancel</button>
            </motion.div>
          )}

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Helpers &amp; Volunteers</h1>
              <p className="text-[var(--text-secondary)] text-sm font-medium">People actively resolving civic issues across the network.</p>
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

          {/* ── Filter Pills ── */}
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterRole(key)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  filterRole === key 
                    ? "bg-indigo-600/20 text-white border-indigo-500/50 shadow-lg shadow-indigo-500/10" 
                    : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
              <p className="text-white font-semibold">No helpers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sorted.map((u) => {
                const rawSkills = Array.isArray(u.skills) ? u.skills : (u.skills ? [u.skills] : []);
                const skills = Array.from(new Set([...rawSkills, u.skill].filter(Boolean)));
                const isVol = u.role?.toLowerCase() === "volunteer";
                const isWorker = u.role?.toLowerCase() === "worker";

                return (
                  <div key={u._id} className="card card-hover-effect !p-6 flex flex-col gap-0">
                    <div className="flex justify-between items-start pb-4 mb-4 border-b border-white/5">
                      <h3 className="text-base font-bold text-white line-clamp-1">{u.name || "Unnamed Helper"}</h3>
                      <span className={`text-[9px] font-bold ${isVol ? "text-emerald-400 border-emerald-400/30" : "text-blue-400 border-blue-400/30"} border px-2 py-0.5 rounded-md uppercase tracking-wider`}>
                        {isVol ? "Volunteer" : "Worker"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 mb-6">
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-gray-500 font-semibold text-[10px] uppercase tracking-wider">Email</span>
                        <span className="text-gray-300 truncate max-w-[120px]">{u.email}</span>
                      </div>
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-gray-500 font-semibold text-[10px] uppercase tracking-wider">Phone</span>
                        <span className="text-gray-300">{u.phone || "Not listed"}</span>
                      </div>
                    </div>

                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-4 border-t border-white/5 mb-6">
                        {skills.slice(0, 2).map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-wider">{s}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mt-auto">
                      {addMemberTo ? (
                        <button 
                          onClick={() => handleAddToMission(u._id)}
                          disabled={isSubmitting || (user?.role?.toLowerCase() === 'volunteer' && isWorker)}
                          className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-purple-500/20 bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-30"
                        >
                          {isSubmitting ? "Adding..." : "Add to Team"}
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleConnect(u)}
                            className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-indigo-500/20"
                            style={{ background: isVol ? "linear-gradient(to right, #059669, #10b981)" : "linear-gradient(to right, #7c3aed, #6366f1)" }}
                          >
                            Connect
                          </button>
                          {canAssign(u.role) && (
                            <button 
                              onClick={() => handleOpenAssign(u)}
                              className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            >
                              Assign to Mission
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
              <h2 className="text-xl font-extrabold text-white mb-2">Connect with {selectedUser?.name}</h2>
              <p className="text-gray-400 text-sm mb-6">Briefly explain why you want to coordinate with this helper.</p>
              <textarea placeholder="Reason for connection..." value={connectReason} onChange={(e) => setConnectReason(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500 transition-all mb-6 resize-none" />
              <div className="flex gap-3">
                <button onClick={() => setShowConnectModal(false)} className="flex-1 py-3 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button 
                  onClick={submitConnectRequest} 
                  disabled={isSubmitting}
                  className="flex-[2] py-3 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50" 
                  style={{ background: "linear-gradient(to right, #7c3aed, #6366f1)" }}
                >
                  {isSubmitting ? "Sending..." : "Send Request"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Assign Modal ── */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-[#0B1220] p-7 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl relative z-10"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter">Mission Deployment</h2>
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">Assigning {selectedUser?.name} to Active Crisis</p>
              </div>

              <div className="space-y-4 mb-8">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Select Active Incident</label>
                <select 
                  value={selectedProbId}
                  onChange={(e) => setSelectedProbId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-purple-500 transition-all appearance-none"
                >
                  <option value="">-- Choose Problem --</option>
                  {problems.filter(p => p.status !== "Resolved").map(p => (
                    <option key={p._id} value={p._id} className="bg-[#0B1220]">{p.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setShowAssignModal(false)} className="flex-1 py-3.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors">Abort</button>
                <button 
                  onClick={submitAssignment} 
                  disabled={isSubmitting}
                  className="flex-[2] py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-purple-500/20 bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  {isSubmitting ? "Deploying..." : "Assign & Deploy"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

export default function VolunteersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B1220] flex items-center justify-center text-white">Initializing Neural Network...</div>}>
      <VolunteersContent />
    </Suspense>
  );
}
