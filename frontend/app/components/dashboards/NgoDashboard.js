"use client";
import { motion } from "framer-motion";
import Counter from "../Counter";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function NgoDashboard({ problems = [], stats = {} }) {
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Extract pending requests from problems
  useEffect(() => {
    const extractRequests = () => {
      const allRequests = [];
      problems.forEach(p => {
        if (p.requests && Array.isArray(p.requests)) {
          p.requests.forEach(r => {
            if (r.status === "pending") {
              allRequests.push({
                ...r,
                problemId: p._id,
                problemTitle: p.title,
                problemDisplayId: p.problemId
              });
            }
          });
        }
      });
      setPendingRequests(allRequests);
      setLoading(false);
    };

    extractRequests();
  }, [problems]);

  const handleRequestAction = async (problemId, requestId, action) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/problems/${problemId}/team/respond`, 
        { requestId, action },
        { headers: { Authorization: `Bearer ${encodeURIComponent(token)}` } }
      );
      
      if (res.data.success) {
        toast.success(action === "accept" ? "Personnel Authorized" : "Request Declined");
        // The list will update via socket problem-updated
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Authorization failed.");
    }
  };

  const activeMissions = problems.filter(p => p.status === "in_progress" || p.status === "in-progress").length;
  const unassignedCases = problems.filter(p => p.status === "open").length;

  return (
    <div className="space-y-8">
      {/* ANALYTICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 !rounded-2xl border-purple-500/10">
          <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-4">Tactical Requests</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black text-purple-400 leading-none">
              <Counter value={pendingRequests.length} />
            </h2>
            <span className="text-[10px] font-bold text-gray-600 uppercase">Pending</span>
          </div>
        </div>
        
        <div className="card p-6 !rounded-2xl">
          <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-4">Active Missions</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black text-white leading-none">
              <Counter value={activeMissions} />
            </h2>
            <span className="text-[10px] font-bold text-gray-600 uppercase">Deployed</span>
          </div>
        </div>

        <div className="card p-6 !rounded-2xl border-red-500/10">
          <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-4">Unassigned Nodes</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black text-red-500 leading-none">
              <Counter value={unassignedCases} />
            </h2>
            <span className="text-[10px] font-bold text-gray-600 uppercase">Open</span>
          </div>
        </div>
      </div>

      {/* OPERATIONS CENTER: REQUESTS */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Personnel Authorizations</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-1">Review deployment requests from responders</p>
          </div>
          <span className="bg-purple-600/10 text-purple-400 text-[10px] font-black px-3 py-1 rounded-full border border-purple-500/20 uppercase tracking-widest">
            {pendingRequests.length} Pending
          </span>
        </div>

        <div className="p-8">
          {pendingRequests.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
              <div className="text-3xl mb-4 opacity-20">📡</div>
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">No active deployment requests detected</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingRequests.map((req, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={req._id} 
                  className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all gap-6"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-purple-600/10 flex flex-col items-center justify-center border border-purple-500/10">
                      <span className="text-[10px] font-black text-purple-400">ID</span>
                      <span className="text-[11px] font-black text-white">{String(req.userId || "").slice(-4).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">{req.role || "Responder"}</h4>
                        <span className="text-[8px] font-black text-gray-600 bg-white/5 px-2 py-0.5 rounded uppercase tracking-widest">Verification Pending</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        Mobilization Request for <span className="text-purple-400 font-bold">{req.problemTitle}</span>
                        <span className="ml-2 text-[9px] text-gray-600 font-bold uppercase tracking-tighter">[{req.problemDisplayId}]</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleRequestAction(req.problemId, req._id, "accept")}
                      className="btn-primary !bg-emerald-600 !hover:bg-emerald-500 !py-2.5 !px-6 !text-[10px] !font-black uppercase tracking-widest"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleRequestAction(req.problemId, req._id, "reject")}
                      className="btn-secondary !bg-red-500/5 !text-red-500/60 !hover:text-red-500 !border-red-500/10 !py-2.5 !px-6 !text-[10px] !font-black uppercase tracking-widest"
                    >
                      Deny
                    </button>
                    <button 
                      onClick={() => router.push(`/chat?id=${req.userId}`)}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg hover:bg-white/10 transition-all"
                      title="Contact Responder"
                    >
                      💬
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
