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

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function ScoreBar({ score }) {
  const pct = Math.min(100, score);
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
  const [userMatches, setUserMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(targetId ? "byProblem" : "yourself");
  const [currentUser, setCurrentUser] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState(null); // { problemId, userId, userName }
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = JSON.parse(localStorage.getItem("seva_user") || "null");
      setCurrentUser(user);
      if (user && !["volunteer", "worker"].includes(user.role?.toLowerCase()) && !targetId) {
        setActiveTab("byProblem");
      }
    }
  }, [targetId]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const probs = await getProblems();
      let openProblems = probs.filter(p => p.status === "OPEN" || p.status === "Open");
      
      if (targetId) {
        const target = probs.find(p => p._id === targetId || p.problemId === targetId);
        if (target && (target.status === "OPEN" || target.status === "Open")) {
          openProblems = [target, ...openProblems.filter(p => p._id !== target._id)];
        }
      }
      
      const matchedResults = await Promise.all(openProblems.map(async (p) => {
        try {
          const res = await axios.get(`${API_BASE}/api/ai/match/users/${p._id}`, {
            headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
          });
          // Limit to top 5
          return { problem: p, volunteers: Array.isArray(res.data) ? res.data.slice(0, 5) : [] };
        } catch (err) {
          return { problem: p, volunteers: [] };
        }
      }));
      
      setMatches(matchedResults);

      if (currentUser && ["volunteer", "worker"].includes(currentUser.role?.toLowerCase())) {
        const scoredProbs = openProblems.map(p => {
          let score = 0;
          let skillScore = 0;
          let distScore = 0;
          
          const dist = getDistance(p.location?.lat, p.location?.lng, currentUser.location?.lat, currentUser.location?.lng);
          distScore = Math.max(0, 50 - (dist ? dist / 10 : 0)); // max 50 from distance
          score += distScore;
          
          const uSkills = (currentUser.skills || []).map(s => s.toLowerCase());
          if (currentUser.skill) uSkills.push(currentUser.skill.toLowerCase());
          
          const pCat = Array.isArray(p.category) ? p.category[0] : p.category;
          const pSkill = String(p.requiredSkill || pCat || "").toLowerCase();
          
          if (pSkill && uSkills.includes(pSkill)) {
            skillScore = 50;
            score += skillScore;
          }
          
          return { problem: p, score: Math.round(score), distKm: dist, breakdown: { skill: skillScore, dist: Math.round(distScore) } };
        }).sort((a,b) => b.score - a.score);
        
        setUserMatches(scoredProbs);
      }
    } catch (err) {
      toast.error("Failed to load AI matches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser !== undefined) fetchMatches();

    const socket = io(API_BASE);
    socket.on("matched-volunteers", () => {
      fetchMatches(); // refresh on match event
    });
    return () => socket.disconnect();
  }, [currentUser]);

  const handleAssignClick = (problemId, userId, userName, status) => {
    if (status === 'busy') {
      if (!window.confirm(`${userName || 'User'} is currently marked as BUSY. Override and assign anyway?`)) return;
    }
    setAssignData({ problemId, userId, userName });
    setShowAssignModal(true);
  };

  const submitAssign = async () => {
    if (!assignData) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${assignData.problemId}/request`, {
        type: "assign",
        userId: assignData.userId
      }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Assignment request transmitted.");
      setShowAssignModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Assignment failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canMatchYourself = currentUser && ["volunteer", "worker"].includes(currentUser.role?.toLowerCase());

  return (
    <div className="min-h-screen bg-[#080B14] text-white">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase">Neural Match Engine</h1>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Autonomous crisis-responder alignment system</p>
            </div>
            
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
               {canMatchYourself && (
                 <button 
                  onClick={() => setActiveTab("yourself")}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "yourself" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-500 hover:text-white"}`}
                 >
                    Match Yourself
                 </button>
               )}
               <button 
                onClick={() => setActiveTab("byProblem")}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "byProblem" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-500 hover:text-white"}`}
               >
                  Match by Crisis
               </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => <div key={i} className="bg-[#0f172a]/20 h-64 rounded-[2.5rem] animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* ── MATCH YOURSELF ── */}
              {activeTab === "yourself" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userMatches.length === 0 ? (
                    <div className="col-span-full py-32 text-center bg-[#0f172a]/10 border border-dashed border-white/5 rounded-[3rem]">
                      <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No compatible missions identified</p>
                    </div>
                  ) : (
                    userMatches.map(({ problem, score, distKm, breakdown }, idx) => (
                      <div key={problem._id} className="bg-[#0f172a]/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-6 relative shadow-2xl overflow-hidden group hover:border-white/10 transition-all">
                        {idx === 0 && score > 70 && (
                          <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                            ⭐ Best Fit
                          </div>
                        )}
                        <div className="space-y-1 pr-16">
                           <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">{problem.title}</h3>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest">{problem.problemId || "ID-PENDING"}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-700" />
                              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{problem.category}</span>
                           </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Compatibility Index</span>
                              <span className="text-[11px] font-black text-white">{score}%</span>
                           </div>
                           <ScoreBar score={score} />
                           <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-600 pt-1">
                              <span>Skill: {breakdown.skill}%</span>
                              <span>Distance: {breakdown.dist}%</span>
                           </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-500 text-[10px] font-bold">
                           <span>📍</span>
                           <span className="truncate">{problem.location?.address || `${distKm || '?'} km away`}</span>
                        </div>

                        <div className="mt-auto grid grid-cols-2 gap-3 pt-2">
                           <button 
                            onClick={() => router.push(`/map?lat=${problem.location?.lat}&lng=${problem.location?.lng}&focus=${problem._id}`)}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                           >
                              Locate
                           </button>
                           <button 
                            onClick={() => handleAssignClick(problem._id, currentUser._id, currentUser.name, currentUser.status)}
                            className="w-full py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg"
                           >
                              Request Assign
                           </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── MATCH BY CRISIS ── */}
              {activeTab === "byProblem" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches.length === 0 ? (
                    <div className="col-span-full py-32 text-center bg-[#0f172a]/10 border border-dashed border-white/5 rounded-[3rem]">
                      <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No active missions require analysis</p>
                    </div>
                  ) : (
                    matches.map(({ problem, volunteers }) => (
                      <div key={problem._id} className="bg-[#0f172a]/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl relative">
                        <div className="space-y-2">
                           <div className="flex justify-between items-start">
                             <h3 className="text-lg font-black text-white uppercase tracking-tight line-clamp-1 flex-1 pr-4">{problem.title}</h3>
                             <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${problem.urgency?.toUpperCase() === 'CRITICAL' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'}`}>
                                {problem.urgency}
                             </span>
                           </div>
                           <p className="text-xs text-gray-500 font-medium line-clamp-2">{problem.description}</p>
                           <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-gray-600 pt-1">
                              <span className="text-indigo-400">{problem.problemId || "ID-PENDING"}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-700" />
                              <span className="truncate max-w-[150px]">{problem.location?.address || "Location Unknown"}</span>
                           </div>
                        </div>

                        <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex-1">
                           <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3 pl-1">Top Personnel Matches</h4>
                           {volunteers.length === 0 ? (
                             <div className="py-6 text-center text-[10px] font-bold text-red-400/60 uppercase tracking-widest border border-dashed border-red-500/10 rounded-xl">
                               Insufficient personnel matches
                             </div>
                           ) : (
                             <div className="space-y-3">
                               {volunteers.map((m, idx) => {
                                 const v = m.user;
                                 return (
                                   <div key={v._id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                                      <div className="flex-1 min-w-0">
                                         <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-black text-white truncate pr-2">{v.name}</span>
                                            <span className="text-[10px] font-black text-emerald-400">{m.score}%</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">{v.customId || "ID-PENDING"}</span>
                                            {v.status === 'busy' && <span className="text-[7px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-1.5 rounded">Busy</span>}
                                         </div>
                                      </div>
                                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button 
                                          onClick={() => router.push(`/volunteers?search=${v.customId || v._id}`)}
                                          className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-[10px]" title="Find User"
                                         >🔍</button>
                                         <button 
                                          onClick={() => handleAssignClick(problem._id, v._id, v.name, v.status)}
                                          className="w-7 h-7 bg-indigo-600 hover:bg-indigo-500 rounded flex items-center justify-center text-[10px] text-white" title="Assign"
                                         >⚡</button>
                                      </div>
                                   </div>
                                 );
                               })}
                             </div>
                           )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </PageWrapper>

      {/* ── ASSIGN MODAL ── */}
      <AnimatePresence>
        {showAssignModal && assignData && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999]" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="fixed inset-x-4 top-[30%] md:inset-x-auto md:left-1/2 md:-ml-[200px] md:w-[400px] bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 z-[10000] shadow-2xl space-y-8 text-center"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto text-xl mb-4">⚡</div>
                <h2 className="text-xl font-black uppercase tracking-widest text-white">Confirm Deployment</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                  Transmit assignment request for <span className="text-white">{assignData.userName}</span>
                </p>
              </div>

              <div className="flex flex-col gap-3">
                 <button 
                  onClick={submitAssign} 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all"
                 >
                   {isSubmitting ? "Transmitting..." : "Authorize Request"}
                 </button>
                 <button onClick={() => setShowAssignModal(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Abort</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
