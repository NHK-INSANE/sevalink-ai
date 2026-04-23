"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";

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
    /* chat-bubble class sets: fixed, bottom-28px, right-28px, z-fab */
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
            <MessageCircle size={20} />
            <span
              style={{
                position: "absolute", top: 10, right: 10,
                width: 8, height: 8, borderRadius: "50%",
                background: "#22c55e",
                border: "2px solid var(--bg-main)",
                boxShadow: "0 0 6px rgba(34,197,94,0.6)",
              }}
            />
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
                <span
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 6px rgba(34,197,94,0.6)",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: "white", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Ops Channel
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: 26, height: 26, borderRadius: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
                className="hover:bg-white/10 hover:text-white"
              >
                <X size={13} />
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
                  <span style={{ fontSize: 28 }}>📡</span>
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                    Secure channel active.<br />No messages yet.
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
                  width: 34, height: 34,
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
                <Send size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
