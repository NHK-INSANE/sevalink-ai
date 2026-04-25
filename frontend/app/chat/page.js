"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { socket } from "../../lib/socket";
import { getUser } from "../utils/auth";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white text-xs font-black uppercase tracking-widest animate-pulse">Initializing Comm-Link...</div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("id");
  
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("direct"); // direct | team
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  let typingTimeout = useRef(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("seva_user") || "null");
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    socket.emit("register-user", u.id || u._id);
    fetchChats(u);
  }, []);

  const fetchChats = async (currentUser) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/chat`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      setChats(res.data);

      if (targetUserId && targetUserId !== (currentUser.id || currentUser._id)) {
        let existing = res.data.find(c => c.type === "direct" && c.participants.some(p => p._id === targetUserId));
        if (existing) {
          setSelectedChat(existing);
          setActiveTab("direct");
        } else {
          const createRes = await axios.post(`${API_BASE}/api/chat/direct`, { targetUserId }, {
            headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
          });
          setChats(prev => [createRes.data, ...prev]);
          setSelectedChat(createRes.data);
          setActiveTab("direct");
        }
      }
    } catch (err) {
      toast.error("Failed to load comm channels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && selectedChat) {
      fetchMessages(selectedChat._id);
    }
  }, [selectedChat, user]);

  const fetchMessages = async (chatId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      setMessages(res.data);
      scrollToBottom();
    } catch (err) {
      toast.error("Transmission error.");
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    if (!user) return;

    const handleMessage = (msg) => {
      if (selectedChat && msg.chatId === selectedChat._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      } else {
        toast.success(`Secure msg from ${msg.senderId?.name || "Responder"}`, { style: { background: '#1e293b', color: '#fff', fontSize: '12px' } });
      }
      // Update sidebar
      setChats(prev => prev.map(c => c._id === msg.chatId ? { ...c, lastMessage: msg, updatedAt: new Date() } : c).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    };

    const handleTyping = ({ chatId, name }) => {
      if (selectedChat && chatId === selectedChat._id) {
        setIsTyping(name);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
      }
    };

    socket.on("receive_message", handleMessage);
    socket.on("user_typing", handleTyping);
    
    return () => {
      socket.off("receive_message", handleMessage);
      socket.off("user_typing", handleTyping);
    };
  }, [user, selectedChat]);

  const handleTypingEvent = () => {
    if (selectedChat) socket.emit("typing", { chatId: selectedChat._id, name: user.name });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("File exceeds 10MB limit.");

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      sendMessage(res.data.url, file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "text");
    } catch (err) {
      toast.error("Media upload failed.");
    } finally {
      setUploading(false);
      e.target.value = null; // reset
    }
  };

  const sendMessage = async (content = inputText, type = "text") => {
    if (!content.trim() && !uploading) return;
    if (type === "text") setInputText("");

    const msgData = {
      chatId: selectedChat._id,
      senderId: user.id || user._id,
      message: type === "text" ? content : "Media File",
      type,
      mediaUrl: type !== "text" ? content : null
    };

    // Optimistic UI
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { ...msgData, _id: tempId, createdAt: new Date(), senderId: { _id: user.id || user._id, name: user.name } }]);
    scrollToBottom();

    socket.emit("send_message", msgData);
  };

  const getOtherParticipant = (chat) => {
    if (chat.type === "team") return { name: `MISSION: ${chat.problemId?.title || "Emergency Group"}` };
    return chat.participants.find(p => p._id !== (user?.id || user?._id)) || { name: "Operator" };
  };

  if (!user) return <div className="min-h-screen bg-[#080B14]" />;

  const filteredChats = chats.filter(c => c.type === activeTab);

  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col h-screen overflow-hidden text-white">
      <Navbar />
      <PageWrapper className="flex-1 flex flex-col overflow-hidden pt-[100px] pb-6 px-6">
        <div className="flex-1 flex max-w-[1400px] w-full mx-auto bg-[#0f172a]/40 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
          
          {/* ── LEFT PANEL: CONVERSATIONS ── */}
          <div className="w-full md:w-[350px] flex flex-col border-r border-white/5 bg-[#0f172a]/20">
            <div className="p-6 border-b border-white/5 space-y-4">
              <h2 className="text-xl font-black uppercase tracking-widest text-white">Secure Channels</h2>
              <div className="flex bg-black/40 p-1 rounded-xl">
                 <button 
                  onClick={() => setActiveTab("direct")}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === "direct" ? "bg-indigo-600 shadow-md" : "text-gray-500 hover:text-gray-300"}`}
                 >
                    Direct Ops
                 </button>
                 <button 
                  onClick={() => setActiveTab("team")}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === "team" ? "bg-purple-600 shadow-md" : "text-gray-500 hover:text-gray-300"}`}
                 >
                    Mission Units
                 </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-gray-600 border border-dashed border-white/5 m-6 rounded-2xl">
                  No Active {activeTab === "direct" ? "Direct" : "Team"} Channels
                </div>
              ) : (
                filteredChats.map(c => {
                  const other = getOtherParticipant(c);
                  const isSelected = selectedChat?._id === c._id;
                  
                  return (
                    <div 
                      key={c._id}
                      onClick={() => setSelectedChat(c)}
                      className={`p-5 cursor-pointer transition-all flex items-center gap-4 border-b border-white/5 relative ${isSelected ? "bg-white/5" : "hover:bg-white/[0.02]"}`}
                    >
                      {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-r-full" />}
                      
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg ${c.type === "team" ? "bg-gradient-to-br from-purple-600 to-indigo-600" : "bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10"}`}>
                        {c.type === "team" ? "🚨" : (other.name?.charAt(0) || "U")}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-bold text-sm truncate ${isSelected ? "text-white" : "text-gray-300"}`}>
                            {other.name}
                          </span>
                          <span className="text-[9px] text-gray-500 font-bold ml-2">
                            {c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 truncate font-medium">
                          {c.lastMessage?.message || "Channel Open..."}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: CHAT WINDOW ── */}
          <div className="flex-1 flex flex-col relative bg-[#0B1220]/80">
            {selectedChat ? (
              <>
                <div className="px-8 py-5 border-b border-white/5 bg-[#0f172a]/80 backdrop-blur-md z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xl">
                      {getOtherParticipant(selectedChat).name?.charAt(0) || "M"}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                        {getOtherParticipant(selectedChat).name}
                        {selectedChat.type === "team" && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 uppercase">Mission Group</span>}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80">Secured Frequency</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 flex items-center justify-center mx-auto mb-4 text-indigo-400 text-2xl">🔒</div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-2">End-to-End Encrypted</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-[250px] mx-auto leading-relaxed">Transmissions are secured via SevaLink neural protocols. Data retained for 14 days.</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = m.senderId?._id === (user.id || user._id);
                      return (
                        <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-xl ${
                              isMe ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-[#1e293b] text-gray-200 rounded-tl-sm border border-white/5"
                            }`}
                          >
                            {!isMe && selectedChat.type === "team" && <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">{m.senderId?.name || "Responder"}</p>}
                            
                            {m.type === "image" && m.mediaUrl ? (
                              <img src={m.mediaUrl} alt="Transmission" className="w-full max-w-sm rounded-xl mb-2 border border-white/10" />
                            ) : m.type === "video" && m.mediaUrl ? (
                              <video src={m.mediaUrl} controls className="w-full max-w-sm rounded-xl mb-2 border border-white/10" />
                            ) : (
                              <p className="text-[13px] leading-relaxed font-medium">{m.message}</p>
                            )}
                            
                            <div className="flex justify-end items-center gap-1.5 mt-1.5 text-[8px] font-black opacity-50 uppercase tracking-widest">
                              {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {isMe && <span className="text-emerald-400">✓✓</span>}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })
                  )}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-[#1e293b] px-4 py-2.5 rounded-2xl rounded-tl-sm border border-white/5 text-[10px] font-bold text-gray-400 italic">
                        {isTyping} is typing...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-6 bg-[#0f172a]/90 backdrop-blur-xl border-t border-white/5 flex items-center gap-4 z-10">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-12 h-12 rounded-[1.5rem] bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center transition-all disabled:opacity-30"
                  >
                    📎
                  </button>
                  <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => { setInputText(e.target.value); handleTypingEvent(); }}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={uploading ? "Uploading media..." : "Type secure message..."}
                    disabled={uploading}
                    className="flex-1 bg-black/40 border border-white/10 rounded-[1.5rem] px-6 py-4 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                  />
                  <button 
                    onClick={() => sendMessage()}
                    disabled={(!inputText.trim() && !uploading)}
                    className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 disabled:opacity-20 transition-all active:scale-90 shadow-lg shadow-indigo-500/20"
                  >
                    ➤
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 relative">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-3xl mb-4 border border-dashed border-white/10 opacity-50">📡</div>
                <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-2">System Standby</h3>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Select a channel to transmit.</p>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
}
