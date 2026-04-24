import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import DiscussionPanel from "./DiscussionPanel";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";

export default function ProblemCard({ problem, onStatusChange, onDelete }) {
  const [user, setUser] = useState(null);
  const [showChat, setShowChat] = useState(false);

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
    <div className="report-card relative group">

      {/* ── Delete button (owner only, on hover) ── */}
      {user && user._id === problem.createdBy && (
        <button
          onClick={() => onDelete(problem._id)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 p-1 hover:bg-red-500/10 rounded z-10"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* ── Row 1: Urgency badge (left) + Status select (right) ── */}
      <div className="flex justify-between items-center mb-4">
        <span className={`badge ${urgencyBadges[problem.urgency] || "badge-medium"} text-[10px] px-1.5 py-0.5 rounded`}>
          {problem.urgency}
        </span>

        {/* Status — top-right, compact */}
        <select
          value={problem.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-[6px] text-gray-400 px-2 py-1 text-[11px] font-medium outline-none hover:border-purple-500/40 transition cursor-pointer"
        >
          <option value="Open" className="bg-[#0f172a]">Open</option>
          <option value="In Progress" className="bg-[#0f172a]">In Progress</option>
          <option value="Resolved" className="bg-[#0f172a]">Resolved</option>
        </select>
      </div>

      {/* ── Date ── */}
      <div className="text-[10px] text-[#6B7280] mb-2">
        {new Date(problem.createdAt).toLocaleDateString()}
      </div>

      {/* ── Title ── */}
      <h3 className="title text-[14px] font-semibold leading-[1.4] mb-2 text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
        {problem.title}
      </h3>

      {/* ── Description ── */}
      <p className="desc text-[12px] text-[#9CA3AF] leading-[1.5] mb-4 line-clamp-2">
        {problem.description}
      </p>

      {/* ── Meta: Category + Skills ── */}
      <div className="problem-meta">
        {Array.isArray(problem.category) ? (
          problem.category.map(cat => (
            <span key={cat} className="category-badge">{cat}</span>
          ))
        ) : (
          problem.category && <span className="category-badge">{problem.category}</span>
        )}
        
        {Array.isArray(problem.requiredSkills) ? (
          problem.requiredSkills.map(skill => (
            <span key={skill} className="skill-badge">{skill}</span>
          ))
        ) : (
          problem.requiredSkills && <span className="skill-badge">{problem.requiredSkills}</span>
        )}

        {(!Array.isArray(problem.requiredSkills) || problem.requiredSkills.length === 0) && problem.requiredSkill && (
          <span className="skill-badge">{problem.requiredSkill}</span>
        )}
      </div>

      {/* ── Location ── */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mb-5">
        <svg className="w-3.5 h-3.5 opacity-50 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        <span className="truncate font-medium">{problem.location?.address || problem.locationName || "Location undisclosed"}</span>
      </div>

      {/* ── Footer: Chat (left) + Assign (right) ── */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">

        <div className="flex-1 grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              if (!user) return toast.error("Please login to join the discussion");
              setShowChat(true);
            }}
            className="flex flex-col items-center justify-center py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition group/btn"
          >
            <span className="text-sm mb-1 group-hover/btn:scale-110 transition-transform">💬</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 group-hover/btn:text-white">Chat</span>
          </button>
          
          <button
            onClick={() => {
              if (!user) return toast.error("Please login to form a unit");
              setShowChat(true);
              // Switch to teams tab logic could go here
            }}
            className="flex flex-col items-center justify-center py-2 bg-white/5 hover:bg-emerald-600/10 border border-white/10 hover:border-emerald-500/20 rounded-xl transition group/btn"
          >
            <span className="text-sm mb-1 group-hover/btn:scale-110 transition-transform">👥</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 group-hover/btn:text-emerald-400">Units</span>
          </button>

          <button
            onClick={() => window.location.href = `/ai-match?id=${problem._id}`}
            className="flex flex-col items-center justify-center py-2 bg-white/5 hover:bg-indigo-600/10 border border-white/10 hover:border-indigo-500/20 rounded-xl transition group/btn"
          >
            <span className="text-sm mb-1 group-hover/btn:scale-110 transition-transform">🤖</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 group-hover/btn:text-indigo-400">Match</span>
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
