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
  const initialChatId = searchParams.get("id");
  
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    fetchConversations(u);
  }, []);

  const fetchConversations = async (currentUser) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setConversations(data);
      
      // Auto-select if ID in URL
      if (initialChatId && !selectedChat) {
        const target = data.find(c => c._id === initialChatId);
        if (target) setSelectedChat(target);
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
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
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data);
      scrollToBottom();
      
      // Mark as seen
      fetch(`${API_BASE}/api/chat/${chatId}/seen`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to fetch messages", err);
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
      // If message is for the currently open chat, append it
      if (selectedChat && msg.conversationId === selectedChat._id) {
        setMessages((prev) => [...prev, msg]);
      } else {
        // Otherwise, show a toast and refresh conversations list
        toast.success("New message received!");
        fetchConversations(user);
      }
    };

    socket.on("chat_message", handleMessage);
    return () => socket.off("chat_message", handleMessage);
  }, [user, selectedChat]);

  const sendMessage = async (e) => {
    if (e.key === "Enter" || e.type === "click") {
      if (!inputText.trim() || !selectedChat) return;

      const receiverId = selectedChat.members.find(m => m._id !== user.id)?._id;
      if (!receiverId) return;

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/chat/${selectedChat._id}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ text: inputText, receiverId })
        });
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        setInputText("");
        fetchConversations(user); // to update lastMessage
      } catch (err) {
        toast.error("Failed to send message");
      }
    }
  };

  const getOtherMember = (chat) => {
    return chat.members.find(m => m._id !== user?.id) || chat.members[0];
  };

  if (!user) return <div className="min-h-screen bg-[#0B1220]" />;

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col h-screen overflow-hidden">
      <Navbar />
      <PageWrapper className="flex-1 flex overflow-hidden pt-20">
        <div className="flex w-full max-w-6xl mx-auto bg-black/40 border border-white/10 rounded-2xl overflow-hidden my-4">
          
          {/* Sidebar */}
          <div className="w-1/3 border-r border-white/10 flex flex-col bg-[#0f172a]/50">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Communications</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No active secure channels</div>
              ) : (
                conversations.map(c => {
                  const other = getOtherMember(c);
                  const isSelected = selectedChat?._id === c._id;
                  return (
                    <div 
                      key={c._id}
                      onClick={() => setSelectedChat(c)}
                      className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${isSelected ? "bg-indigo-600/20 border-l-4 border-l-indigo-500" : "hover:bg-white/5"}`}
                    >
                      <div className="font-bold text-gray-200 text-sm">{other.name || "Unknown"} <span className="text-[10px] text-indigo-400 font-mono ml-2">{other.displayId || other.customId}</span></div>
                      <div className="text-xs text-gray-500 truncate mt-1">{c.lastMessage || "No messages yet"}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="w-2/3 flex flex-col bg-[#0B1220]/80 relative">
            {selectedChat ? (
              <>
                <div className="p-4 border-b border-white/10 bg-[#0f172a] flex items-center justify-between">
                  <div>
                    <h3 className="text-md font-bold text-white">{getOtherMember(selectedChat).name}</h3>
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400">Secure Channel Active</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-600 text-xs py-10 uppercase tracking-widest">Beginning of encrypted history</div>
                  ) : (
                    messages.map(m => {
                      const isMe = m.senderId === user.id;
                      return (
                        <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-indigo-600 text-white rounded-br-sm" : "bg-gray-800 text-gray-200 rounded-bl-sm"}`}
                          >
                            {m.text}
                            <div className={`text-[9px] mt-1 text-right ${isMe ? "text-indigo-200" : "text-gray-500"}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {isMe && m.seen && <span className="ml-1 text-emerald-300">✓✓</span>}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-[#0f172a] border-t border-white/10 flex items-center gap-3">
                  <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={sendMessage}
                    placeholder="Type encrypted message..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button 
                    onClick={sendMessage}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p className="text-sm uppercase tracking-widest font-bold">Select a channel to transmit</p>
              </div>
            )}
          </div>

        </div>
      </PageWrapper>
    </div>
  );
}
