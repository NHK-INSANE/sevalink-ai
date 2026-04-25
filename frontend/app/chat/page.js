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
      } else if (convs.length > 0 && !selectedChat) {
        // Optionally select first one
        // setSelectedChat(convs[0]);
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
        setMessages(prev => [...prev, msg]);
      } else {
        toast.success("New message in another channel");
      }
      // Update sidebar
      updateSidebar(msg);
    };

    socket.on("chat_message", handleMessage);
    return () => socket.off("chat_message", handleMessage);
  }, [user, selectedChat]);

  const updateSidebar = (msg) => {
    setConversations(prev => {
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
      
      // Update local state
      setMessages(prev => [...prev, newMsg]);
      updateSidebar(newMsg);

      // 🔥 Smart Trigger for AI Copilot
      const triggerWords = ["help", "injured", "arrived", "trapped", "critical", "blood", "fire", "smoke"];
      if (triggerWords.some(word => textToSend.toLowerCase().includes(word))) {
        triggerAICopilot([...messages, newMsg]);
      }
    } catch (err) {
      toast.error("Transmission failed");
    }
  };

  const triggerAICopilot = async (currentMessages) => {
    try {
      // For demo, we use a generic crisis report context if none is found
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
          senderId: "AI-COPILOT",
          senderName: "AI COMMAND",
          text: data.reply,
          createdAt: new Date(),
          isAI: true
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error("AI Copilot failed", err);
    }
  };

  const sendQuickNote = (text) => {
    setInputText(text);
    // Auto-send or just fill? Let's fill and user can hit enter or click send.
    // Actually, sending directly is more "tactical".
    // But for safety, let's just set the text so they can review.
  };

  const getOtherMember = (chat) => {
    return chat.members.find(m => m._id !== (user?.id || user?._id)) || chat.members[0];
  };

  if (!user) return <div className="min-h-screen bg-[#0B1220]" />;

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col h-screen overflow-hidden">
      <Navbar />
      <PageWrapper className="flex-1 flex flex-col overflow-hidden pt-20">
        <div className="flex-1 flex max-w-[1400px] w-full mx-auto bg-[#0f172a]/30 border border-white/10 rounded-t-2xl overflow-hidden mt-4">
          
          {/* ── LEFT SIDEBAR (CONVERSATIONS) ── */}
          <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col border-r border-white/10 bg-[#0B1220]/50 backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 bg-[#0f172a]/30 flex items-center justify-between">
              <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">Sec-Coms</h2>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Secure Link Active" />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-10 space-y-4">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-10 text-center text-gray-600">
                  <p className="text-xs font-black uppercase tracking-widest">No active channels</p>
                </div>
              ) : (
                conversations.map(c => {
                  const other = getOtherMember(c);
                  const isSelected = selectedChat?._id === c._id;
                  return (
                    <div 
                      key={c._id}
                      onClick={() => setSelectedChat(c)}
                      className={`group p-4 border-b border-white/5 cursor-pointer transition-all flex items-center gap-4 ${isSelected ? "bg-indigo-600/10 border-l-4 border-l-indigo-500" : "hover:bg-white/5"}`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-white font-black text-lg">
                        {other.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-gray-200 text-sm truncate">{other.name}</span>
                          <span className="text-[9px] text-gray-500 font-medium">
                            {c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 truncate mt-0.5 group-hover:text-gray-400 transition-colors">
                          {c.lastMessage || "Establish connection..."}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT WINDOW (CHAT) ── */}
          <div className="flex-1 flex flex-col bg-[#0B1220]/80 relative overflow-hidden">
            {selectedChat ? (
              <>
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 bg-[#0f172a]/50 flex items-center justify-between backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
                      {getOtherMember(selectedChat).name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-md font-black text-white tracking-tight">{getOtherMember(selectedChat).name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80">Secure End-to-End Link</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button className="text-gray-500 hover:text-white transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.28-2.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>
                  </div>
                </div>
                
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-fixed">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                      <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-gray-600 flex items-center justify-center mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.3em]">Channel Established</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = m.senderId === (user.id || user._id);
                      return (
                        <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: idx === messages.length - 1 ? 0 : 0 }}
                            className={`relative group max-w-[80%] md:max-w-[65%] px-5 py-3 rounded-2xl shadow-xl transition-all ${
                              m.isAI
                                ? "bg-sky-500 text-white rounded-tl-none border-2 border-sky-400/50"
                                : isMe 
                                  ? "bg-indigo-600 text-white rounded-tr-none hover:bg-indigo-500" 
                                  : "bg-[#1e293b] text-gray-200 rounded-tl-none border border-white/5 hover:border-white/10"
                            }`}
                          >
                            {m.isAI && (
                              <div className="flex items-center gap-1.5 mb-1.5 border-b border-white/10 pb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-sky-200">AI CO-PILOT</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              </div>
                            )}
                            <p className="text-[14px] leading-relaxed font-medium">{m.text}</p>
                            <div className={`flex items-center justify-end gap-1.5 mt-1.5 text-[9px] font-black uppercase tracking-widest ${isMe ? "text-indigo-200/60" : "text-gray-500"}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {isMe && !m.isAI && (
                                <span className={m.seen ? "text-emerald-400" : "text-indigo-300/40"}>
                                  {m.seen ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* AI Quick Commands */}
                <div className="px-6 py-3 bg-[#0f172a]/40 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
                  {[
                    { label: "📍 Arrived", text: "I have arrived at the designated coordinates." },
                    { label: "🚑 Need Medic", text: "Situation assessment requires immediate medical assistance." },
                    { label: "⚠️ Critical", text: "Situation has escalated to CRITICAL. Requesting backup." },
                    { label: "✅ Resolved", text: "Incident resolved. Standing down." },
                    { label: "🤖 Ask AI", text: "AI Copilot, analyze current situation and advise." }
                  ].map(cmd => (
                    <button 
                      key={cmd.label}
                      onClick={() => {
                        if (cmd.label === "🤖 Ask AI") triggerAICopilot(messages);
                        else setInputText(cmd.text);
                      }}
                      className="whitespace-nowrap px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-indigo-600/20 hover:text-indigo-400 hover:border-indigo-500/30 transition-all active:scale-95"
                    >
                      {cmd.label}
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-[#0f172a]/80 backdrop-blur-lg border-t border-white/10 flex items-center gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type secure transmission..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>
                  <button 
                    onClick={sendMessage}
                    disabled={!inputText.trim()}
                    className="p-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-20 disabled:grayscale transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#0B1220] p-10 text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full" />
                  <div className="w-24 h-24 rounded-[2.5rem] bg-[#0f172a] border border-white/5 flex items-center justify-center relative z-10 shadow-2xl">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-[0.4em] mb-3">Comm-Link Idle</h3>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest max-w-[280px] leading-relaxed">Select a secure operational channel to begin encrypted coordination.</p>
              </div>
            )}
          </div>

        </div>
      </PageWrapper>
    </div>
  );
}
