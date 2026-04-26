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
  const [conversations, setConversations] = useState({ personnel: [], partners: [], missions: [] });
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personnel"); // personnel | partners | missions
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
      
      const chats = Array.isArray(chatRes.data) ? chatRes.data : [];
      const missions = Array.isArray(missionRes.data) ? missionRes.data : [];

      const sorted = {
        personnel: chats.filter(c => c.type === "direct" && c.participants.some(p => ["volunteer", "worker", "Volunteer", "Worker", "user"].includes(p.role?.toLowerCase()))),
        partners: chats.filter(c => c.type === "direct" && c.participants.some(p => p.role?.toLowerCase() === "ngo")),
        missions: missions
      };
      
      setConversations(sorted);

      if (targetUserId) {
        const existing = chats.find(c => c.participants.some(p => p._id === targetUserId));
        if (existing) {
          setSelectedChat(existing);
          setActiveTab(existing.participants.some(p => p.role?.toLowerCase() === "ngo") ? "partners" : "personnel");
        } else {
          const createRes = await axios.post(`${API_BASE}/api/chat/direct`, { targetUserId }, {
            headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
          });
          const newChat = createRes.data;
          setSelectedChat(newChat);
          setActiveTab(newChat.participants.some(p => p.role?.toLowerCase() === "ngo") ? "partners" : "personnel");
        }
      } else if (targetProblemId) {
        const mission = missions.find(m => m._id === targetProblemId);
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
      sendMessage("Shared an attachment", "image", res.data.data.url);
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
        <div className="flex-1 flex w-full mx-auto bg-[#0f172a]/40 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-3xl">
          
          <div className={`${selectedChat ? "hidden md:flex" : "flex"} w-full md:w-[400px] flex-col border-r border-white/5 bg-black/20`}>
            <div className="p-10 border-b border-white/5 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Comms Hub</h2>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Live Grid</span>
                </div>
              </div>
              <div className="flex bg-white/[0.02] p-1.5 rounded-2xl border border-white/5">
                 {["personnel", "partners", "missions"].map(t => (
                   <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === t ? "bg-purple-600 shadow-xl text-white" : "text-gray-500 hover:text-gray-300"}`}>
                     {t === "personnel" ? "Helpers" : t === "partners" ? "NGOs" : "Units"}
                   </button>
                 ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 space-y-6">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-[2rem] animate-pulse" />)}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-5xl mb-6 opacity-10">📡</div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700 leading-relaxed">No active {activeTab} signatures detected</p>
                </div>
              ) : (
                filteredItems.map(c => {
                  const other = getOtherParticipant(c);
                  const isSelected = selectedChat?._id === c._id;
                  return (
                    <div key={c._id} onClick={() => setSelectedChat(c)} className={`p-8 cursor-pointer transition-all flex items-center gap-6 relative group ${isSelected ? "bg-white/[0.03]" : "hover:bg-white/[0.01]"}`}>
                      {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-purple-500 rounded-r-full shadow-[4px_0_15px_rgba(168,85,247,0.5)]" />}
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-2xl transition-all group-hover:scale-105 border border-white/10 ${c.type === "team" ? "bg-gradient-to-br from-red-600 to-purple-600" : "bg-gradient-to-br from-indigo-600 to-blue-600"}`}>
                        {c.type === "team" ? "⚡" : (other.name?.charAt(0) || "U")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-black text-sm truncate uppercase tracking-tight ${isSelected ? "text-white" : "text-gray-400 group-hover:text-white"}`}>{other.name}</span>
                          <span className="text-[8px] text-gray-700 font-black uppercase tracking-widest">
                            {c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 truncate font-bold uppercase tracking-tight">
                          {c.lastMessage?.text || c.lastMessage?.message || "Tactical Link Established..."}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={`${!selectedChat ? "hidden md:flex" : "flex"} flex-1 flex flex-col relative bg-[#0B1220]/60`}>
            {selectedChat ? (
              <>
                <div className="px-10 py-8 border-b border-white/5 bg-[#0f172a]/95 backdrop-blur-3xl z-20 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button onClick={() => setSelectedChat(null)} className="md:hidden w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white border border-white/5 shadow-xl">←</button>
                    <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-2xl shadow-inner">
                      {getOtherParticipant(selectedChat).name?.charAt(0) || "M"}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                        {getOtherParticipant(selectedChat).name}
                        {selectedChat.type === "team" && <span className="text-[9px] bg-red-600 text-white px-3 py-1 rounded-lg border border-red-500/20 uppercase tracking-widest font-black shadow-lg">Live Mission</span>}
                      </h3>
                      <div className="flex items-center gap-2.5 mt-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Secure Neural Link Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden lg:flex gap-3">
                     <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all">🔍</button>
                     <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all">⚙️</button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar bg-[url('/grid.svg')] bg-repeat opacity-95">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                      <div className="w-24 h-24 rounded-[3rem] bg-indigo-600/5 flex items-center justify-center mx-auto mb-8 text-indigo-400 text-4xl border border-dashed border-white/10">🔐</div>
                      <h4 className="text-[12px] font-black text-white uppercase tracking-[0.4em] mb-4">Encryption: Neural-Alpha</h4>
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] max-w-[320px] leading-relaxed">End-to-End tactical synchronization. Mission history strictly classified.</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = (m.senderId?._id || m.senderId) === (user.id || user._id);
                      return (
                        <div key={m._id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`max-w-[85%] md:max-w-[70%] px-8 py-5 rounded-[2.5rem] shadow-2xl relative ${isMe ? "bg-purple-600 text-white rounded-tr-none shadow-purple-500/10" : "bg-[#1e293b] text-gray-200 rounded-tl-none border border-white/5"}`}>
                            {!isMe && selectedChat.type === "team" && <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> {m.senderName || "Responder"}</p>}
                            
                            {m.type === "image" ? (
                              <div className="space-y-4">
                                <img src={m.mediaUrl} alt="Tactical Intel" className="rounded-2xl w-full max-h-[400px] object-cover border border-white/10 shadow-2xl" />
                                <p className="text-[14px] leading-relaxed font-bold italic opacity-90 uppercase tracking-tight">{m.message}</p>
                              </div>
                            ) : (
                              <p className="text-[14px] leading-relaxed font-bold tracking-tight">{m.message}</p>
                            )}

                            <div className="flex justify-end items-center gap-3 mt-3 text-[9px] font-black opacity-30 uppercase tracking-[0.2em]">
                              {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {isMe && <span className="text-emerald-400 font-black">SYNCED</span>}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-10 bg-[#0f172a]/95 backdrop-blur-3xl border-t border-white/5 flex items-center gap-5 z-20 shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
                  <div className="relative group">
                    <button onClick={() => fileInputRef.current.click()} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-gray-500 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all shadow-xl active:scale-95">
                      {uploading ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                  </div>
                  <input 
                    type="text" 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
                    placeholder="Transmit encrypted mission data..." 
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-8 py-5 text-[15px] text-white placeholder-gray-800 outline-none focus:border-purple-500/30 transition-all shadow-inner font-bold tracking-tight" 
                  />
                  <button 
                    onClick={() => sendMessage()} 
                    disabled={!inputText.trim() && !uploading} 
                    className="w-20 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 disabled:opacity-20 transition-all active:scale-95 shadow-2xl shadow-purple-500/40"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-16 relative bg-[url('/grid.svg')] bg-repeat opacity-60">
                <div className="w-32 h-32 bg-white/[0.02] rounded-[4rem] flex items-center justify-center text-6xl mb-10 border border-dashed border-white/10 animate-float shadow-2xl shadow-purple-500/10">🛰️</div>
                <h3 className="text-3xl font-black text-white uppercase tracking-[0.4em] mb-6">Tactical Comms Offline</h3>
                <p className="text-gray-600 text-[11px] font-black uppercase tracking-[0.3em] max-w-[340px] leading-relaxed mx-auto">
                  Initialize a secure neural link by selecting an active node signature from the left terminal.
                </p>
                <div className="mt-16 flex gap-16 opacity-20">
                   <div className="text-center space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-white">SHA-512</p>
                     <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">ENCRYPTION</p>
                   </div>
                   <div className="text-center space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-white">LOW-LATENCY</p>
                     <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">TRANSMISSION</p>
                   </div>
                   <div className="text-center space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-widest text-white">AUTO-PURGE</p>
                     <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">PROTOCOL</p>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Syncing Tactical Grid...</div>}>
      <ChatContent />
    </Suspense>
  );
}
