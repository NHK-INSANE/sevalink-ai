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
  const targetId = searchParams.get("id");

  const [problemMatches, setProblemMatches] = useState([]); // Mode 1: Problems for User
  const [userMatches, setUserMatches] = useState([]);      // Mode 2: Users for Problem
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(targetId ? "byProblem" : "forMe");
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = JSON.parse(localStorage.getItem("seva_user") || "null");
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMatches();
    }
  }, [currentUser, activeTab, targetId]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (activeTab === "forMe") {
        const res = await axios.get(`${API_BASE}/api/ai/match/problems/${currentUser._id || currentUser.id}`, {
          headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
        });
        setProblemMatches(res.data.success ? res.data.data : []);
      } else {
        // Mode 2: By Problem
        const probs = await getProblems();
        let openProblems = probs.filter(p => p.status?.toLowerCase() !== "resolved");
        
        if (targetId) {
          const target = probs.find(p => p._id === targetId || p.problemId === targetId);
          if (target) {
            openProblems = [target, ...openProblems.filter(p => p._id !== target._id)].slice(0, 5);
          }
        } else {
          openProblems = openProblems.slice(0, 5);
        }
        
        const matchedResults = await Promise.all(openProblems.map(async (p) => {
          try {
            const res = await axios.get(`${API_BASE}/api/ai/match/users/${p._id}`, {
              headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
            });
            return { problem: p, volunteers: res.data.success ? res.data.data : [] };
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
        // Direct Assign for NGO
        await axios.post(`${API_BASE}/api/problems/${problemId}/assign`, { userId }, {
          headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
        });
        toast.success("Personnel Deployed Successfully.");
      } else {
        // Request for User
        await axios.post(`${API_BASE}/api/problems/${problemId}/request`, { type: "assign" }, {
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
    <div className="min-h-screen bg-[var(--bg)] text-white">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight uppercase">Neural Match Engine</h1>
              <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.2em]">Autonomous crisis-responder alignment system</p>
            </div>
            
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
               <button 
                onClick={() => setActiveTab("forMe")}
                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'forMe' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
               >
                  Match for Me
               </button>
               <button 
                onClick={() => setActiveTab("byProblem")}
                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'byProblem' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
               >
                  Tactical Selection
               </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => <div key={i} className="card h-64 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {activeTab === "forMe" ? (
                problemMatches.length === 0 ? (
                  <div className="col-span-full py-32 text-center card border-dashed border-white/10">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No matching crises detected for your profile</p>
                  </div>
                ) : (
                  problemMatches.map((m) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={m.problem._id} className="card !p-8 flex flex-col gap-6 group hover:border-purple-500/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors uppercase tracking-tight">{m.problem.title}</h3>
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">ID: {m.problem.problemId}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-black text-emerald-400 leading-none">{m.score}%</p>
                           <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Neural Score</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <ScoreBar score={m.score} />
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                           <span>Distance: {m.distance} km</span>
                           <span className="text-purple-500">{m.priority} Priority</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-auto pt-4">
                        <button onClick={() => router.push(`/map?lat=${m.problem.location?.lat}&lng=${m.problem.location?.lng}`)} className="flex-1 btn-secondary !py-3 !text-[10px] !font-black uppercase tracking-widest">Locate</button>
                        <button onClick={() => handleAssignAction(m.problem._id, currentUser._id)} className="flex-1 btn-primary !py-3 !text-[10px] !font-black uppercase tracking-widest">Assign Me</button>
                      </div>
                    </motion.div>
                  ))
                )
              ) : (
                userMatches.map(({ problem, volunteers }) => (
                  <div key={problem._id} className="card !p-8 flex flex-col gap-8 group hover:border-white/10 transition-all bg-white/[0.01]">
                    <div className="space-y-2">
                       <h3 className="text-lg font-black text-white uppercase tracking-tight">{problem.title}</h3>
                       <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-gray-600">
                          <span className="text-purple-400">{problem.problemId}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-800" />
                          <span className="truncate">{problem.location?.address || "Field Location"}</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5 pb-2">Top Recommended Units</h4>
                       {volunteers.length === 0 ? (
                         <div className="py-10 text-center text-[10px] font-bold text-gray-700 uppercase tracking-widest bg-black/10 rounded-2xl">Scanning...</div>
                       ) : (
                         <div className="space-y-3">
                           {volunteers.map((m, idx) => (
                             <div key={m.user._id} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-400">{idx + 1}</div>
                                   <div>
                                      <p className="text-xs font-black text-white">{m.user.name}</p>
                                      <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{m.score}% Neural Link</p>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => handleAssignAction(problem._id, m.user._id)}
                                  className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
                                >
                                  Deploy
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
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-white font-black uppercase tracking-[0.3em] animate-pulse">Initializing Neural Core...</div>}>
      <AIMatchContent />
    </Suspense>
  );
}
