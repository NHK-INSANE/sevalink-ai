"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems } from "../utils/api";
import toast from "react-hot-toast";
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
  
  const [problemMatches, setProblemMatches] = useState([]); 
  const [userMatches, setUserMatches] = useState([]);      
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("forMe"); // "forMe" or "byProblem"
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUser(JSON.parse(localStorage.getItem("seva_user") || "null"));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMatches();
    }
  }, [currentUser, activeTab]);

  const fetchMatches = async (targetProbId = null) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (activeTab === "forMe") {
        const res = await axios.get(`${API_BASE}/api/ai/match/problems/${currentUser._id || currentUser.id}`, {
          headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
        });
        setProblemMatches(res.data.success ? res.data.data.slice(0, 10) : []);
      } else {
        const probs = await getProblems();
        let openProblems = probs.filter(p => p.status?.toLowerCase() !== "resolved");
        
        if (targetProbId || searchQuery) {
          const q = (targetProbId || searchQuery).toLowerCase();
          openProblems = openProblems.filter(p => p.problemId?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q));
        }

        const topProbs = openProblems.slice(0, 5);
        
        const matchedResults = await Promise.all(topProbs.map(async (p) => {
          try {
            const res = await axios.get(`${API_BASE}/api/ai/match/users/${p._id}`, {
              headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
            });
            return { problem: p, volunteers: (res.data.success ? res.data.data : []).slice(0, 5) };
          } catch {
            return { problem: p, volunteers: [] };
          }
        }));
        setUserMatches(matchedResults);
      }
    } catch (err) {
      toast.error("Neural sync failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAction = async (problemId, userId) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const myRole = currentUser.role?.toLowerCase();
      
      if (myRole === "ngo" || myRole === "admin") {
        await axios.post(`${API_BASE}/api/problems/${problemId}/assign`, { userId }, {
          headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
        });
        toast.success("Personnel Deployed Successfully.");
      } else {
        await axios.post(`${API_BASE}/api/problems/${problemId}/assign`, {}, {
          headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
        });
        toast.success("Mobilization request transmitted.");
      }
      fetchMatches();
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
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12 border-b border-white/5 pb-10">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Neural Engine</h1>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Autonomous crisis-responder alignment system</p>
            </div>
            
            <div className="flex bg-white/[0.02] p-1.5 rounded-2xl border border-white/5">
               <button 
                onClick={() => setActiveTab("forMe")}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'forMe' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-600 hover:text-white'}`}
               >
                  Match Yourself
               </button>
               <button 
                onClick={() => setActiveTab("byProblem")}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'byProblem' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-600 hover:text-white'}`}
               >
                  AI Match by Problems
               </button>
            </div>
          </div>

          {activeTab === "byProblem" && (
            <div className="mb-10 max-w-xl">
               <div className="relative group">
                 <input
                   placeholder="Enter Problem ID or Crisis Keyword..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && fetchMatches()}
                   className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-xs text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-700 font-bold"
                 />
                 <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
               </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => <div key={i} className="card h-64 animate-pulse !rounded-[2.5rem] bg-white/5" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {activeTab === "forMe" ? (
                problemMatches.length === 0 ? (
                  <div className="col-span-full py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">No matching crises detected for your profile signature</p>
                  </div>
                ) : (
                  problemMatches.map((m) => (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={m.problem._id} className="card !p-10 flex flex-col gap-8 group hover:bg-white/[0.02] transition-all !rounded-[2.5rem] border border-white/5">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors uppercase tracking-tighter">{m.problem.title}</h3>
                          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Node ID: {m.problem.problemId}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-3xl font-black text-emerald-400 leading-none">{m.score}%</p>
                           <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-2">Neural Link</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <ScoreBar score={m.score} />
                        <div className="flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                           <span className="flex items-center gap-2"><span className="text-emerald-500">📍</span> Distance: {m.distance} km</span>
                           <span className="text-purple-500 border border-purple-500/20 px-3 py-1 rounded-lg">{m.priority} Priority</span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-auto pt-6 border-t border-white/5">
                        <button onClick={() => router.push(`/problems/${m.problem._id}`)} className="flex-1 btn-secondary !py-4 !text-[10px] !font-black uppercase tracking-widest !rounded-xl">Intel</button>
                        <button onClick={() => handleAssignAction(m.problem._id, currentUser._id)} className="flex-1 btn-primary !py-4 !text-[10px] !font-black uppercase tracking-widest !rounded-xl">Assign Yourself</button>
                      </div>
                    </motion.div>
                  ))
                )
              ) : (
                userMatches.map(({ problem, volunteers }) => (
                  <div key={problem._id} className="card !p-10 flex flex-col gap-8 !rounded-[3rem] bg-white/[0.01] border border-white/5">
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{problem.title}</h3>
                       <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-700">
                          <span className="text-purple-400">{problem.problemId}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-800" />
                          <span className="truncate">{problem.location?.address || "Tactical Sector"}</span>
                       </div>
                    </div>

                    <div className="space-y-5">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Top Recommended Responders</h4>
                       {volunteers.length === 0 ? (
                         <div className="py-12 text-center text-[10px] font-black text-gray-700 uppercase tracking-widest bg-black/20 rounded-[2rem]">No immediate matches detected.</div>
                       ) : (
                         <div className="space-y-3">
                           {volunteers.map((m, idx) => (
                             <div key={m.user._id} className="bg-white/[0.02] p-5 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-500 border border-white/10">{idx + 1}</div>
                                   <div>
                                      <p className="text-xs font-black text-white uppercase tracking-tight">{m.user.name}</p>
                                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">{m.score}% Match Rating</p>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => handleAssignAction(problem._id, m.user._id)}
                                  className="px-6 py-2.5 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-purple-500/20"
                                >
                                  Assign
                                </button>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </PageWrapper>
    </div>
  );
}

export default function AIMatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white font-black uppercase tracking-[0.4em] animate-pulse">Initializing Neural Core...</div>}>
      <AIMatchContent />
    </Suspense>
  );
}
