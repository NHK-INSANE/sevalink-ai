"use client";
import { useEffect, useState, useRef } from "react";
import { socket } from "../../lib/socket";
import { motion, AnimatePresence } from "framer-motion";

export default function OpsPanel() {
  const [events, setEvents] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    socket.emit("join_ops");

    socket.on("ops_event", (event) => {
      setEvents((prev) => [event, ...prev].slice(0, 50));
      if (!isOpen) setIsOpen(true);
    });

    return () => {
      // socket.off("ops_event"); // Keep connection but stop listening if needed
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

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

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-80 h-[450px] bg-[#0b0f1a]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-white">Live OPS Command</h2>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar"
              >
                {events.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <div className="w-10 h-10 border-2 border-dashed border-white/20 rounded-full mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Monitoring Frequencies...</p>
                  </div>
                ) : (
                  events.map((e, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-xl border ${getEventStyles(e.type)} transition-all ${e.payload.isAutoReply ? "border-dashed border-white/40 ring-1 ring-white/10" : ""}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1">
                          {getEventIcon(e.type)} {e.type} {e.payload.isAutoReply && "(AUTO-REPLY)"}
                        </span>
                        <span className="text-[8px] font-mono opacity-50">
                          {new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-[11px] font-medium leading-relaxed ${e.payload.isAutoReply ? "italic opacity-90" : ""}`}>
                        {typeof e.payload === 'string' ? e.payload : (e.payload.message || e.payload.title || (e.type === "NEAREST" ? `Found ${e.payload.nearby?.length} responders for: ${e.payload.crisisTitle}` : "New System Event"))}
                      </p>
                      
                      {e.type === "NEAREST" && e.payload.nearby && (
                        <div className="mt-2 space-y-1">
                          {e.payload.nearby.map(n => (
                            <div key={n._id} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded text-[8px]">
                              <span className="font-bold text-gray-300">{n.name} ({n.role})</span>
                              <span className="text-yellow-500 font-mono">{n.distance}km</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {e.payload.suggestedResponders && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {e.payload.suggestedResponders.map(r => (
                            <span key={r} className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-white/10 border border-white/5">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}

                      {e.payload.location && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between opacity-60">
                          <div className="flex items-center gap-1.5">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span className="text-[8px] font-mono">
                              {e.payload.location.lat?.toFixed(3)}, {e.payload.location.lng?.toFixed(3)}
                            </span>
                          </div>
                          {e.payload.isTracking && (
                            <span className="text-[7px] font-black uppercase tracking-tighter text-emerald-400 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                              Live Tracking
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-95 ${
            isOpen ? "bg-white text-black" : "bg-indigo-600 text-white hover:bg-indigo-500"
          }`}
        >
          {isOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          ) : (
            <div className="relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {events.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-indigo-600 rounded-full" />
              )}
            </div>
          )}
        </button>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </>
  );
}
