"use client";
import { useEffect, useState, useRef } from "react";
import { socket } from "../../lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function OpsPanel() {
  const [events, setEvents] = useState([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("alerts"); // alerts, ai
  const [loading, setLoading] = useState(false);
  
  // AI Knowledge State
  const [problems, setProblems] = useState([]);
  const [userMissions, setUserMissions] = useState([]);
  const [user, setUser] = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("seva_user") || "null");
    setUser(userData);
    fetchKnowledge();

    socket.emit("join_ops");
    socket.on("ops_event", (event) => {
      setEvents((prev) => [event, ...prev].slice(0, 50));
    });

    return () => {
      socket.off("ops_event");
    };
  }, []);

  const fetchKnowledge = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/problems`);
      const allProbs = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setProblems(allProbs);

      const userData = JSON.parse(localStorage.getItem("seva_user") || "null");
      if (userData) {
        const myMissions = allProbs.filter(p => 
          p.team?.some(m => m._id === userData._id || m.userId === userData._id) || 
          p.leader === userData._id
        );
        setUserMissions(myMissions);
      }
    } catch (err) {
      console.error("AI Knowledge Sync Error", err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

  const consultAI = async (query) => {
    if (!query.trim() || loading) return;
    setLoading(true);

    // 1. Add user query to events
    const userMsg = {
      type: "USER",
      time: new Date(),
      payload: { message: query }
    };
    setEvents(prev => [userMsg, ...prev]);

    // 2. Logic-based response
    setTimeout(() => {
      let response = "";
      const q = query.toLowerCase();

      if (q.includes("assigned") || q.includes("my mission")) {
        if (userMissions.length > 0) {
          response = `You are currently assigned to ${userMissions.length} missions: ${userMissions.map(m => m.title).join(", ")}. Focus on completing high-priority objectives first.`;
        } else {
          response = "You are not currently assigned to any missions. Use the 'AI Match' tool to find compatible crisis nodes.";
        }
      } 
      else if (q.includes("active") || q.includes("status")) {
        const critical = problems.filter(p => p.severity?.toLowerCase() === "critical").length;
        response = `Operational Status: ${problems.length} active crises detected globally. ${critical} nodes are currently at CRITICAL severity level.`;
      }
      else if (q.includes("resource") || q.includes("gap")) {
        response = "Predictive analysis shows a resource gap in medical supplies and technical rescue units in the Siliguri sector. High recommendation to mobilize additional volunteers.";
      }
      else if (q.includes("what should i do") || q.includes("help")) {
        response = "Strategic recommendation: Navigate to the 'Problems' tab and filter by 'Critical' severity. Your skills are best utilized in high-density rescue scenarios.";
      }
      else {
        response = "Acknowledged. I am analyzing the tactical grid. Based on current telemetry, all units should maintain high alert for escalation in low-lying areas.";
      }

      setEvents(prev => [{
        type: "AI",
        time: new Date(),
        payload: { message: response }
      }, ...prev]);
      setLoading(false);
      setInput("");
    }, 1000);
  };

  const getEventStyles = (type) => {
    switch (type) {
      case "CRISIS": return "border-red-500/30 bg-red-500/5 text-red-400";
      case "SOS":    return "border-orange-500/30 bg-orange-500/5 text-orange-400";
      case "AI":     return "border-purple-500/30 bg-purple-500/5 text-purple-400 font-bold";
      case "USER":   return "border-white/10 bg-white/5 text-white italic";
      case "SYSTEM": return "border-blue-500/30 bg-blue-500/5 text-blue-400";
      default:       return "border-white/10 bg-white/5 text-gray-400";
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-[20px] right-[16px] z-[1000]">
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 bg-purple-600 text-white hover:bg-purple-500 relative border-4 border-[#0B1120]"
        >
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black tracking-widest leading-none mb-1">OPS</span>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
          </div>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-[#0B1120]">LIVE</span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000]" />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 w-[340px] h-full bg-[#0B1120] border-l border-white/10 shadow-2xl z-[2001] flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Ops Control Center</h2>
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1">Status: Node Active</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="flex border-b border-white/10">
                {["alerts", "ai"].map(id => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === id ? "text-purple-400 border-b-2 border-purple-400 bg-purple-400/5" : "text-gray-500"}`}
                  >
                    {id === 'alerts' ? 'Tactical Feed' : 'AI Copilot'}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" ref={scrollRef}>
                  {activeTab === "alerts" ? (
                    events.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-8">
                        <div className="w-12 h-12 border-2 border-dashed border-white/20 rounded-full mb-4 animate-spin" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Live Telemetry...</p>
                      </div>
                    ) : (
                      events.map((e, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${getEventStyles(e.type)} transition-all`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[8px] font-black uppercase tracking-widest">{e.type}</span>
                            <span className="text-[8px] opacity-40 font-mono">{new Date(e.time).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            {typeof e.payload === 'string' ? e.payload : (e.payload.message || e.payload.title)}
                          </p>
                        </div>
                      ))
                    )
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-purple-600/10 border border-purple-500/20 rounded-2xl p-6 text-center space-y-3">
                         <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto border border-purple-500/30 text-2xl">🤖</div>
                         <h3 className="text-xs font-bold uppercase tracking-widest text-white">AI Guidance</h3>
                         <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">"Operational metrics synced. Ask me for mission summaries or resource analysis."</p>
                      </div>
                      
                      <div className="space-y-2">
                        {["What am I assigned to?", "Summarize active crises", "Analyze resource gaps"].map(q => (
                          <button key={q} onClick={() => consultAI(q)} className="w-full bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl text-left text-[10px] text-gray-400 font-bold uppercase tracking-tight transition-all">
                            ⚡ {q}
                          </button>
                        ))}
                      </div>

                      {events.filter(e => e.type === "AI" || e.type === "USER").map((e, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${getEventStyles(e.type)}`}>
                          <p className="text-[11px] leading-relaxed">{e.payload.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-white/10 bg-[#0B1120] relative z-20">
                   <div className="relative flex items-center gap-3">
                      <div className="flex-1 relative">
                        <input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && consultAI(input)}
                          placeholder={activeTab === 'ai' ? "Consult AI Copilot..." : "Live Feed Active"}
                          disabled={activeTab === 'alerts' || loading}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-[11px] text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-600 disabled:opacity-50 font-bold"
                        />
                      </div>
                      <button 
                        onClick={() => consultAI(input)}
                        disabled={activeTab === 'alerts' || loading || !input.trim()}
                        className="w-12 h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-20 shadow-lg shadow-purple-500/20 active:scale-90"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                          </svg>
                        )}
                      </button>
                   </div>
                   <p className="text-[8px] text-gray-700 font-black uppercase tracking-[0.2em] text-center mt-3">Neural-Link-V2 // Secure Hub</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}</style>
    </>
  );
}
