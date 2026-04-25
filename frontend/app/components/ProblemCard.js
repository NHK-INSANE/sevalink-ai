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
  const [activeTab, setActiveTab] = useState(null); 
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
      const res = await axios.get(`${API_BASE}/api/problems/${problem._id}`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      setProblem(res.data);
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

  const handleRequest = async (type) => {
    if (!user) return toast.error("Authentication required.");
    try {
      const token = localStorage.getItem("token");
      const url = type === 'lead' ? `${API_BASE}/api/problems/${problem._id}/lead` : `${API_BASE}/api/problems/${problem._id}/assign`;
      await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(type === 'lead' ? "Leadership request transmitted." : "Assignment request transmitted.");
    } catch (err) { toast.error(err.response?.data?.error || "Request failed."); }
  };

  const handleResponse = async (requestId, action) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${problem._id}/team/respond`, { requestId, action }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(action === 'accept' ? "Personnel authorized." : "Request declined.");
      loadTeam();
    } catch (err) { toast.error("Response failed."); }
  };

  const handleRemove = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${problem._id}/team/remove`, { userId }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Member removed.");
      loadTeam();
    } catch (err) { toast.error("Removal failed."); }
  };

  const handleMakeLeader = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/api/problems/${problem._id}/team/leader`, { userId }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Leader assigned.");
      loadTeam();
    } catch (err) { toast.error("Leadership update failed."); }
  };

  const handleLocate = () => { router.push(`/map?problemId=${problem._id || problem.id}`); };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_BASE}/api/problems/${problem._id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success(`Mission status: ${newStatus}`);
    } catch (err) { toast.error(err.response?.data?.error || "Status update failed."); }
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
    const msgData = { problemId: problem._id, text: chatInput, senderName: user.name, time: new Date() };
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
      router.push(`/ai-match?id=${problem._id}`);
    }
  };

  const isNGO = user?.role === "ngo" || user?.role === "admin";
  const isTeamMember = problem.team?.some(m => m.userId === user?._id || m.userId === user?.id);
  const isLeader = problem.team?.some(m => (m.userId === user?._id || m.userId === user?.id) && m.isLeader);

  const urgencyColors = {
    CRITICAL: "border-red-500/30 text-red-400 bg-red-500/5",
    HIGH: "border-orange-500/30 text-orange-400 bg-orange-500/5",
    MEDIUM: "border-yellow-500/30 text-yellow-400 bg-yellow-500/5",
    LOW: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
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
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reported by {problem.submittedByName}</span>
          </div>
        </div>
        <button onClick={handleLocate} className="px-4 py-2 flex items-center gap-2 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all whitespace-nowrap">
          📍 View Location
        </button>
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

      {/* ── 3. DESCRIPTION ── */}
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

      {/* ── 4. TACTICAL ACTIONS ── */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap gap-2">
          {user?.role !== "user" && (
            <button onClick={handleLocate} className="flex-1 min-w-[100px] py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-lg">
               📍 Locate
            </button>
          )}

          {["volunteer", "worker", "ngo"].includes(user?.role) && (
            <>
              <button onClick={() => handleRequest('assign')} className="flex-1 min-w-[100px] py-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600/30 transition-all">
                 Assign
              </button>
              <button onClick={() => handleRequest('lead')} className="flex-1 min-w-[100px] py-3 bg-purple-600/20 text-purple-400 border border-purple-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600/30 transition-all">
                 Lead
              </button>
            </>
          )}

          <button onClick={() => handleAIAction('assign')} className="flex-1 min-w-[100px] py-3 bg-white/5 border border-white/5 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">
             AI Assign
          </button>
          <button onClick={() => handleAIAction('match')} className="flex-1 min-w-[100px] py-3 bg-white/5 border border-white/5 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">
             AI Match
          </button>
        </div>

        {["volunteer", "worker", "ngo"].includes(user?.role) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            <button onClick={() => { setActiveTab(activeTab === 'team' ? null : 'team'); if(activeTab !== 'team') loadTeam(); }} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'team' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>Team</button>
            <button onClick={() => { setActiveTab(activeTab === 'chat' ? null : 'chat'); if(activeTab !== 'chat') loadChat(); }} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>Chat</button>
            {isNGO && (
              <button onClick={() => { setActiveTab(activeTab === 'requests' ? null : 'requests'); }} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
                Requests ({problem.requests?.filter(r => r.status === 'pending').length || 0})
              </button>
            )}
            {(isNGO || isLeader) && (
              <button onClick={() => setActiveTab(activeTab === 'tasks' ? null : 'tasks')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'tasks' ? 'bg-orange-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>Tasks</button>
            )}
          </div>
        )}
      </div>

      {/* ── 5. TAB CONTENT ── */}
      <AnimatePresence>
        {activeTab && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5 pt-4">
            {activeTab === 'team' && (
              <div className="space-y-4">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tactical Unit</h4>
                    {isNGO && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">NGO Mode</span>}
                 </div>
                 <div className="space-y-3">
                    {problem.team?.map(member => (
                      <div key={member.userId} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white ${member.isLeader ? 'bg-purple-600 shadow-lg shadow-purple-500/20' : 'bg-white/10'}`}>{member.role?.[0]?.toUpperCase() || 'M'}</div>
                          <div>
                            <p className="text-[11px] font-bold text-white uppercase tracking-tight">{member.userId === user?._id || member.userId === user?.id ? "You" : `ID: ${member.userId?.toString().slice(-4).toUpperCase()}`}</p>
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{member.role} {member.isLeader && "• Mission Leader"}</p>
                          </div>
                        </div>
                        {isNGO && (
                          <div className="flex items-center gap-2">
                            {!member.isLeader && <button onClick={() => handleMakeLeader(member.userId)} className="p-2 bg-purple-600/10 text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg transition-all text-[9px] font-bold uppercase">Leader</button>}
                            <button onClick={() => handleRemove(member.userId)} className="p-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all text-[9px] font-bold uppercase">Remove</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {(!problem.team || problem.team.length === 0) && <div className="text-center py-6 text-[10px] text-gray-600 font-black uppercase tracking-widest">No personnel assigned.</div>}
                 </div>
              </div>
            )}

            {activeTab === 'requests' && isNGO && (
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Pending Authorization</h4>
                 <div className="space-y-3">
                   {problem.requests?.filter(r => r.status === 'pending').map(req => (
                     <div key={req._id} className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-xl">
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-white uppercase tracking-tight">Role: {req.role}</p>
                          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">User ID: {req.userId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => handleResponse(req._id, 'accept')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">Accept</button>
                           <button onClick={() => handleResponse(req._id, 'reject')} className="px-3 py-1.5 bg-red-600/20 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Reject</button>
                        </div>
                     </div>
                   ))}
                   {problem.requests?.filter(r => r.status === 'pending').length === 0 && <div className="text-center py-6 text-[10px] text-gray-600 font-black uppercase tracking-widest">No pending requests.</div>}
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
                      <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5 text-[12px] text-gray-300 leading-snug">{m.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                   <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Secure transmission..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all" />
                   <button onClick={handleSendMessage} className="w-12 h-12 bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center rounded-xl transition-all shadow-lg shadow-indigo-500/20"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mission Tasks</h4>
                  {(isLeader || isNGO) && <button onClick={handleAutoAssign} className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2">🤖 Auto-Assign</button>}
                </div>
                <div className="space-y-3">
                  {problem.tasks?.map(task => (
                    <div key={task._id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 group transition-all hover:bg-white/10">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h5 className="text-sm font-bold text-white">{task.title}</h5>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${urgencyColors[task.priority] || urgencyColors.MEDIUM}`}>{task.priority}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{task.assignedName ? `Assigned: ${task.assignedName}` : 'Unassigned'}</span>
                          </div>
                        </div>
                        {(isLeader || isNGO || (task.assignedTo && user && task.assignedTo === (user._id || user.id))) && (
                          <select value={task.status} onChange={(e) => handleTaskUpdate(task._id, { status: e.target.value })} className="bg-black/40 border border-white/10 text-[9px] font-black uppercase text-gray-400 px-2 py-1 rounded outline-none">
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        )}
                      </div>
                      {(isLeader || isNGO) && (
                        <div className="flex justify-end pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleTaskDelete(task._id)} className="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest">Delete Task</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6. NGO STATUS CONTROL ── */}
      {isNGO && (
        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
          <select onChange={(e) => handleStatusUpdate(e.target.value)} value={problem.status} className="bg-white/5 border border-white/5 text-[9px] font-black uppercase text-indigo-400 px-4 py-2 rounded-xl outline-none">
            <option value="OPEN">Open Mission</option>
            <option value="IN PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-widest">Terminate</button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-[#0B1220]/95 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-center">
          <div className="space-y-4">
            <h4 className="text-lg font-black text-white uppercase">Mission Termination?</h4>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">This will archive all tactical data.</p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={handleDelete} className="px-6 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase">Confirm</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-2 bg-white/10 text-white rounded-xl text-[9px] font-black uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
