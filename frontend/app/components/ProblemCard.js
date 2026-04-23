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
    <div className="card flex flex-col justify-between group h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <span className={`badge ${urgencyBadges[problem.urgency] || "badge-medium"}`}>{problem.urgency}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-medium">{new Date(problem.createdAt).toLocaleDateString()}</span>
            {user && user._id === problem.createdBy && (
              <button onClick={() => onDelete(problem._id)} className="text-gray-500 hover:text-red-400 transition" title="Delete">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Title + description */}
        <div>
          <h3 className="text-[13px] font-semibold text-white leading-snug group-hover:text-purple-400 transition-colors line-clamp-2 pr-2">
            {problem.title}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2 leading-relaxed pr-2">
            {problem.description}
          </p>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <svg className="w-3 h-3 opacity-50 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
          <span className="truncate">{problem.locationName || problem.address || "Location unavailable"}</span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* Priority bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Resolution Priority</span>
            <span className="text-[10px] font-bold text-purple-400">{problem.score}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500/60 rounded-full" style={{ width: `${problem.score}%` }} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <select
            value={problem.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="flex-1 bg-transparent text-gray-300 py-2 border-0 text-[11px] font-medium cursor-pointer focus:ring-0 outline-none"
          >
            <option value="Open" className="bg-[#0f172a]">Open</option>
            <option value="In Progress" className="bg-[#0f172a]">In Progress</option>
            <option value="Resolved" className="bg-[#0f172a]">Resolved</option>
          </select>
          <div className="flex gap-1.5">
            <button onClick={() => setShowChat(true)} className="p-1.5 text-gray-400 hover:text-white transition" title="Discussion">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </button>
            <button
              onClick={() => onStatusChange(problem._id, "In Progress")}
              disabled={problem.status !== "Open"}
              className="px-3 py-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 text-[10px] font-semibold uppercase tracking-wider rounded transition disabled:opacity-40"
            >
              Assign
            </button>
          </div>
        </div>
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
