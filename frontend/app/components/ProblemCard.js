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

  const isOwner = problem.reportedBy?.userId === currentUser?._id || problem.reportedBy?.userId === currentUser?.id;
  const isNGO = currentUser?.role === "ngo" || currentUser?.role === "admin";
  const isLeader = problem.team?.some(m => (m.userId === currentUser?._id || m.userId === currentUser?.id) && m.isLeader);

  const handleDelete = async () => {
    if (!confirm("Terminate this mission? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${API_BASE}/api/problems/${problem._id}`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      if (res.data.success) {
        toast.success("Mission Terminated ✅");
        // Navigation or parent refresh happens via socket problem-deleted
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

  const handleAssign = async () => {
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
    if (status === "open") return "bg-white/5 text-gray-400 border-white/10";
    if (status.includes("progress")) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (status === "resolved") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    return "bg-white/5 text-gray-400 border-white/10";
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card flex flex-col group relative overflow-hidden h-full"
    >
      {/* STATUS & DATE HEADER */}
      <div className="p-5 pb-0 flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${getStatusStyle(problem.status)}`}>
               {problem.status?.replace("_", " ") || "OPEN"}
             </span>
             <span className="text-[10px] font-bold text-gray-600 uppercase">
               {problem.problemId || "ID-PENDING"}
             </span>
          </div>
          <p className="text-[10px] text-gray-500 font-medium">
            Reported: {new Date(problem.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        {(isOwner || isNGO) && (
          <button 
            onClick={handleDelete}
            className="p-2 text-gray-600 hover:text-red-500 transition-colors"
            title="Terminate Mission"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-5 space-y-4 flex-1">
        <div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors leading-tight">
            {problem.title}
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 font-medium">
            {problem.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {problem.category || "General"}
          </span>
          <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-black uppercase tracking-wider ${
            (problem.severity || problem.urgency || "").toLowerCase() === "critical" ? "border-red-500/20 text-red-500 bg-red-500/5" :
            (problem.severity || problem.urgency || "").toLowerCase() === "high" ? "border-orange-500/20 text-orange-400 bg-orange-500/5" :
            (problem.severity || problem.urgency || "").toLowerCase() === "medium" ? "border-yellow-500/20 text-yellow-400 bg-yellow-500/5" :
            "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
          }`}>
            {problem.severity || problem.urgency || "Medium"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold uppercase tracking-tight bg-white/[0.02] p-2 rounded-lg">
          <span className="text-purple-400 text-xs">📍</span>
          <span className="truncate">{problem.location?.address || `${problem.location?.lat.toFixed(4)}, ${problem.location?.lng.toFixed(4)}`}</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="p-5 pt-0 mt-auto">
        <div className="grid grid-cols-12 gap-2">
          <button 
            onClick={handleAssign}
            className="col-span-8 btn-primary !py-3 !text-[11px] !font-black uppercase tracking-widest"
          >
            {problem.status === "open" ? "Join Mission" : "Deploy Unit"}
          </button>
          
          <button 
            onClick={() => router.push(`/map?problemId=${problem._id}`)}
            className="col-span-4 btn-secondary !py-3 !px-0 flex items-center justify-center gap-2 text-[10px] font-black uppercase"
          >
            Locate
          </button>
        </div>

        {/* STATUS CONTROL (Leaders/NGO) */}
        {(isLeader || isNGO) && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Update State</span>
              <select 
                value={problem.status?.toLowerCase()}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className="bg-transparent text-[10px] font-bold text-purple-400 uppercase tracking-widest outline-none cursor-pointer hover:text-purple-300"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
