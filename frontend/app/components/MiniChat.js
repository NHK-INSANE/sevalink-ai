"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MiniChat() {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-28 right-10 z-[100]">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-[var(--bg-card)] text-white flex items-center justify-center rounded-[1.25rem] shadow-2xl hover:scale-110 active:scale-95 transition border border-white/10 group relative"
            title="Team Chat"
          >
            <span className="text-2xl group-hover:rotate-12 transition-transform">💬</span>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[var(--bg-main)] animate-pulse" />
          </motion.button>
        )}

        {isOpen && (
          <motion.div 
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.9 }}
            className="w-80 bg-[var(--bg-card)] text-white rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col backdrop-blur-xl"
          >
            <div className="p-5 bg-white/5 border-b border-white/5 font-bold flex justify-between items-center text-xs uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Global Ops Chat</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition">✕</button>
            </div>

            <div className="h-64 overflow-y-auto p-5 text-sm flex flex-col gap-3 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-[var(--text-secondary)] text-center italic mt-auto mb-auto text-xs opacity-50">
                  <div className="text-2xl mb-2">📡</div>
                  Secure channel established.<br/>Waiting for communications...
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className="bg-[var(--primary)] text-white px-4 py-2 rounded-2xl rounded-tr-none self-end max-w-[85%] break-words shadow-lg shadow-indigo-500/10 text-xs font-medium">
                    {m}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-white/5 border-t border-white/5">
              <input
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-white text-xs outline-none placeholder-white/20 border border-transparent focus:border-[var(--primary)] transition-all"
                placeholder="Secure message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim() !== "") {
                    setMessages([...messages, e.target.value.trim()]);
                    e.target.value = "";
                  }
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
