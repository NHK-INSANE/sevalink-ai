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
    <div className="card problem-card group">
      {/* Delete button (Owner only) */}
      {user && user._id === problem.createdBy && (
        <button 
          onClick={() => onDelete(problem._id)}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 p-2 hover:bg-red-500/10 rounded-xl shadow-sm"
          title="Delete Report"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}

      {/* Header: Urgency & Date */}
      <div className="flex justify-between items-start">
        <span className={`badge ${urgencyBadges[problem.urgency] || "badge-medium"}`}>
          {problem.urgency}
        </span>
        <span className="text-[10px] text-[var(--text-secondary)] font-medium">
          {new Date(problem.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-bold text-[var(--text-primary)] text-lg tracking-tight group-hover:text-[var(--primary)] transition-colors">
          {problem.title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
          {problem.description}
        </p>
        
        <div className="flex items-center gap-3 pt-2">
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2 font-medium min-w-0">
            <svg className="w-3.5 h-3.5 opacity-50 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            <span className="truncate">{problem.locationName || problem.address || "Location unavailable"}</span>
          </div>
          
          {problem.location && problem.location.lat && (
            <button
              onClick={() => {
                router.push(`/map?lat=${problem.location.lat}&lng=${problem.location.lng}&title=${encodeURIComponent(problem.title)}`);
              }}
              className="ml-auto btn-secondary !py-1 !px-3 !text-[10px] !rounded-lg"
            >
              Locate
            </button>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="pt-4 border-t border-[var(--border)] space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Resolution Priority</span>
            <span className="text-[10px] font-bold text-[var(--primary)]">{problem.score}%</span>
          </div>
          <div className="progress-container">
             <div className="progress-fill" style={{ width: `${problem.score}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <select
            value={problem.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="flex-1 bg-[var(--bg-hover)] text-[var(--text-primary)] px-3 py-2 rounded-xl border border-[var(--border)] text-xs font-medium cursor-pointer"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setShowChat(true)}
              className="btn-secondary !p-2"
              title="Open Discussion"
            >
              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </button>
            
            <button
              onClick={() => {
                onStatusChange(problem._id, "In Progress");
              }}
              disabled={problem.status !== "Open"}
              className="btn-primary !py-2 !px-4 !text-xs whitespace-nowrap disabled:opacity-50"
            >
              Assign Me
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
