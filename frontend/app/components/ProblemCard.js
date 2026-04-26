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
      await axios.patch(`${API_BASE}/api/problems/${problem._id}/status`, { status: newStatus.toLowerCase() }, {
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
    critical: "border-red-500/30 text-red-400 bg-red-500/5",
    high: "border-orange-500/30 text-orange-400 bg-orange-500/5",
    medium: "border-yellow-500/30 text-yellow-400 bg-yellow-500/5",
    low: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
  };

  return (
    <div className="card">
      {/* HEADER: Title & Status */}
      <div className="flex justify-between items-start gap-4">
        <h3 className="text-lg font-bold text-white leading-tight">{problem.title}</h3>
        <span className={`badge ${
          problem.status?.toLowerCase() === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
          problem.status?.toLowerCase() === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
          'bg-purple-500/10 text-purple-500 border-purple-500/20'
        }`}>
          {problem.status || "Open"}
        </span>
      </div>

      {/* DESCRIPTION: 2 Lines Max */}
      <p className={`text-sm text-gray-400 line-clamp-2`}>
        {problem.description}
      </p>

      {/* META: Category & Severity */}
      <div className="flex flex-wrap gap-2 mt-1">
        {(Array.isArray(problem.category) ? problem.category : [problem.category]).map((cat, i) => (
          <span key={i} className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/5 px-2 py-1 rounded-md">
            {cat}
          </span>
        ))}
        <span className={`badge ${urgencyColors[(problem.severity || problem.urgency || "medium").toLowerCase()] || urgencyColors.medium}`}>
          {problem.severity || problem.urgency || "Medium"}
        </span>
      </div>

      {/* LOCATION */}
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <span>📍</span>
        <span className="truncate">
          {problem.location?.lat.toFixed(4)}, {problem.location?.lng.toFixed(4)}
        </span>
      </div>

      {/* PRIMARY ACTIONS */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <button 
          onClick={handleLocate}
          className="btn-primary !text-xs !py-2.5"
        >
          Locate
        </button>
        
        {["volunteer", "worker", "ngo"].includes(user?.role) ? (
          <button 
            onClick={() => handleRequest(isTeamMember ? 'lead' : 'assign')}
            className="btn-secondary !text-xs !py-2.5"
          >
            {isTeamMember ? 'Request Lead' : 'Join Mission'}
          </button>
        ) : (
          <button 
            onClick={() => handleAIAction('match')}
            className="btn-secondary !text-xs !py-2.5"
          >
            AI Match
          </button>
        )}
      </div>

      {/* SUPPORT ACTIONS (Team, Chat, AI) */}
      <div className="flex items-center gap-4 mt-2 pt-3 border-t border-white/5">
        <button 
          onClick={() => { setActiveTab(activeTab === 'team' ? null : 'team'); if(activeTab !== 'team') loadTeam(); }}
          className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'team' ? 'text-purple-400' : 'text-gray-500 hover:text-white'}`}
        >
          Team
        </button>
        <button 
          onClick={() => { setActiveTab(activeTab === 'chat' ? null : 'chat'); if(activeTab !== 'chat') loadChat(); }}
          className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'chat' ? 'text-purple-400' : 'text-gray-500 hover:text-white'}`}
        >
          Chat
        </button>
        {isNGO && (
          <button 
            onClick={() => setActiveTab(activeTab === 'requests' ? null : 'requests')}
            className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'requests' ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`}
          >
            Requests
          </button>
        )}
        <button 
          onClick={() => handleAIAction('assign')}
          className="text-[10px] font-bold text-gray-600 hover:text-purple-400 uppercase tracking-widest transition-colors ml-auto"
        >
          AI Dispatch
        </button>
      </div>

      {/* EXPANDABLE TAB CONTENT */}
      <AnimatePresence>
        {activeTab && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 mt-3 pt-4"
          >
            {activeTab === 'team' && (
              <div className="space-y-3">
                {problem.team?.map(member => (
                  <div key={member.userId} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${member.isLeader ? 'bg-purple-600' : 'bg-white/10'}`}>
                        {member.role?.[0]?.toUpperCase() || 'M'}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white">
                          {member.userId === (user?._id || user?.id) ? "You" : `ID: ${member.userId?.toString().slice(-4).toUpperCase()}`}
                        </p>
                        <p className="text-[9px] font-medium text-gray-500 uppercase tracking-widest">{member.role} {member.isLeader && "• Leader"}</p>
                      </div>
                    </div>
                    {isNGO && !member.isLeader && (
                      <button onClick={() => handleMakeLeader(member.userId)} className="text-[9px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-widest">Promote</button>
                    )}
                  </div>
                ))}
                {(!problem.team || problem.team.length === 0) && <p className="text-[10px] text-gray-600 text-center py-4 uppercase font-bold tracking-widest">No personnel assigned.</p>}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="space-y-4">
                <div className="h-40 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col gap-1 ${m.senderName === user?.name ? 'items-end' : 'items-start'}`}>
                      <div className="bg-white/5 p-3 rounded-2xl text-xs text-gray-300 max-w-[85%]">
                        {m.text}
                      </div>
                      <span className="text-[8px] font-bold text-gray-600 uppercase px-1">{m.senderName} • {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type message..."
                    className="flex-1 !py-2 !text-xs"
                  />
                  <button onClick={handleSendMessage} className="w-10 h-10 bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center justify-center text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'requests' && isNGO && (
              <div className="space-y-3">
                {problem.requests?.filter(r => r.status === 'pending').map(req => (
                  <div key={req._id} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <div>
                      <p className="text-[11px] font-bold text-white uppercase tracking-tight">{req.role}</p>
                      <p className="text-[9px] font-medium text-gray-500">ID: {req.userId}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleResponse(req._id, 'accept')} className="text-[9px] font-bold text-emerald-400 uppercase">Accept</button>
                      <button onClick={() => handleResponse(req._id, 'reject')} className="text-[9px] font-bold text-red-400 uppercase">Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NGO/ADMIN Footer */}
      {isNGO && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 gap-3">
          <select 
            value={problem.status?.toLowerCase()} 
            onChange={(e) => handleStatusUpdate(e.target.value)}
            className="!py-1.5 !text-[10px] !font-bold !bg-transparent border-none uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[10px] font-bold text-red-500/60 hover:text-red-500 uppercase tracking-widest transition-colors"
          >
            Terminate
          </button>
        </div>
      )}

      {/* Termination Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-[#0b1220]/95 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-center">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Terminate Mission?</h4>
            <p className="text-[10px] text-gray-400 font-medium leading-relaxed">This action will archive tactical data and cannot be undone.</p>
            <div className="flex gap-2 justify-center pt-2">
              <button onClick={handleDelete} className="btn-danger !py-2 !px-5 !text-[10px] !rounded-xl">Confirm</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary !py-2 !px-5 !text-[10px] !rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
