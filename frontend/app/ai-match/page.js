"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems } from "../utils/api";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.round(score));
  const color = pct >= 80 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#818cf8";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, backgroundColor: color }} className="h-full rounded-full transition-all duration-1000" />
      </div>
      <span style={{ color }} className="text-[10px] font-black">{pct}%</span>
    </div>
  );
}

function AIMatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetId = searchParams.get("id");

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("byProblem");
  const [currentUser, setCurrentUser] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = JSON.parse(localStorage.getItem("seva_user") || "null");
      setCurrentUser(user);
    }
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const probs = await getProblems();
      let openProblems = probs.filter(p => p.status === "OPEN" || p.status === "Open" || p.status === "IN PROGRESS");
      
      if (targetId) {
        const target = probs.find(p => p._id === targetId || p.problemId === targetId);
        if (target) {
          openProblems = [target, ...openProblems.filter(p => p._id !== target._id)];
        }
      }
      
      const matchedResults = await Promise.all(openProblems.map(async (p) => {
        try {
          const res = await axios.get(`${API_BASE}/api/ai/match/users/${p._id}`, {
            headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
          });
          const volunteers = res.data?.success ? res.data.data : (Array.isArray(res.data) ? res.data : []);
          return { problem: p, volunteers: volunteers };
        } catch (err) {
          console.error("Match error for problem", p._id, err);
          return { problem: p, volunteers: [] };
        }
      }));
      
      setMatches(matchedResults);
    } catch (err) {
      toast.error("Failed to load AI matches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [targetId]);

  const handleAutoAssign = async (problemId) => {
    if (!window.confirm("AI will notify the best 3 responders for this mission. Proceed?")) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/ai/auto-assign/${problemId}`, {}, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      if (res.data?.success) {
        toast.success("AI Dispatcher engaged. Suggestions transmitted.");
        fetchMatches();
      } else {
        throw new Error(res.data?.message || "Auto-assign failed");
      }
    } catch (err) {
      toast.error("AI Auto-Assign failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualRequest = async (problemId, userId) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/problems/${problemId}/assign`, { userId }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      if (res.data?.success) {
        toast.success("Assignment request transmitted.");
      } else {
        throw new Error(res.data?.message || "Request failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-white">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase">Neural Match Engine</h1>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Autonomous crisis-responder alignment system</p>
            </div>
            
            <div className="flex gap-2">
               <button 
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
               >
                  Back to Ops
               </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-[#0f172a]/20 h-64 rounded-[2.5rem] animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {matches.map(({ problem, volunteers }) => (
                <div key={problem._id} className="bg-[#0f172a]/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl relative group hover:border-white/10 transition-all">
                  <div className="space-y-2">
                     <div className="flex justify-between items-start">
                       <h3 className="text-xl font-black text-white uppercase tracking-tight line-clamp-1 flex-1 pr-4">{problem.title}</h3>
                       <button 
                        onClick={() => handleAutoAssign(problem._id)}
                        disabled={isSubmitting}
                        className="bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-400 hover:text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                       >
                          Auto Assign
                       </button>
                     </div>
                     <p className="text-xs text-gray-500 font-medium line-clamp-2">{problem.description}</p>
                     <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-gray-600 pt-1">
                        <span className="text-indigo-400">{problem.problemId}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="truncate">{problem.location?.address || "Field Location"}</span>
                     </div>
                  </div>

                  <div className="bg-black/20 border border-white/5 rounded-[2rem] p-5 flex-1">
                     <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-4 pl-1">Neural Candidates</h4>
                     {volunteers.length === 0 ? (
                       <div className="py-10 text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">
                         Scanning for compatible units...
                       </div>
                     ) : (
                       <div className="space-y-4">
                         {volunteers.map((m, idx) => {
                           const v = m.user;
                           return (
                             <div key={v._id} className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 group-hover:border-white/10 transition-all">
                                <div className="flex justify-between items-center mb-3">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[11px] font-black">{idx + 1}</div>
                                      <div>
                                         <p className="text-xs font-black text-white">{v.name}</p>
                                         <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{v.role}</p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${m.priority === 'HIGH' ? 'bg-red-500/10 text-red-400' : m.priority === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                         {m.priority}
                                      </div>
                                      <p className="text-[10px] font-black text-emerald-400 mt-1">{Math.round(m.score)}% Match</p>
                                   </div>
                                </div>
                                <div className="space-y-2">
                                   <ScoreBar score={m.score} />
                                   <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-600">
                                      <span>Distance: {m.distance} km</span>
                                      <button 
                                        onClick={() => handleManualRequest(problem._id, v._id)}
                                        className="text-indigo-400 hover:text-indigo-300"
                                      >
                                        [ Send Request ]
                                      </button>
                                   </div>
                                </div>
                             </div>
                           );
                         })}
                       </div>
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageWrapper>
    </div>
  );
}

export default function AIMatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white font-black uppercase tracking-[0.3em] animate-pulse">Initializing Neural Core...</div>}>
      <AIMatchContent />
    </Suspense>
  );
}
