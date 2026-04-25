"use client";
import { useState, useEffect, useRef } from "react";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function ProblemCard({ problem: initialProblem }) {
  const router = useRouter();
  const [problem, setProblem] = useState(initialProblem);
  const [activeTab, setActiveTab] = useState(null); // team, chat, requests
  const [team, setTeam] = useState({ leader: null, members: [] });
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [user, setUser] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUser(JSON.parse(localStorage.getItem("seva_user") || "null"));
    }
  }, []);

  useEffect(() => {
    if (problem._id) {
      socket.emit("join_problem", problem._id);
      const handleMsg = (msg) => setMessages(prev => [...prev, msg]);
      const handleUpdate = (updated) => { if (updated._id === problem._id) setProblem(updated); };
      
      socket.on("receive_message", handleMsg);
      socket.on("problem-updated", handleUpdate);
      
      return () => {
        socket.off("receive_message", handleMsg);
        socket.off("problem-updated", handleUpdate);
      };
    }
  }, [problem._id]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadTeam = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/problems/${problem._id}/team`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      setTeam(res.data);
    } catch (err) { console.error("Team Load Error"); }
  };

  const loadChat = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/problems/${problem._id}/history`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      setMessages(res.data);
    } catch (err) { console.error("Chat Load Error"); }
  };

  const handleRequest = async (type) => { // 'assign' or 'lead'
    if (!user) return toast.error("Authentication required.");
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${problem._id}/request`, { type }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(type === 'lead' ? "Leadership request transmitted." : "Request to join sent.");
      socket.emit("ops_event", {
        type: "SYSTEM",
        payload: { message: `${user.name} requested to ${type} for: ${problem.title}` },
        time: new Date()
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Request failed.");
    }
  };

  const handleResponse = async (requestId, action) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${problem._id}/request/respond`, { requestId, action }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(action === 'accept' ? "Personnel authorized." : "Request declined.");
      loadTeam();
    } catch (err) { toast.error("Response failed."); }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_BASE}/api/problems/${problem._id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(`Mission status: ${newStatus}`);
    } catch (err) { toast.error(err.response?.data?.error || "Status update failed."); }
  };

  const handleMakeLeader = async (newLeaderId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${problem._id}/make-leader`, { newLeaderId }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Team Leader updated.");
      loadTeam();
    } catch (err) { toast.error(err.response?.data?.error || "Leadership assignment failed."); }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${problem._id}/remove-member`, { memberId }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Personnel removed from mission.");
      loadTeam();
    } catch (err) { toast.error(err.response?.data?.error || "Removal failed."); }
  };

  const handleAutoAssign = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/problems/${problem._id}/tasks/auto-assign`, {}, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(`AI Auto-Assigned ${res.data.assignments} tasks.`);
    } catch (err) { toast.error("Auto-assign failed."); }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_BASE}/api/problems/${problem._id}/tasks/${taskId}`, updates, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Task updated.");
    } catch (err) { toast.error("Failed to update task."); }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/problems/${problem._id}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Task removed.");
    } catch (err) { toast.error("Failed to delete task."); }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user) return;
    const msgData = { 
      problemId: problem._id, 
      text: chatInput, 
      senderName: user.name, 
      time: new Date() 
    };
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${problem._id}/messages`, msgData, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      socket.emit("send_message", msgData);
      setChatInput("");
    } catch (err) { toast.error("Transmission failed."); }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/problems/${problem._id}`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Mission Terminated.");
      setShowDeleteConfirm(false);
    } catch (err) { toast.error("Authorization failed."); }
  };

  const handleAIAction = async (action) => {
    if (action === 'assign') {
      try {
        const token = localStorage.getItem("token");
        await axios.post(`${API_BASE}/api/problems/${problem._id}/ai-assign`, {}, {
          headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
        });
        toast.success("Neural scan complete. Specialists notified.");
      } catch (err) { toast.error("AI Dispatcher failed."); }
    } else {
      window.location.href = `/ai-match?id=${problem._id}`;
    }
  };

  // Role Checks
  const isOwner = user && (problem.createdBy === user._id || problem.createdBy === user.id);
  const isNGO = user && (user.role === "ngo" || user.role === "admin");
  const isTactical = user && (user.role === "volunteer" || user.role === "worker" || user.role === "ngo" || user.role === "admin");
  const isTeam = user && (problem.team?.includes(user._id) || problem.team?.includes(user.id));
  const isLeader = user && (problem.leader === user._id || problem.leader === user.id || problem.leader?._id === user._id);

  const urgencyColors = {
    CRITICAL: "border-red-500/30 text-red-400 bg-red-500/5",
    HIGH: "border-orange-500/30 text-orange-400 bg-orange-500/5",
    MEDIUM: "border-yellow-500/30 text-yellow-400 bg-yellow-500/5",
    LOW: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
  };

  const statusColors = {
    OPEN: "bg-white/5 text-gray-500 border-white/10",
    "IN PROGRESS": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="bg-[#0f172a]/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-white/10 transition-all shadow-2xl">
      
      {/* ── 1. HEADER ── */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-1">
          <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight">{problem.title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest">{problem.problemId || "ID-PENDING"}</span>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">By: {problem.submittedByName || "Anonymous"}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[problem.status] || statusColors.OPEN}`}>
          {problem.status}
        </div>
      </div>

      {/* ── 2. STATS BAR ── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${urgencyColors[problem.urgency?.toUpperCase()] || urgencyColors.MEDIUM}`}>
          {problem.urgency?.toUpperCase() === 'CRITICAL' && "🚨 "} {problem.urgency}
        </span>
        <div className="flex flex-wrap gap-2">
          {(Array.isArray(problem.category) ? problem.category : [problem.category]).map((c, i) => (
            <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-gray-500 uppercase tracking-widest">{c}</span>
          ))}
        </div>
      </div>

      {/* ── 3. LOCATION & DESCRIPTION ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-sm">📍</div>
          <span className="text-[11px] font-bold text-gray-400 truncate">
            {problem.location?.address || `${problem.location?.lat?.toFixed(4)}, ${problem.location?.lng?.toFixed(4)}`}
          </span>
        </div>

        <div className="relative">
          <p className={`text-[13px] text-gray-400 leading-relaxed font-medium ${!isExpanded ? "line-clamp-2" : ""}`}>
            {problem.description}
          </p>
          {problem.description?.length > 100 && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-2">
              {isExpanded ? "[ Collapse ]" : "[ Read Full Intake ]"}
            </button>
          )}
        </div>
      </div>

      {/* ── 4. TACTICAL ACTIONS ── */}
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
           <button 
            onClick={() => router.push(`/map?lat=${problem.location?.lat}&lng=${problem.location?.lng}&focus=${problem._id}`)}
            className="py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 transition-all shadow-lg"
           >
              Locate Mission
           </button>
           {isTactical && (
             <button 
              onClick={() => handleRequest('assign')}
              className="py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
             >
                Request Entry
             </button>
           )}
           {!isTactical && (
              <button disabled className="py-4 bg-white/5 border border-white/5 text-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                View Only
              </button>
           )}
        </div>

        {isTactical && (
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'tasks', label: 'Tasks' },
              { id: 'team', label: 'Unit', onClick: loadTeam },
              { id: 'chat', label: 'Comms', onClick: loadChat },
              { id: 'requests', label: 'Intel', hide: !isNGO && !isLeader },
              { id: 'ai', label: 'AI Match' },
            ].filter(t => !t.hide).map(tab => (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(activeTab === tab.id ? null : tab.id); if(tab.onClick) tab.onClick(); }}
                className={`flex-1 min-w-[70px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeTab === tab.id ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-gray-600 border-transparent hover:text-gray-300"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. TAB CONTENT ── */}
      <AnimatePresence>
        {activeTab && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 pt-4"
          >
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">AI Task Automation</h4>
                  {(isLeader || isNGO) && (
                    <button 
                      onClick={handleAutoAssign}
                      className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <span>🤖</span> Auto-Assign
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {problem.tasks?.map(task => (
                    <div key={task._id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 group transition-all hover:bg-white/10">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h5 className="text-sm font-bold text-white">{task.title}</h5>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${urgencyColors[task.priority] || urgencyColors.MEDIUM}`}>
                              {task.priority}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                              {task.assignedName ? `Assigned: ${task.assignedName}` : 'Unassigned'}
                            </span>
                          </div>
                        </div>
                        
                        {(isLeader || isNGO || (task.assignedTo && user && task.assignedTo.toString() === user._id.toString())) && (
                          <select 
                            value={task.status}
                            onChange={(e) => handleTaskUpdate(task._id, { status: e.target.value })}
                            className="bg-black/40 border border-white/10 text-[9px] font-black uppercase text-gray-400 px-2 py-1 rounded outline-none"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        )}
                      </div>
                      
                      {(isLeader || isNGO) && (
                        <div className="flex justify-end pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleTaskDelete(task._id)}
                            className="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest"
                          >
                            Delete Task
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!problem.tasks || problem.tasks.length === 0) && (
                    <div className="text-center py-6 text-[10px] text-gray-600 font-black uppercase tracking-widest">
                      No automated tasks generated.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Personnel</h4>
                    {(isNGO || isLeader) && (
                      <select 
                        onChange={(e) => handleStatusUpdate(e.target.value)}
                        value={problem.status}
                        className="bg-black/40 border border-white/10 text-[9px] font-black uppercase text-indigo-400 px-3 py-1 rounded-lg outline-none"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                    )}
                 </div>
                 <div className="space-y-2">
                    {team.leader && (
                      <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-xs font-bold text-gray-200">{team.leader.name}</span>
                          <span className="text-[8px] font-black uppercase text-purple-400 tracking-widest">Commanding Officer</span>
                        </div>
                        
                        {isNGO && (
                          <button 
                            onClick={() => handleRemoveMember(team.leader._id)}
                            className="ml-auto px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 text-[8px] font-black uppercase tracking-widest transition-all"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                    {team.members?.filter(m => m._id !== team.leader?._id).map(m => (
                      <div key={m._id} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl flex-wrap">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-gray-300">{m.name}</span>
                        <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">{m.role}</span>
                        
                        {isNGO && (
                          <div className="ml-auto flex gap-2">
                            <button 
                              onClick={() => handleMakeLeader(m._id)}
                              className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded hover:bg-purple-500/20 text-[8px] font-black uppercase tracking-widest transition-all"
                            >
                              Make Leader
                            </button>
                            <button 
                              onClick={() => handleRemoveMember(m._id)}
                              className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 text-[8px] font-black uppercase tracking-widest transition-all"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {team.members?.length === 0 && !team.leader && <p className="text-[10px] text-gray-600 italic text-center py-4">No tactical units deployed.</p>}
                 </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="h-48 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {messages.map((m, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-baseline px-1">
                        <span className="text-[9px] font-black text-indigo-400 uppercase">{m.senderName}</span>
                        <span className="text-[7px] text-gray-600 font-bold">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 text-[12px] text-gray-300 leading-snug">
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                   <input 
                    value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Secure transmission..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all"
                   />
                   <button onClick={handleSendMessage} className="w-12 h-12 bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                   </button>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Incoming Requests</h4>
                <div className="space-y-3">
                  {problem.requests?.filter(r => r.status === "pending").map(r => (
                    <div key={r._id} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                       <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-black text-white">{r.userName}</p>
                            <p className="text-[8px] font-black uppercase text-gray-500 tracking-widest">{r.role} • {r.type}</p>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => handleResponse(r._id, 'accept')} className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 flex items-center justify-center text-xs">✓</button>
                             <button onClick={() => handleResponse(r._id, 'reject')} className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center justify-center text-xs">×</button>
                          </div>
                       </div>
                    </div>
                  ))}
                  {problem.requests?.filter(r => r.status === "pending").length === 0 && <p className="text-[10px] text-gray-600 italic text-center py-4">No pending tactical requests.</p>}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4 text-center p-4">
                <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-400">🤖</div>
                <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Neural Match Engine</h4>
                <p className="text-[10px] text-gray-500 leading-relaxed">Initialize AI scan to identify mission-critical personnel based on geolocation and tactical skill-alignment.</p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                   <button onClick={() => handleAIAction('assign')} className="py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase text-indigo-400 hover:bg-white/10">Auto-Assign</button>
                   <button onClick={() => handleAIAction('match')} className="py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-indigo-500/20 hover:bg-indigo-500">Match Page</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6. FOOTER / DELETE ── */}
      <div className="flex justify-between items-center pt-2 mt-auto">
        <div className="flex items-center gap-2">
           {problem.team?.length > 0 && (
             <div className="flex -space-x-2">
                {[...Array(Math.min(problem.team.length, 3))].map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border-2 border-[#0B1220] bg-gray-700 text-[6px] flex items-center justify-center font-bold text-white">
                    OP
                  </div>
                ))}
                {problem.team.length > 3 && <div className="w-5 h-5 rounded-full border-2 border-[#0B1220] bg-indigo-600 text-[6px] flex items-center justify-center font-bold text-white">+{problem.team.length - 3}</div>}
             </div>
           )}
           <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{problem.team?.length || 0} DEPLOYED</span>
        </div>
        
        {(isOwner || isNGO) && (
          <div className="relative">
             <button 
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="text-[9px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-widest transition-all"
             >
                [ Terminate Mission ]
             </button>
             {showDeleteConfirm && (
               <div className="absolute right-0 bottom-8 bg-[#1e293b] border border-red-500/30 p-4 rounded-2xl shadow-2xl z-10 w-48 text-center space-y-3">
                  <p className="text-[9px] font-black text-white uppercase tracking-widest">Confirm Termination?</p>
                  <div className="flex gap-2">
                     <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-1.5 rounded-lg text-[8px] font-black uppercase">Confirm</button>
                     <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-white/5 text-gray-400 py-1.5 rounded-lg text-[8px] font-black uppercase">Cancel</button>
                  </div>
               </div>
             )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
}
