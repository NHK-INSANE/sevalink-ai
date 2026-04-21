"use client";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function DiscussionPanel({ problemId, user, onClose, problemTitle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // 1. Fetch History
    setLoading(true);
    fetch(`${API_BASE}/api/problems/${problemId}/history`)
      .then(res => res.json())
      .then(data => {
        setMessages(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load history", err);
        setLoading(false);
      });

    // 2. Connect Socket
    socketRef.current = io(API_BASE);
    socketRef.current.emit("join-discussion", problemId);

    socketRef.current.on("new-discussion-message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => socketRef.current.disconnect();
  }, [problemId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (type = "text", content = "", mediaUrl = null) => {
    if (type === "text" && !input.trim()) return;

    const msgData = {
      problemId,
      senderId: user._id || user.id,
      senderName: user.name,
      content: type === "text" ? input : content,
      type,
      mediaUrl,
      createdAt: new Date(),
    };

    try {
      await fetch(`${API_BASE}/api/problems/${problemId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgData)
      });
      
      socketRef.current.emit("send-discussion-message", msgData);
      if (type === "text") setInput("");
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      sendMessage("image", "Image shared", reader.result);
      toast.success("Image shared");
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
        reader.onloadend = () => {
          sendMessage("audio", "Voice note", reader.result);
          toast.success("Voice note sent");
        };
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

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-white dark:bg-gray-900 shadow-2xl z-[150] flex flex-col border-l border-gray-100 dark:border-gray-800"
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{problemTitle || "Team Coordination"}</h3>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest font-bold">Live Discussion</p>
        </div>
        <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6" ref={scrollRef}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Loading history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30">
             <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
             <p className="text-sm">No messages yet. Start the coordination.</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.senderId === (user._id || user.id) ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-[10px] font-bold text-gray-400">{m.senderName}</span>
                <span className="text-[9px] text-gray-300">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${
                m.senderId === (user._id || user.id) 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none"
              }`}>
                {m.type === "text" && m.content}
                {m.type === "image" && <img src={m.mediaUrl} className="rounded-xl max-w-full" alt="Shared" />}
                {m.type === "audio" && <audio src={m.mediaUrl} controls className="max-w-full scale-90 origin-left" />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded-2xl border border-gray-200 dark:border-gray-700">
          <label className="cursor-pointer p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition text-gray-500" title="Upload Image">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            className={`p-2.5 rounded-xl transition ${isRecording ? "bg-red-500 text-white animate-pulse scale-105" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            title="Hold to Record Voice"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>

          <input 
            type="text"
            placeholder="Coordination message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm dark:text-white px-2"
          />
          <button 
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            className="bg-blue-600 disabled:opacity-30 text-white p-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
          >
            <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
