"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../../lib/socket";

export default function MiniChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    socket.on("receive_global_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.off("receive_global_message");
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

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

  return (
    <div className="fixed bottom-10 right-10 z-[10000] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="w-[320px] bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-white/5 p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">OPS Channel</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">
                Minimize
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="h-64 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                   <div className="w-8 h-8 rounded-full border border-dashed border-white/20" />
                   <p className="text-[10px] font-bold uppercase tracking-widest">Secure Node Standby</p>
                </div>
              ) : messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tight">{m.senderName}</span>
                    <span className="text-[7px] text-gray-600 font-medium">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-[12px] text-gray-300 leading-snug bg-white/5 p-2.5 rounded-xl rounded-tl-none border border-white/5">
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 bg-white/[0.02] border-t border-white/5 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Broadcast transmission..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[11px] text-white outline-none focus:border-indigo-500 transition-all"
              />
              <button onClick={sendMessage} className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-2xl transition-all duration-300 ${
          isOpen ? "bg-white/10 border-white/20 text-white" : "bg-indigo-600 border-indigo-500 text-white"
        }`}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black tracking-tighter leading-none mb-0.5">OPS</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
          </div>
        )}
      </motion.button>
    </div>
  );
}
