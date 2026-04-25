"use client";
import { useEffect, useState, useRef } from "react";
import { socket } from "../../lib/socket";
import { motion, AnimatePresence } from "framer-motion";

export default function OpsPanel() {
  const [events, setEvents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("alerts"); // alerts, ai
  const [sosConfirm, setSosConfirm] = useState(false);
  const scrollRef = useRef(null);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    socket.emit("join_ops");

    socket.on("ops_event", (event) => {
      setEvents((prev) => [event, ...prev].slice(0, 50));
    });

    socket.on("receive_global_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("ops_event");
      socket.off("receive_global_message");
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const user = JSON.parse(localStorage.getItem("seva_user") || "{}");
    const msg = {
      text: input.trim(),
      senderName: user.name || "Responder",
      time: new Date(),
    };
    socket.emit("send_global_message", msg);
    setInput("");
  };

  const sendSOS = () => {
    const user = JSON.parse(localStorage.getItem("seva_user") || "{}");
    socket.emit("sos_alert", {
      senderName: user.name || "Anonymous",
      location: "Current Dashboard Node",
      timestamp: new Date()
    });
    setSosConfirm(false);
    // Add a local event for feedback
    setEvents(prev => [{
      type: "SOS",
      time: new Date(),
      payload: { message: "CRITICAL: SOS Signal Transmitted to all units." }
    }, ...prev]);
  };

  const getEventStyles = (type) => {
    switch (type) {
      case "CRISIS": return "border-red-500/30 bg-red-500/5 text-red-400";
      case "SOS":    return "border-orange-500/30 bg-orange-500/5 text-orange-400";
      case "AI":     return "border-purple-500/30 bg-purple-500/5 text-purple-400";
      case "SYSTEM": return "border-blue-500/30 bg-blue-500/5 text-blue-400";
      case "DISPATCH": return "border-emerald-500/30 bg-emerald-500/5 text-emerald-400";
      case "NEAREST": return "border-yellow-500/30 bg-yellow-500/5 text-yellow-400";
      default:       return "border-white/10 bg-white/5 text-gray-400";
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case "CRISIS": return "🚨";
      case "SOS":    return "🆘";
      case "AI":     return "🧠";
      case "SYSTEM": return "⚙️";
      case "DISPATCH": return "📡";
      case "NEAREST": return "📍";
      default:       return "🔔";
    }
  };

  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [showBroadcastInput, setShowBroadcastInput] = useState(false);

  const sendBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    socket.emit("broadcast_alert", { message: broadcastMsg });
    setEvents(prev => [{
      type: "SYSTEM",
      time: new Date(),
      payload: { message: `BROADCAST: ${broadcastMsg}` }
    }, ...prev]);
    setBroadcastMsg("");
    setShowBroadcastInput(false);
  };

  const consultAI = (query) => {
    // Local simulation for now, or could emit to backend
    setEvents(prev => [{
      type: "AI",
      time: new Date(),
      payload: { message: `🧠 ANALYZING: ${query}... Standby for tactical guidance.` }
    }, ...prev]);
    
    setTimeout(() => {
       setEvents(prev => [{
        type: "AI",
        time: new Date(),
        payload: { message: `🤖 ADVISORY: Based on current data, prioritize high-urgency zones in the eastern sector. Deploy additional units to waterlogged areas.` }
      }, ...prev]);
    }, 2000);
  };

  const tabs = [
    { id: "alerts", label: "Alerts", icon: "🔔" },
    { id: "ai", label: "AI", icon: "🤖" },
  ];

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-[20px] right-[20px] z-[40]">
        <button
          onClick={() => setIsOpen(true)}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 bg-purple-600 text-white hover:bg-purple-500 relative ${events.some(e => e.type === "CRISIS" || e.type === "SOS") ? "animate-pulse shadow-red-500/50" : "shadow-purple-500/50"}`}
        >
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black tracking-widest leading-none mb-1">OPS</span>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
          </div>
          {events.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#0B1120]">
              {events.length > 9 ? "9+" : events.length}
            </span>
          )}
        </button>
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-[320px] h-full bg-[#0B1120] border-l border-white/10 shadow-2xl z-[1001] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">OPS Control</h2>
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1">Status: Active</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "text-purple-400 border-b-2 border-purple-400 bg-purple-400/5" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm">{tab.icon}</span>
                      {tab.label}
                    </div>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                  {activeTab === "alerts" && (
                    <motion.div
                      key="alerts"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
                      ref={scrollRef}
                    >
                      {events.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-center p-8">
                          <div className="w-12 h-12 border-2 border-dashed border-white/20 rounded-full mb-4 animate-spin-slow" />
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Monitoring Secure Frequencies...</p>
                        </div>
                      ) : (
                        events.map((e, i) => (
                          <div key={i} className={`p-4 rounded-xl border ${getEventStyles(e.type)} transition-all`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                {getEventIcon(e.type)} {e.type}
                              </span>
                              <span className="text-[8px] font-mono opacity-50">
                                {new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed">
                              {typeof e.payload === 'string' ? e.payload : (e.payload.message || e.payload.title || "New System Event")}
                            </p>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}


                  {activeTab === "ai" && (
                    <motion.div
                      key="ai"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex-1 p-6 flex flex-col"
                    >
                      <div className="bg-purple-600/10 border border-purple-500/20 rounded-2xl p-6 text-center space-y-4 mb-6">
                        <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-purple-500/30">
                          <span className="text-3xl animate-pulse">🤖</span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">AI Copilot</h3>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          "I am monitoring all crisis nodes. Ask me for guidance or resource allocation strategies."
                        </p>
                      </div>

                      <div className="space-y-3">
                        <button 
                          onClick={() => consultAI("What should I do right now?")}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-left text-[11px] text-gray-300 font-medium transition-all flex items-center gap-3"
                        >
                          <span className="text-purple-400">⚡</span> "What should I do right now?"
                        </button>
                        <button 
                          onClick={() => consultAI("Summarize active crises")}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-left text-[11px] text-gray-300 font-medium transition-all flex items-center gap-3"
                        >
                          <span className="text-purple-400">⚡</span> "Summarize active crises"
                        </button>
                        <button 
                          onClick={() => consultAI("Analyze resource gaps")}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-left text-[11px] text-gray-300 font-medium transition-all flex items-center gap-3"
                        >
                          <span className="text-purple-400">⚡</span> "Analyze resource gaps"
                        </button>
                      </div>

                      <div className="mt-auto pt-6 border-t border-white/10">
                         <div className="relative">
                            <input
                              placeholder="Type to consult AI..."
                              className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-[12px] text-white outline-none focus:border-purple-500 transition-all placeholder:text-gray-600"
                            />
                            <div className="absolute right-3 top-3 text-[10px] font-black text-purple-500 animate-pulse">LIVE</div>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </>
  );
}
