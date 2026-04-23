"use client";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function DiscussionPanel({ problemId, user, onClose, problemTitle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUserId = user?._id || user?.id || null;

  useEffect(() => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    fetch(`${API_BASE}/api/problems/${problemId}/history`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    })
      .then(res => res.json())
      .then(data => {
        setMessages(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load history", err);
        setLoading(false);
      });

    socketRef.current = io(API_BASE);
    if (user) {
      socketRef.current.emit("register-user", currentUserId);
    }
    socketRef.current.emit("join-discussion", problemId);

    socketRef.current.on("new-discussion-message", (msg) => {
      setMessages(prev => {
        // Remove optimistic version if it exists
        const filtered = prev.filter(m => m.tempId !== msg.tempId);
        return [...filtered, msg];
      });
    });

    socketRef.current.on("user-typing", ({ userName, userId }) => {
      setTypingUsers(prev => ({ ...prev, [userId]: userName }));
    });

    socketRef.current.on("user-stop-typing", ({ userId }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [problemId, user, currentUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const handleTyping = (e) => {
    setInput(e.target.value);
    
    if (socketRef.current) {
      socketRef.current.emit("typing", { problemId, userName: user?.name || "Someone" });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("stop-typing", { problemId });
      }, 2000);
    }
  };

  const sendMessage = async (type = "text", content = "", mediaUrl = null) => {
    if (type === "text" && !input.trim()) return;

    const tempId = Date.now().toString();
    const msgData = {
      tempId,
      problemId,
      senderId: currentUserId || "anonymous",
      senderName: user?.name || "Anonymous User",
      content: type === "text" ? input : content,
      type,
      mediaUrl,
      createdAt: new Date(),
      sending: true
    };

    // Optimistic Update
    setMessages(prev => [...prev, msgData]);
    if (type === "text") setInput("");
    if (socketRef.current) socketRef.current.emit("stop-typing", { problemId });

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${API_BASE}/api/problems/${problemId}/messages`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(msgData)
      });
      
      const savedMsg = await res.json();
      socketRef.current.emit("send-discussion-message", { ...savedMsg, tempId });
    } catch (err) {
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      toast.error("Failed to send message");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      sendMessage("image", "Image shared", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
        const reader = new FileReader();
        reader.onloadend = () => sendMessage("audio", "Voice note", reader.result);
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const typingArray = Object.values(typingUsers);

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
      style={{ top: "var(--navbar-height)" }}
    />

    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed right-0 w-full md:w-[420px] glass-strong shadow-2xl z-[10000] flex flex-col border-l border-white/10"
      style={{ top: "var(--navbar-height)", height: "calc(100vh - var(--navbar-height))" }}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate text-lg tracking-tight">{problemTitle || "Coordination Channel"}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Encrypted Node</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-xl transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6" ref={scrollRef}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Syncing History</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20">
             <p className="text-sm text-gray-400">Establish coordination below</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.senderId === currentUserId;
            return (
              <div key={m._id || i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[10px] font-bold text-gray-500">{m.senderName}</span>
                  <span className="text-[9px] text-gray-700">{m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Sending..."}</span>
                </div>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm relative ${
                  isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white/5 text-gray-200 rounded-tl-none border border-white/5"
                } ${m.sending ? "opacity-70" : ""}`}>
                  {m.type === "text" && m.content}
                  {m.type === "image" && <img src={m.mediaUrl} className="rounded-xl" alt="Shared" />}
                  {m.type === "audio" && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                      </div>
                      <audio src={m.mediaUrl} controls className="h-8 w-40 opacity-50" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingArray.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-1">
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[10px] text-gray-500 italic">
              {typingArray.length === 1 ? `${typingArray[0]} is typing...` : "Multiple people typing..."}
            </span>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/10 bg-white/[0.02]">
        <div className="flex gap-2 items-center bg-black/40 p-2 rounded-2xl border border-white/5 focus-within:border-indigo-500/50 transition-all">
          <label className="p-3 hover:bg-white/5 rounded-xl cursor-pointer text-gray-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording}
            className={`p-3 rounded-xl transition ${isRecording ? "bg-red-500 text-white animate-pulse" : "text-gray-500 hover:bg-white/5 hover:text-white"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </motion.button>

          <input 
            type="text" placeholder="Secure transmission..."
            value={input} onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white px-2 placeholder-white/10"
          />
          <motion.button 
            whileTap={{ scale: 0.9 }} onClick={() => sendMessage()} disabled={!input.trim()}
            className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 disabled:opacity-20 transition-opacity"
          >
            <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
