"use client";
import { motion, AnimatePresence } from "framer-motion";
import Counter from "../Counter";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function NgoDashboard({ problems = [], usersList = [] }) {
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
      if (res.data.success) toast.success(action === "accept" ? "Personnel Authorized" : "Request Declined");
    } catch (err) {
      toast.error(err.response?.data?.error || "Authorization failed.");
    }
  };

  const handleMemberAction = async (problemId, userId, action) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = action === "promote" ? "leader" : "remove";
      const res = await axios.post(`${API_BASE}/api/problems/${problemId}/team/${endpoint}`, 
        { userId },
        { headers: { Authorization: `Bearer ${encodeURIComponent(token)}` } }
      );
      if (res.data.success) toast.success(action === "promote" ? "Leadership Authority Assigned" : "Member Disengaged");
    } catch (err) {
      toast.error(err.response?.data?.error || "Command failed.");
    }
  };

  const activeMissions = problems.filter(p => ["in_progress", "in progress"].includes(p.status?.toLowerCase()));
  const unassignedCases = problems.filter(p => p.status === "open").length;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="card !p-8 !rounded-[2.5rem] border-purple-500/10 bg-white/[0.01]">
          <p className="text-[10px] font-black tracking-[0.2em] text-gray-600 uppercase mb-4">Tactical Requests</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-4xl font-black text-purple-400 tracking-tighter">
              <Counter value={pendingRequests.length} />
            </h2>
            <span className="text-[10px] font-black text-gray-700 uppercase">Awaiting Intel</span>
          </div>
        </div>
        
        <div className="card !p-8 !rounded-[2.5rem] bg-white/[0.01]">
          <p className="text-[10px] font-black tracking-[0.2em] text-gray-600 uppercase mb-4">Active Missions</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-4xl font-black text-white tracking-tighter">
              <Counter value={activeMissions.length} />
            </h2>
            <span className="text-[10px] font-black text-gray-700 uppercase">Deployed</span>
          </div>
        </div>

        <div className="card !p-8 !rounded-[2.5rem] border-red-500/10 bg-white/[0.01]">
          <p className="text-[10px] font-black tracking-[0.2em] text-gray-600 uppercase mb-4">Unassigned Nodes</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-4xl font-black text-red-500 tracking-tighter">
              <Counter value={unassignedCases} />
            </h2>
            <span className="text-[10px] font-black text-gray-700 uppercase">Critical Null</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="card !p-0 !rounded-[3rem] overflow-hidden bg-white/[0.01]">
          <div className="p-10 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Authorizations</h3>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">Personnel deployment queue</p>
            </div>
            <span className="bg-purple-600/10 text-purple-400 text-[10px] font-black px-4 py-1.5 rounded-full border border-purple-500/20 uppercase tracking-widest">
              {pendingRequests.length} Active
            </span>
          </div>

          <div className="p-10 space-y-6">
            {pendingRequests.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-white/5 rounded-[2.5rem] opacity-30">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">No pending mobilization signatures</p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <motion.div key={req._id} layout className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-xs">ID</div>
                       <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">{req.userName || "Neural Operator"}</h4>
                          <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">{req.role}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">{req.problemDisplayId}</p>
                       <p className="text-[8px] text-gray-700 font-black uppercase mt-1">Mission Target</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={() => handleRequestAction(req.problemId, req._id, "accept")} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all">Authorize</button>
                     <button onClick={() => handleRequestAction(req.problemId, req._id, "reject")} className="flex-1 bg-white/5 text-red-500 hover:bg-red-500/10 py-3.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all">Decline</button>
                     <button onClick={() => router.push(`/chat?id=${req.userId}`)} className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-all">💬</button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="card !p-0 !rounded-[3rem] overflow-hidden bg-white/[0.01]">
          <div className="p-10 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Mission Units</h3>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">Real-time team management</p>
            </div>
          </div>

          <div className="p-10 space-y-10">
            {activeMissions.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-white/5 rounded-[2.5rem] opacity-30">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">No active tactical units deployed</p>
              </div>
            ) : (
              activeMissions.map((prob) => (
                <div key={prob._id} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                     <h4 className="text-xs font-black text-white uppercase tracking-widest">{prob.title}</h4>
                     <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{prob.problemId}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {prob.team?.map((member) => (
                      <div key={member.userId} className="p-6 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black border transition-all ${member.isLeader ? "bg-purple-600 border-transparent text-white" : "bg-white/5 border-white/10 text-gray-500"}`}>
                             {member.isLeader ? "L" : "U"}
                           </div>
                           <div>
                              <p className="text-xs font-black text-white uppercase tracking-tight">{member.name || "Personnel"}</p>
                              <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-0.5">{member.role} {member.isLeader && " | Mission Leader"}</p>
                           </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           {!member.isLeader && (
                             <button onClick={() => handleMemberAction(prob._id, member.userId, "promote")} className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all">Promote</button>
                           )}
                           <button onClick={() => handleMemberAction(prob._id, member.userId, "remove")} className="px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
