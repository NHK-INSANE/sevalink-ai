"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { socket } from "../../lib/socket";
import { getUser } from "../utils/auth";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B1220]" />}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("id"); // This is the person we want to talk to
  
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    // Register socket
    socket.emit("register-user", u.id || u._id);
    loadAll(u);
  }, []);

  const loadAll = async (currentUser) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // 1. Fetch conversations
      const convRes = await fetch(`${API_BASE}/api/chat`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      let convs = await convRes.json();
      setConversations(convs);

      // 2. Handle deep link (targetUserId)
      if (targetUserId) {
        // Find if conversation already exists
        let existing = convs.find(c => c.members.some(m => m._id === targetUserId));
        
        if (existing) {
          setSelectedChat(existing);
        } else {
          // Create new conversation
          const createRes = await fetch(`${API_BASE}/api/chat`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              Authorization: `Bearer ${encodeURIComponent(token)}` 
            },
            body: JSON.stringify({ receiverId: targetUserId })
          });
          const newConv = await createRes.json();
          setConversations(prev => [newConv, ...prev]);
          setSelectedChat(newConv);
        }
      }
    } catch (err) {
      console.error("Load error", err);
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
      const res = await fetch(`${API_BASE}/api/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      const data = await res.json();
      setMessages(data);
      
      // Mark as seen
      fetch(`${API_BASE}/api/chat/${chatId}/seen`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
    } catch (err) {
      console.error("Fetch messages error", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const handleMessage = (msg) => {
      // If it's for current chat
      if (selectedChat && msg.conversationId === selectedChat._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } else {
        toast.success(`New message from ${msg.senderName || "Responder"}`, {
          icon: '💬',
          style: { background: '#1e293b', color: '#fff' }
        });
      }
      updateSidebar(msg);
    };

    const handleOpsEvent = (event) => {
      if (event.type === "MISSION") {
        toast.error(`🚨 MISSION ALERT: ${event.payload.title}`, {
          duration: 6000,
          style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
        });
        loadAll(user);
      }
    };

    socket.on("chat_message", handleMessage);
    socket.on("ops_event", handleOpsEvent);
    return () => {
      socket.off("chat_message", handleMessage);
      socket.off("ops_event", handleOpsEvent);
    };
  }, [user, selectedChat]);

  const updateSidebar = (msg) => {
    setConversations(prev => {
      const exists = prev.some(c => c._id === msg.conversationId);
      if (!exists) {
        loadAll(user);
        return prev;
      }
      return prev.map(c => {
        if (c._id === msg.conversationId) {
          return { ...c, lastMessage: msg.text, updatedAt: new Date() };
        }
        return c;
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedChat) return;
    const textToSend = inputText;
    setInputText("");

    const otherMember = getOtherMember(selectedChat);
    const receiverId = otherMember._id;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/chat/${selectedChat._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${encodeURIComponent(token)}`
        },
        body: JSON.stringify({ text: textToSend, receiverId })
      });
      const newMsg = await res.json();
      
      setMessages(prev => [...prev, newMsg]);
      updateSidebar(newMsg);

      const triggerWords = ["help", "injured", "arrived", "trapped", "critical", "blood", "fire", "smoke", "coordinates", "eta"];
      if (triggerWords.some(word => textToSend.toLowerCase().includes(word))) {
        triggerAICopilot([...messages, newMsg]);
      }
    } catch (err) {
      toast.error("Transmission failed");
    }
  };

  const triggerAICopilot = async (currentMessages) => {
    try {
      const reportContext = {
        title: "Active Field Operation",
        description: "Emergency responders coordinating in real-time.",
        urgency: "High"
      };

      const res = await fetch(`${API_BASE}/api/ai/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages,
          report: reportContext
        })
      });
      const data = await res.json();

      if (data.reply) {
        const aiMsg = {
          _id: "ai-" + Date.now(),
          senderId: "AI-COMMAND",
          senderName: "AI COMMAND",
          text: data.reply,
          createdAt: new Date(),
          isAI: true
        };
        setMessages(prev => [...prev, aiMsg]);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error("AI Copilot failed", err);
    }
  };

  const getOtherMember = (chat) => {
    if (!chat || !chat.members) return { name: "System" };
    return chat.members.find(m => m._id !== (user?.id || user?._id)) || chat.members[0] || { name: "Operator" };
  };

  if (!user) return <div className="min-h-screen bg-[#0B1220]" />;

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col h-screen overflow-hidden">
      <Navbar />
      <PageWrapper className="flex-1 flex flex-col overflow-hidden pt-20 pb-4 px-4">
        <div className="flex-1 flex max-w-[1600px] w-full mx-auto bg-[#0f172a]/30 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          
          {/* ── SIDEBAR ── */}
          <div className="w-full md:w-[350px] lg:w-[450px] flex flex-col border-r border-white/10 bg-[#0B1220]/40">
            <div className="p-6 border-b border-white/10 bg-[#0f172a]/50 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">Sec-Coms</h2>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Satellite Link: Active
                </p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-10 space-y-4">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-dashed border-white/10">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No Secure Channels Open</p>
                </div>
              ) : (
                conversations.map(c => {
                  const other = getOtherMember(c);
                  const isSelected = selectedChat?._id === c._id;
                  const isMission = c.members?.length > 2;
                  
                  return (
                    <div 
                      key={c._id}
                      onClick={() => setSelectedChat(c)}
                      className={`group p-5 border-b border-white/5 cursor-pointer transition-all flex items-center gap-4 relative ${isSelected ? "bg-indigo-600/10" : "hover:bg-white/5"}`}
                    >
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]" />}
                      
                      <div className="relative">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center text-white font-black text-xl shadow-lg ${isMission ? "from-red-600/40 to-orange-600/40 border-red-500/30" : "from-indigo-600/30 to-purple-600/30 border-white/10"}`}>
                          {isMission ? "🚨" : (other.name?.charAt(0) || "U")}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0B1220]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-bold text-sm truncate ${isSelected ? "text-white" : "text-gray-300"}`}>
                            {isMission ? `MISSION: ${c.lastMessage?.includes("🚨") ? c.lastMessage.split(":")[1]?.trim() : "Emergency Group"}` : other.name}
                          </span>
                          <span className="text-[9px] text-gray-500 font-black uppercase whitespace-nowrap ml-2">
                            {c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 truncate font-medium flex items-center gap-1.5">
                          {c.lastMessage || "Establish secure link..."}
                        </div>
                        {isMission && (
                          <div className="mt-1.5 flex gap-1">
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Active Mission</span>
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">{c.members.length} Responders</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── CHAT WINDOW ── */}
          <div className="flex-1 flex flex-col bg-[#0B1220]/60 relative overflow-hidden">
            {selectedChat ? (
              <>
                <div className="px-8 py-5 border-b border-white/10 bg-[#0f172a]/60 flex items-center justify-between backdrop-blur-2xl z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xl shadow-inner">
                      {getOtherMember(selectedChat).name?.charAt(0) || "M"}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                        {getOtherMember(selectedChat).name}
                        {selectedChat.members?.length > 2 && <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">MISSION GROUP</span>}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80">Operational Frequency Secured</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar relative">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <h4 className="text-lg font-black text-white uppercase tracking-[0.2em] mb-2">Comm-Link Verified</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">Encrypted channel established. Maintain strict operational security.</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = m.senderId === (user.id || user._id);
                      const isCommand = m.senderId === "AI-COMMAND";
                      return (
                        <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            className={`max-w-[85%] md:max-w-[70%] shadow-2xl rounded-2xl px-6 py-4 ${
                              isCommand ? "bg-red-600/90 text-white border border-red-400/30" :
                              m.isAI ? "bg-indigo-600/20 text-indigo-100 border border-indigo-500/30" :
                              isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-[#1e293b] text-gray-200 rounded-tl-none border border-white/5"
                            }`}
                          >
                            {(m.isAI || isCommand) && (
                              <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1.5">
                                <span className="text-[9px] font-black uppercase tracking-widest">{isCommand ? "COMMANDER OVERRIDE" : "AI COPILOT"}</span>
                              </div>
                            )}
                            {!isMe && !isCommand && !m.isAI && <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{m.senderName || "Responder"}</p>}
                            <p className="text-[15px] leading-relaxed font-medium">{m.text}</p>
                            <div className="flex justify-end gap-2 mt-2 text-[8px] font-black opacity-40">
                              {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {isMe && !m.isAI && <span>{m.seen ? "✓✓" : "✓"}</span>}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="px-8 py-4 bg-[#0f172a]/60 border-t border-white/10 flex flex-wrap gap-2 z-10">
                  {[
                    { label: "📍 On Site", text: "Unit is on-site. Beginning assessment." },
                    { label: "🚑 Med Needed", text: "Requesting medical backup. Casualty detected." },
                    { label: "✅ Secured", text: "Zone secured. Situation under control." },
                    { label: "🧠 Advise Me", text: "Requesting AI tactical overview of current context." },
                  ].map(cmd => (
                    <button 
                      key={cmd.label}
                      onClick={() => cmd.label === "🧠 Advise Me" ? triggerAICopilot(messages) : setInputText(cmd.text)}
                      className="px-4 py-2 rounded-xl bg-indigo-600/5 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                    >
                      {cmd.label}
                    </button>
                  ))}
                </div>

                <div className="p-8 bg-[#0f172a]/90 backdrop-blur-2xl border-t border-white/10 flex items-center gap-5 z-10">
                  <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type secure tactical transmission..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-8 py-5 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={!inputText.trim()}
                    className="w-16 h-16 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 disabled:opacity-20 transition-all active:scale-90"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full -z-10" />
                <h3 className="text-2xl font-black text-white uppercase tracking-[0.5em] mb-4">Comm-Link Standby</h3>
                <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] max-w-[320px]">Initialize an encrypted operational frequency to begin.</p>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
