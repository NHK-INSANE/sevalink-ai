"use client";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { apiRequest } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function DiscussionPanel({ problemId, user, onClose }) {
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

    // Save to DB
    try {
      await fetch(`${API_BASE}/api/problems/${problemId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgData)
      });
      
      // Emit via socket
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
      toast.success("Image uploaded");
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
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl z-[150] flex flex-col border-l border-gray-100"
    >
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <div>
          <h3 className="font-bold text-gray-800">Team Coordination</h3>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Real-time Discussion</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {loading ? (
          <div className="flex justify-center py-10"><span className="animate-spin text-2xl">⏳</span></div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.senderId === (user._id || user.id) ? "items-end" : "items-start"}`}>
              <span className="text-[10px] font-bold text-gray-400 mb-1">{m.senderName}</span>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                m.senderId === (user._id || user.id) 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-gray-100 text-gray-800 rounded-tl-none"
              }`}>
                {m.type === "text" && m.content}
                {m.type === "image" && <img src={m.mediaUrl} className="rounded-lg max-w-full" alt="Shared" />}
                {m.type === "audio" && <audio src={m.mediaUrl} controls className="max-w-full" />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
          <label className="cursor-pointer p-2 hover:bg-gray-200 rounded-lg transition" title="Upload Image">
            🖼️
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            className={`p-2 rounded-lg transition ${isRecording ? "bg-red-100 animate-pulse scale-110" : "hover:bg-gray-200"}`}
            title="Hold to Record Voice"
          >
            🎙️
          </button>

          <input 
            type="text"
            placeholder="Type coordination message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
          />
          <button 
            onClick={() => sendMessage()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
          >
            ✈️
          </button>
        </div>
        <p className="text-[9px] text-gray-400 mt-2 text-center">Images and voice notes are shared instantly with the team.</p>
      </div>
    </motion.div>
  );
}
