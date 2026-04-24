"use client";
import { useState, useEffect } from "react";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";

export default function ProblemCard({ problem, user: propUser }) {
  const [activeTab, setActiveTab] = useState(null);
  const [team, setTeam] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [user, setUser] = useState(propUser || null);

  useEffect(() => {
    if (!user && typeof window !== "undefined") {
      const u = JSON.parse(localStorage.getItem("seva_user"));
      setUser(u);
    }
  }, [propUser]);

  // JOIN SOCKET ROOM
  useEffect(() => {
    if (problem._id) {
      socket.emit("join_problem", problem._id);

      const handleMessage = (msg) => {
        setMessages((prev) => [...prev, msg]);
      };

      socket.on("receive_message", handleMessage);

      return () => socket.off("receive_message", handleMessage);
    }
  }, [problem._id]);

  // 🔥 ASSIGN YOURSELF
  const handleAssign = async () => {
    if (!user) return toast.error("Please login to assign yourself");
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}/assign`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user._id || user.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Assigned to problem");
        loadTeam();
      } else {
        toast.error(data.error || "Assignment failed");
      }
    } catch (err) {
      toast.error("Error assigning yourself");
    }
  };

  // 🔥 LOAD TEAM
  const loadTeam = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}/team`);
      const data = await res.json();
      setTeam(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load team");
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    if (!user) return toast.error("Login to chat");
    
    socket.emit("send_message", { 
      problemId: problem._id, 
      text: chatInput,
      senderName: user.name || "User"
    });
    setChatInput("");
  };

  return (
    <div className="bg-[#0B1220] p-5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all group">
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">{problem.title}</h3>
          <p className="text-[11px] text-gray-500 uppercase font-black tracking-widest">{problem.urgency} · {problem.category}</p>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${problem.status === "Open" ? "text-emerald-400 border-emerald-400/20" : "text-yellow-400 border-yellow-400/20"} uppercase`}>
          {problem.status}
        </span>
      </div>

      <p className="text-[12px] text-gray-400 mb-5 line-clamp-2">{problem.description}</p>

      {/* 🔥 ASSIGN BUTTON */}
      <button
        onClick={handleAssign}
        className="w-full mb-4 bg-purple-600 hover:bg-purple-700 py-2.5 rounded-lg text-white text-xs font-bold transition-all shadow-lg shadow-purple-500/10"
      >
        Assign Yourself
      </button>

      {/* 🔥 ACTIONS TABS */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {[
          { id: "team", label: "Team", onClick: () => loadTeam() },
          { id: "chat", label: "Chat" },
          { id: "aiAssign", label: "AI Assign" },
          { id: "aiMatch", label: "AI Match" },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(activeTab === tab.id ? null : tab.id); if(tab.onClick) tab.onClick(); }}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${activeTab === tab.id ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-gray-500 border-transparent hover:text-gray-300"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 🔥 TABS CONTENT */}
      <div className="overflow-hidden transition-all">
        {activeTab === "team" && (
          <div className="bg-white/5 p-4 rounded-lg border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Unit Personnel</h3>
            <div className="space-y-2 mb-3">
              {team.length === 0 ? (
                <p className="text-[11px] text-gray-600 italic">No members assigned yet.</p>
              ) : team.map((m) => (
                <div key={m._id} className="flex items-center gap-2 text-[12px] text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{m.name}</span>
                  <span className="text-[9px] text-gray-600 font-bold uppercase ml-auto">{m.role}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                Leader: {problem.leader?.name || "Pending..."}
              </p>
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="bg-white/5 p-4 rounded-lg border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="h-40 overflow-y-auto space-y-3 mb-3 pr-2 custom-scrollbar">
              {messages.length === 0 ? (
                <p className="text-[11px] text-gray-600 italic text-center py-8">Start the coordination...</p>
              ) : messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-purple-400 uppercase">{m.senderName}</span>
                    <span className="text-[8px] text-gray-600">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[12px] text-gray-300 leading-tight bg-white/5 p-2 rounded-lg">{m.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type message..."
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500"
              />
              <button 
                onClick={handleSendMessage}
                className="bg-purple-600 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
              >
                SEND
              </button>
            </div>
          </div>
        )}

        {activeTab === "aiAssign" && (
          <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-[11px] text-gray-400 mb-3">AI will analyze nearby responders and auto-assign the best 3-member unit.</p>
            <button
              onClick={async () => {
                const token = localStorage.getItem("token");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}/ai-assign`, { 
                  method: "POST",
                  headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();
                if (Array.isArray(data)) {
                  toast.success(`AI assigned ${data.length} members`);
                  loadTeam();
                } else {
                  toast.error("AI Assign failed");
                }
              }}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/10 py-2 rounded-lg text-[10px] font-black text-white uppercase tracking-widest transition-all"
            >
              Execute AI Protocol
            </button>
          </div>
        )}

        {activeTab === "aiMatch" && (
          <div className="bg-white/5 p-4 rounded-lg border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 text-center">Top Candidates</p>
            <button
              onClick={async () => {
                const token = localStorage.getItem("token");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}/ai-match`, {
                  headers: { "Authorization": `Bearer ${token}` }
                });
                const data = await res.json();
                toast.success("Matching profiles synchronized");
                setActiveTab(null); // Close or show results
                window.location.href = `/ai-match?id=${problem._id}`;
              }}
              className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 py-2 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest transition-all"
            >
              Analyze Best Matches
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
