"use client";
import { useState, useEffect } from "react";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function ProblemCard({ problem: initialProblem }) {
  const router = useRouter();
  const [problem, setProblem] = useState(initialProblem);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUser(JSON.parse(localStorage.getItem("seva_user") || "null"));
    }
  }, []);

  useEffect(() => {
    const handleUpdate = (updated) => { 
      if (updated._id === problem._id) setProblem(updated); 
    };
    socket.on("problem-updated", handleUpdate);
    return () => socket.off("problem-updated", handleUpdate);
  }, [problem._id]);

  const isOwner = (problem.reportedBy?.userId === currentUser?._id) || (problem.reportedBy?.userId === currentUser?.id);
  const isNGO = currentUser?.role === "ngo" || currentUser?.role === "admin";
  const isLeader = problem.team?.some(m => (m.userId === currentUser?._id || m.userId === currentUser?.id) && m.isLeader);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm("Terminate this mission? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${API_BASE}/api/problems/${problem._id}`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      if (res.data.success) {
        toast.success("Mission Terminated ✅");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Authorization failed.");
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(`${API_BASE}/api/problems/${problem._id}/status`, 
        { status: newStatus.toLowerCase() },
        { headers: { Authorization: `Bearer ${encodeURIComponent(token)}` } }
      );
      if (res.data.success) toast.success(`Mission status: ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Status update failed.");
    }
  };

  const handleAssign = async (e) => {
    e.stopPropagation();
    if (!currentUser) return toast.error("Authentication required.");
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${problem._id}/assign`, {}, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Deployment request transmitted.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Request failed.");
    }
  };

  const getStatusStyle = (s) => {
    const status = (s || "open").toLowerCase();
    if (status === "open") return "bg-white/5 text-gray-500 border-white/10";
    if (status.includes("progress")) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (status === "resolved") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    return "bg-white/5 text-gray-400 border-white/10";
  };

  const getSeverityStyle = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s === "critical") return "border-red-500/30 text-red-500 bg-red-500/10";
    if (s === "high") return "border-orange-500/30 text-orange-400 bg-orange-500/10";
    if (s === "medium") return "border-yellow-500/30 text-yellow-400 bg-yellow-500/10";
    return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
  };

  return (
    <motion.div 
      layout
      className="card !p-0 flex flex-col group relative overflow-hidden h-full !rounded-[2.5rem] bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all shadow-2xl"
    >
      {/* HEADER SECTION */}
      <div className="p-8 pb-0">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-wrap gap-2">
            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${getStatusStyle(problem.status)}`}>
              {problem.status?.replace("_", " ") || "OPEN"}
            </span>
            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${getSeverityStyle(problem.severity)}`}>
              {problem.severity || "MEDIUM"}
            </span>
          </div>
          
          {(isOwner || isNGO) && (
            <button 
              onClick={handleDelete}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-700 hover:text-red-500 hover:bg-red-500/10 transition-all group/del"
              title="Terminate Mission"
            >
              <svg className="group-hover/del:scale-110 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          )}
        </div>

        <div className="space-y-4">
           <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">{problem.problemId || "ID-PENDING"}</p>
           <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter group-hover:text-purple-400 transition-colors">
             {problem.title}
           </h3>
           <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
             {new Date(problem.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} // Sector: {problem.category || "General"}
           </p>
        </div>
      </div>

      {/* BODY SECTION */}
      <div className="p-8 space-y-6 flex-1">
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-[1.5rem]">
           <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-3 font-medium italic">
             "{problem.description}"
           </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Reported By: <span className="text-white">{problem.reportedBy?.name || "Neural Operator"}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-black uppercase tracking-widest truncate">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
             Location: <span className="text-white truncate">{problem.location?.address || "Tactical Grid"}</span>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION */}
      <div className="p-8 pt-0">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleAssign}
            className="btn-primary !py-4 !text-[10px] !font-black uppercase tracking-widest !rounded-2xl shadow-xl shadow-purple-500/20"
          >
            {problem.status === "open" ? "Mobilize" : "Join"}
          </button>
          
          <button 
            onClick={() => router.push(`/map?lat=${problem.location?.lat}&lng=${problem.location?.lng}`)}
            className="btn-secondary !py-4 !text-[10px] !font-black uppercase tracking-widest !rounded-2xl"
          >
            Locate
          </button>
        </div>
        <button 
          onClick={() => router.push(`/problems/${problem._id}`)}
          className="w-full mt-3 py-3 text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-white transition-colors"
        >
          View Tactical Intel →
        </button>

        {(isLeader || isNGO) && (
          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
             <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Command Logic</p>
             <select 
               value={problem.status?.toLowerCase()}
               onChange={(e) => handleStatusUpdate(e.target.value)}
               className="bg-transparent text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] outline-none cursor-pointer"
             >
               <option value="open">Open Node</option>
               <option value="in_progress">Engaged</option>
               <option value="resolved">Neutralized</option>
             </select>
          </div>
        )}
      </div>
    </motion.div>
  );
}
