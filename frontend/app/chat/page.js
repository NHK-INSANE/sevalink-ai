"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { socket } from "../../lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("id");
  const targetProblemId = searchParams.get("problemId");
  
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState({ helpers: [], ngos: [], missions: [] });
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("helpers"); // helpers | ngos | missions
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("seva_user") || "null");
    if (!u) { router.push("/login"); return; }
    setUser(u);
    socket.emit("register-user", u.id || u._id);
    fetchData(u);
  }, []);

  const fetchData = async (currentUser) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [chatRes, missionRes] = await Promise.all([
        axios.get(`${API_BASE}/api/chat`, { headers: { Authorization: `Bearer ${encodeURIComponent(token)}` } }),
        axios.get(`${API_BASE}/api/chat/missions`, { headers: { Authorization: `Bearer ${encodeURIComponent(token)}` } })
      ]);
      
      const chats = chatRes.data;
      const sorted = {
        helpers: chats.filter(c => c.type === "direct" && c.participants.some(p => ["volunteer", "worker"].includes(p.role?.toLowerCase()))),
        ngos: chats.filter(c => c.type === "direct" && c.participants.some(p => p.role?.toLowerCase() === "ngo")),
        missions: missionRes.data
      };
      
      setConversations(sorted);

      // Auto-select logic
      if (targetUserId) {
        const existing = chats.find(c => c.participants.some(p => p._id === targetUserId));
        if (existing) {
          setSelectedChat(existing);
          setActiveTab(existing.participants.some(p => p.role?.toLowerCase() === "ngo") ? "ngos" : "helpers");
        } else {
          const createRes = await axios.post(`${API_BASE}/api/chat/direct`, { targetUserId }, {
            headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
          });
          const newChat = createRes.data;
          setSelectedChat(newChat);
          setActiveTab(newChat.participants.some(p => p.role?.toLowerCase() === "ngo") ? "ngos" : "helpers");
        }
      } else if (targetProblemId) {
        const mission = missionRes.data.find(m => m._id === targetProblemId);
        if (mission) {
          setSelectedChat(mission);
          setActiveTab("missions");
        }
      }
    } catch (err) {
      toast.error("Comm-link sync failure.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && selectedChat) {
      fetchMessages();
      socket.emit(selectedChat.type === "team" ? "join_problem" : "join_chat", selectedChat._id);
    }
  }, [selectedChat, user]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = selectedChat.type === "team" 
        ? `${API_BASE}/api/problems/${selectedChat._id}/history` 
        : `${API_BASE}/api/chat/${selectedChat._id}/messages`;
      
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${encodeURIComponent(token)}` } });
      const normalized = res.data.map(m => ({
        ...m,
        message: m.text || m.message,
        senderName: m.senderName || m.senderId?.name || "Responder"
      }));
      setMessages(normalized);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
  };

  useEffect(() => {
    const handleMessage = (msg) => {
      if (selectedChat && (msg.chatId === selectedChat._id || msg.problemId === selectedChat._id)) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, { ...msg, message: msg.text || msg.message }];
        });
        scrollToBottom();
      }
    };
    socket.on("receive_message", handleMessage);
    return () => socket.off("receive_message", handleMessage);
  }, [selectedChat]);

  const sendMessage = async (content = inputText, type = "text", mediaUrl = null) => {
    if (!content.trim() && !mediaUrl) return;
    if (type === "text") setInputText("");

    const msgData = {
      problemId: selectedChat.type === "team" ? selectedChat._id : null,
      chatId: selectedChat.type === "direct" ? selectedChat._id : null,
      senderId: user.id || user._id,
      senderName: user.name,
      text: content,
      type,
      mediaUrl,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, { ...msgData, _id: Date.now().toString(), message: content }]);
    scrollToBottom();
    socket.emit("send_message", msgData);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}`, "Content-Type": "multipart/form-data" }
      });
      sendMessage("Shared a file", "image", res.data.data.url);
    } catch (err) {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const getOtherParticipant = (chat) => {
    if (chat.type === "team") return { name: chat.title || "MISSION UNIT" };
    return chat.participants?.find(p => p._id !== (user?.id || user?._id)) || { name: "Operator" };
  };

  if (!user) return <div className="min-h-screen bg-[#080B14]" />;

  const filteredItems = conversations[activeTab] || [];

  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col h-screen overflow-hidden text-white font-inter">
      <Navbar />
      <PageWrapper className="flex-1 flex flex-col overflow-hidden pt-[100px] pb-6 px-4 md:px-8">
        <div className="flex-1 flex w-full mx-auto bg-[#0f172a]/40 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-3xl">
          
          {/* SIDEBAR */}
          <div className={`${selectedChat ? "hidden md:flex" : "flex"} w-full md:w-[380px] flex-col border-r border-white/5 bg-black/20`}>
            <div className="p-8 border-b border-white/5 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Comms</h2>
                <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Live</span>
                </div>
              </div>
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                 {["helpers", "ngos", "missions"].map(t => (
                   <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === t ? "bg-purple-600 shadow-lg text-white" : "text-gray-500 hover:text-gray-300"}`}>
                     {t === "missions" ? "Units" : t}
                   </button>
                 ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-3xl animate-pulse" />)}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4 opacity-20">📡</div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">No active {activeTab} channels found</p>
                </div>
              ) : (
                filteredItems.map(c => {
                  const other = getOtherParticipant(c);
                  const isSelected = selectedChat?._id === c._id;
                  return (
                    <div key={c._id} onClick={() => setSelectedChat(c)} className={`p-6 cursor-pointer transition-all flex items-center gap-5 relative group ${isSelected ? "bg-white/5" : "hover:bg-white/[0.02]"}`}>
                      {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-purple-500 rounded-r-full" />}
                      <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-white font-black text-xl shadow-xl transition-transform group-hover:scale-105 ${c.type === "team" ? "bg-gradient-to-br from-red-600 to-purple-600" : "bg-gradient-to-br from-indigo-600 to-blue-600"}`}>
                        {c.type === "team" ? "🚨" : (other.name?.charAt(0) || "U")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-bold text-sm truncate uppercase tracking-tight ${isSelected ? "text-white" : "text-gray-300"}`}>{other.name}</span>
                          <span className="text-[8px] text-gray-600 font-black">
                            {c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate font-medium">
                          {c.lastMessage?.text || c.lastMessage?.message || "Encrypted Link Active..."}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MAIN CHAT WINDOW */}
          <div className={`${!selectedChat ? "hidden md:flex" : "flex"} flex-1 flex flex-col relative bg-[#0B1220]/60`}>
            {selectedChat ? (
              <>
                {/* CHAT HEADER */}
                <div className="px-10 py-6 border-b border-white/5 bg-[#0f172a]/90 backdrop-blur-2xl z-20 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <button onClick={() => setSelectedChat(null)} className="md:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">←</button>
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-xl">
                      {getOtherParticipant(selectedChat).name?.charAt(0) || "M"}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        {getOtherParticipant(selectedChat).name}
                        {selectedChat.type === "team" && <span className="text-[8px] bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/10 uppercase tracking-widest font-black">Tactical</span>}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Node Sync Active</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* MESSAGES */}
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-[url('/grid.svg')] bg-repeat">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                      <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-600/5 flex items-center justify-center mx-auto mb-6 text-indigo-400 text-3xl border border-dashed border-white/10">🔐</div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-3">Protocol: Neural-L4</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.15em] max-w-[300px] leading-relaxed">End-to-End Encrypted tactical link. Automated deletion sequence in 14 days.</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = (m.senderId?._id || m.senderId) === (user.id || user._id);
                      return (
                        <div key={m._id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`max-w-[85%] md:max-w-[65%] px-6 py-4 rounded-[2rem] shadow-2xl relative ${isMe ? "bg-purple-600 text-white rounded-tr-none" : "bg-[#1e293b] text-gray-200 rounded-tl-none border border-white/10 shadow-purple-500/5"}`}>
                            {!isMe && selectedChat.type === "team" && <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2"><span className="w-1 h-1 bg-purple-500 rounded-full" /> {m.senderName || "Responder"}</p>}
                            
                            {m.type === "image" ? (
                              <div className="space-y-3">
                                <img src={m.mediaUrl} alt="Attached tactical intel" className="rounded-2xl w-full max-h-[300px] object-cover border border-white/10" />
                                <p className="text-[13px] leading-relaxed font-medium italic opacity-80">{m.message}</p>
                              </div>
                            ) : (
                              <p className="text-[13px] leading-relaxed font-medium">{m.message}</p>
                            )}

                            <div className="flex justify-end items-center gap-2 mt-2 text-[8px] font-black opacity-40 uppercase tracking-widest">
                              {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {isMe && <span className="text-emerald-400">SYNCED</span>}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* INPUT AREA */}
                <div className="p-8 bg-[#0f172a]/95 backdrop-blur-3xl border-t border-white/5 flex items-center gap-4 z-20">
                  <div className="relative group">
                    <button onClick={() => fileInputRef.current.click()} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all shadow-xl">
                      {uploading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "+"}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                  </div>
                  <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Transmit secure data..." className="flex-1 bg-black/40 border border-white/10 rounded-[1.5rem] px-8 py-5 text-[14px] text-white placeholder-gray-700 outline-none focus:border-purple-500/50 transition-all shadow-inner font-medium" />
                  <button onClick={() => sendMessage()} disabled={!inputText.trim() && !uploading} className="w-16 h-16 rounded-[1.5rem] bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 disabled:opacity-20 transition-all active:scale-90 shadow-2xl shadow-purple-500/40 font-black text-xl">➤</button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 relative bg-[url('/grid.svg')] bg-repeat opacity-80">
                <div className="w-24 h-24 bg-white/[0.02] rounded-[3rem] flex items-center justify-center text-5xl mb-6 border border-dashed border-white/10 animate-float shadow-2xl shadow-purple-500/5">🛰️</div>
                <h3 className="text-2xl font-black text-white uppercase tracking-[0.3em] mb-4">Tactical Comms Offline</h3>
                <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.2em] max-w-[300px] leading-relaxed mx-auto">
                  Select a secure channel from the left terminal to initialize neural link synchronization.
                </p>
                <div className="mt-12 flex gap-12 opacity-30">
                   <div className="text-center space-y-2">
                     <p className="text-[9px] font-black uppercase">AES-256</p>
                     <p className="text-[8px] font-bold">ENCRYPTION</p>
                   </div>
                   <div className="text-center space-y-2">
                     <p className="text-[9px] font-black uppercase">REAL-TIME</p>
                     <p className="text-[8px] font-bold">SYNC</p>
                   </div>
                   <div className="text-center space-y-2">
                     <p className="text-[9px] font-black uppercase">AUTO</p>
                     <p className="text-[8px] font-bold">PURGE</p>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white text-xs font-black uppercase tracking-widest animate-pulse">Initializing Comm-Link...</div>}>
      <ChatContent />
    </Suspense>
  );
}
