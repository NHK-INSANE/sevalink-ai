"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MiniChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, input.trim()]);
    setInput("");
  };

  return (
    <div className="chat-bubble">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setIsOpen(true)}
            title="Team Chat"
            style={{
              width: 52, height: 52,
              borderRadius: 16,
              background: "rgba(13, 21, 38, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-secondary)",
              cursor: "pointer",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              position: "relative",
              backdropFilter: "blur(16px)",
            }}
            className="hover:border-indigo-500/40 hover:text-white transition-all"
          >
            <span className="text-[10px] font-black uppercase tracking-tighter">CHAT</span>
          </motion.button>
        )}

        {isOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              width: 300,
              background: "rgba(10, 16, 32, 0.96)",
              backdropFilter: "blur(28px)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 20,
              boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "white", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Ops Channel
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: "4px 8px", borderRadius: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
                className="hover:bg-white/10 hover:text-white"
              >
                <span className="text-[9px] font-black uppercase">CLOSE</span>
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                height: 220, overflowY: "auto",
                padding: "14px 14px 8px",
                display: "flex", flexDirection: "column", gap: 8,
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    gap: 8, color: "var(--text-muted)", textAlign: "center",
                  }}
                >
                  <span className="text-[10px] font-black uppercase text-gray-500">Secure Node Active</span>
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                    Channel initialized.<br />No transmissions yet.
                  </p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: "flex-end",
                      background: "var(--primary-gradient)",
                      color: "white",
                      padding: "8px 12px",
                      borderRadius: "12px 12px 4px 12px",
                      fontSize: 12, fontWeight: 500,
                      maxWidth: "85%",
                      boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                      wordBreak: "break-word",
                    }}
                  >
                    {m}
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div
              style={{
                padding: "10px 12px 14px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex", gap: 8,
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                placeholder="Secure message..."
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  fontSize: 12,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "white",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  padding: "0 12px",
                  height: 34,
                  borderRadius: 10,
                  background: "var(--primary-gradient)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                  transition: "transform 0.2s ease",
                }}
                className="hover:scale-105 active:scale-95"
              >
                <span className="text-[10px] font-black uppercase">SEND</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
