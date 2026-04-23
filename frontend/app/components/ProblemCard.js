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

  const urgencyColors = {
    Critical: "text-red-600 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30",
    High:     "text-orange-600 bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30",
    Medium:   "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30",
    Low:      "text-green-600 bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30",
  };

  return (
    <>
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col h-full relative group">
      {/* Delete button (Owner only) */}
      {user && user._id === problem.createdBy && (
        <button 
          onClick={() => onDelete(problem._id)}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"
          title="Delete Report"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}

      {/* Header: Urgency & Date */}
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${urgencyColors[problem.urgency] || urgencyColors.Medium}`}>
          {problem.urgency}
        </span>
        <span className="text-[10px] text-[var(--muted)] font-medium">
          {new Date(problem.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-bold text-[var(--text)] text-base mb-1 tracking-tight">
          {problem.title}
        </h3>
        <p className="text-sm text-[var(--muted)] line-clamp-2 leading-relaxed mb-4">
          {problem.description}
        </p>
        
        <div className="flex items-center gap-2 mb-6">
          <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5 font-medium">
            <svg className="w-3 h-3 opacity-40" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            <span className="truncate max-w-[200px]">{problem.locationName || problem.address || "Location unavailable"}</span>
          </div>
          
          {problem.location && problem.location.lat && (
            <button
              onClick={() => {
                router.push(`/map?lat=${problem.location.lat}&lng=${problem.location.lng}&title=${encodeURIComponent(problem.title)}`);
              }}
              className="ml-auto text-[10px] font-bold text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-1 transition"
            >
              📍 Locate
            </button>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="pt-4 border-t border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between">
          <select
            value={problem.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-[11px] font-bold bg-[var(--bg)] text-[var(--muted)] px-2 py-1 rounded-md border-none focus:ring-0 cursor-pointer"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          {problem.score > 0 && (
            <div className="flex items-center gap-1.5" title="AI Priority Score">
              <span className="text-[10px] font-bold text-[var(--primary)]">{problem.score}%</span>
              <div className="w-8 h-1 bg-[var(--bg)] rounded-full overflow-hidden">
                 <div className="h-full bg-[var(--primary)]" style={{ width: `${problem.score}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowChat(true)}
            className="py-2 bg-[var(--bg)] text-[var(--text)] rounded-lg text-[11px] font-semibold border border-[var(--border)] hover:bg-[var(--card)] transition flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            Discuss
          </button>
          
          <button
            onClick={() => {
              onStatusChange(problem._id, "In Progress");
              try {
                const context = require("react").useContext(require("../context/NotificationContext").NotificationContext);
                if (context && context.addNotification) {
                  context.addNotification(`You were assigned to: ${problem.title}`);
                }
              } catch(e) {}
            }}
            disabled={problem.status !== "Open"}
            className="py-2 bg-[var(--primary)] text-white rounded-lg text-[11px] font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            Assign Me
          </button>
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
