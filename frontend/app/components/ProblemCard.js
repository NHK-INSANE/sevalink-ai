"use client";
import { useState, useEffect } from "react";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ProblemCard({ problem: initialProblem, user: propUser }) {
  const router = useRouter();
  const [problem, setProblem] = useState(initialProblem);
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

  // Real-time updates for THIS problem
  useEffect(() => {
    if (problem._id) {
      socket.emit("join_problem", problem._id);

      const handleMsg = (msg) => setMessages((prev) => [...prev, msg]);
      const handleUpdate = (updated) => {
        if (updated._id === problem._id) setProblem(updated);
      };

      socket.on("receive_message", handleMsg);
      socket.on("problem-updated", handleUpdate);

      return () => {
        socket.off("receive_message", handleMsg);
        socket.off("problem-updated", handleUpdate);
      };
    }
  }, [problem._id]);

  const loadTeam = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}/team`);
      const data = await res.json();
      setTeam(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load team");
    }
  };

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch (err) {
      console.error("Failed to load history");
    }
  };

  const handleAssign = async () => {
    if (!user) return toast.error("Please login to assign yourself");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId: user._id || user.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Successfully assigned yourself to this mission");
        loadTeam();
      } else toast.error(data.error || "Assignment failed");
    } catch (err) { toast.error("Connection error"); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else toast.success(`Status updated to ${newStatus}`);
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Report deleted successfully");
        window.location.reload();
      } else {
        const d = await res.json();
        toast.error(d.message || "Delete failed");
      }
    } catch (err) { toast.error("Connection error"); }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user) return;
    const msgData = { problemId: problem._id, text: chatInput, senderName: user.name || "User", time: new Date() };
    
    // Save to DB
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/problems/${problem._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(msgData)
      });
    } catch (err) {}

    // Emit socket
    socket.emit("send_message", msgData);
    setChatInput("");
  };

  const [isExpanded, setIsExpanded] = useState(false);

  const isLeader = problem.leader?._id === user?._id || problem.leader === user?._id;
  const isOwner = problem.createdBy === user?._id || (user?.id && problem.createdBy === user.id);

  const categories = Array.isArray(problem.category) ? problem.category : [problem.category || "General"];

  const urgencyColors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  const statusColors = {
    open: "bg-white/5 text-gray-400 border-white/10",
    "in progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="bg-[#0B1220] p-6 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all shadow-xl flex flex-col gap-5 relative">
      
      {/* ── HEADER ── */}
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {(problem.displayId || problem.problemId) && (
              <span className="text-[10px] text-indigo-400 font-mono border border-indigo-400/20 px-2 py-0.5 rounded bg-indigo-400/5 uppercase tracking-widest">
                {problem.displayId || problem.problemId}
              </span>
            )}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {categories.map((cat, idx) => (
                <span key={idx} className="text-[9px] text-purple-400 font-bold uppercase tracking-widest whitespace-nowrap bg-purple-400/5 px-2 py-0.5 rounded border border-purple-400/10">
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight leading-snug">{problem.title}</h3>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${urgencyColors[problem.urgency?.toLowerCase()] || urgencyColors.medium}`}>
              {problem.urgency}
            </span>
            {problem.location?.address && (
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium italic">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="line-clamp-1 max-w-[150px]">{problem.location.address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[problem.status?.toLowerCase()] || statusColors.open}`}>
            {problem.status}
          </div>
          {problem.score > 0 && (
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-black text-purple-400 tracking-tighter">{problem.score}%</div>
              <div className="text-[7px] text-gray-600 font-bold uppercase tracking-widest leading-none">AI Score</div>
            </div>
          )}
          {isOwner && (
            <button onClick={handleDelete} className="text-[8px] font-black uppercase text-red-500/60 hover:text-red-500 tracking-[0.2em] transition-colors">
              [ Delete Report ]
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <p className={`text-[13px] text-gray-400 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
          {problem.description}
        </p>
        {problem.description?.length > 100 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-black text-purple-500 uppercase tracking-widest mt-1 hover:text-purple-400 transition-colors"
          >
            {isExpanded ? 'Show Less' : 'Read Full Report'}
          </button>
        )}
      </div>

      {/* ── 🔥 PRIMARY ASSIGN BUTTON ── */}
      <button
        onClick={handleAssign}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]"
      >
        Assign Yourself
      </button>

      {/* ── TABS SELECTOR ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { id: "team", label: "Team", onClick: loadTeam },
          { id: "chat", label: "Chat", onClick: loadHistory },
          { id: "aiAssign", label: "AI Assign" },
          { id: "aiMatch", label: "AI Match" },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(activeTab === tab.id ? null : tab.id); if(tab.onClick) tab.onClick(); }}
            className={`py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
              activeTab === tab.id ? "bg-white/10 text-white border-white/20 shadow-inner" : "bg-white/5 text-gray-500 border-transparent hover:bg-white/10 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="min-h-0">
        {activeTab === "team" && (
          <div className="bg-black/30 p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Unit Personnel</h3>
               {isLeader && (
                 <select 
                   value={problem.status}
                   onChange={(e) => handleStatusChange(e.target.value)}
                   className="bg-[#0B1220] border border-white/10 text-[9px] font-bold uppercase text-purple-400 px-2 py-1 rounded outline-none"
                 >
                   <option value="Open" className="bg-[#0B1220]">Open</option>
                   <option value="In Progress" className="bg-[#0B1220]">In Progress</option>
                   <option value="Resolved" className="bg-[#0B1220]">Resolved</option>
                 </select>
               )}
            </div>

            <div className="space-y-2 mb-4 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
              {(team || []).length === 0 ? (
                <p className="text-[11px] text-gray-600 italic py-4 text-center">No unit members declared yet.</p>
              ) : team.map((m) => (
                <div key={m._id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${problem.leader?._id === m._id || problem.leader === m._id ? "bg-purple-500" : "bg-emerald-500"}`} />
                  <span className="text-[12px] text-gray-300 font-medium">{m.name}</span>
                  { (problem.leader?._id === m._id || problem.leader === m._id) && (
                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest ml-auto border border-purple-500/30 px-1.5 py-0.5 rounded">Leader</span>
                  )}
                </div>
              ))}
            </div>

            {isLeader && (
              <div className="pt-3 border-t border-white/5">
                <button 
                  onClick={() => router.push(`/volunteers?addMemberTo=${problem._id}`)}
                  className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  + Recruit Unit Member
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="bg-black/30 p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="h-44 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                   <div className="w-8 h-8 rounded-full border border-dashed border-white/20" />
                   <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Transmission</p>
                </div>
              ) : messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-tight">{m.senderName}</span>
                    <span className="text-[8px] text-gray-600 font-medium">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-[12px] text-gray-300 leading-snug bg-white/5 p-2.5 rounded-xl rounded-tl-none border border-white/5 shadow-sm">
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Secure channel message..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-purple-500 transition-all shadow-inner"
              />
              <button 
                onClick={handleSendMessage}
                className="bg-purple-600 hover:bg-purple-500 p-2.5 rounded-xl transition-colors shadow-lg shadow-purple-500/10"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </div>
          </div>
        )}

        {activeTab === "aiAssign" && (
          <div className="bg-black/30 p-5 rounded-xl border border-white/10 text-center animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10">
               <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            </div>
            <p className="text-[11px] text-gray-400 mb-4 font-medium leading-relaxed">Neural analysis identifies top-tier responders and initiates auto-assignment protocols for a optimized 3-member unit.</p>
            <button
              onClick={async () => {
                const token = localStorage.getItem("token");
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com"}/api/ai/auto-assign/${problem._id}`, { 
                  method: "POST",
                  headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                  }
                });
                const data = await res.json();
                if (data.success && Array.isArray(data.team)) {
                  toast.success(`AI assigned ${data.team.length} mission specialists`);
                  loadTeam();
                } else toast.error("Neural assignment failed");
              }}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/10 py-2.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
            >
              Initialize Auto-Assign
            </button>
          </div>
        )}

        {activeTab === "aiMatch" && (
          <div className="bg-black/30 p-5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="text-center space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest">
                Optimization Engine
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Evaluate cross-network profiles for skill-alignment and tactical compatibility.</p>
              <button
                onClick={async () => {
                  toast.success("Synchronizing profile analytics...");
                  window.location.href = `/ai-match?id=${problem._id}`;
                }}
                className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 py-2.5 rounded-xl text-[10px] font-black text-indigo-400 uppercase tracking-widest transition-all"
              >
                Perform AI Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
