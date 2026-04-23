"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import DiscussionPanel from "./DiscussionPanel";
import { getUser } from "../utils/auth";

export default function ProblemCard({ problem, onStatusChange, onDelete }) {
  const [user, setUser] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleStatusChange = async (newStatus) => {
    if (onStatusChange) onStatusChange(problem._id, newStatus);
  };

  const urgencyBadges = {
    Critical: "badge-critical",
    High:     "badge-high",
    Medium:   "badge-medium",
    Low:      "badge-low",
  };

  return (
    <>
    <div className="bg-[#0f172a] border border-white/10 rounded-sm p-4 space-y-3 relative group hover:border-purple-500/40 transition">
      {/* Delete button */}
      {user && user._id === problem.createdBy && (
        <button 
          onClick={() => onDelete(problem._id)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 p-1.5 hover:bg-red-500/10 rounded"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <span className={`badge ${urgencyBadges[problem.urgency] || "badge-medium"}`}>{problem.urgency}</span>
        <span className="text-[10px] text-gray-500">{new Date(problem.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Title + description */}
      <div>
        <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-purple-400 transition-colors line-clamp-1">
          {problem.title}
        </h3>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
          {problem.description}
        </p>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
        <svg className="w-3 h-3 opacity-50 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
        <span className="truncate">{problem.locationName || problem.address || "Location unavailable"}</span>
      </div>

      {/* Priority bar */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Resolution Priority</span>
          <span className="text-[9px] font-bold text-purple-400">{problem.score}%</span>
        </div>
        <div className="progress-container" style={{ height: "3px" }}>
          <div className="progress-fill" style={{ width: `${problem.score}%` }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <select
          value={problem.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="flex-1 bg-white/5 text-gray-300 px-2 py-1.5 border border-white/10 text-[11px] font-medium cursor-pointer transition hover:border-purple-500 rounded-sm"
        >
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <button
          onClick={() => setShowChat(true)}
          className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition"
          title="Discussion"
        >
          <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
        <button
          onClick={() => onStatusChange(problem._id, "In Progress")}
          disabled={problem.status !== "Open"}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[11px] rounded-sm transition disabled:opacity-40"
        >
          Assign Me
        </button>
      </div>
    </div>

    <AnimatePresence>
      {showChat && (
        <DiscussionPanel 
          problemId={problem._id} 
          user={user} 
          onClose={() => setShowChat(false)} 
          problemTitle={problem.title}
        />
      )}
    </AnimatePresence>
    </>
  );
}
