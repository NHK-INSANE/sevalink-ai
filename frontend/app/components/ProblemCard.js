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

        {/* Chat — 40px square, prominent */}
        <button
          onClick={() => {
            if (!user) return toast.error("Please login to join the discussion");
            setShowChat(true);
          }}
          title="Open Discussion"
          className="flex items-center justify-center rounded-[8px] bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/30 transition-all"
          style={{ width: 40, height: 40 }}
        >
          <svg className="w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>

        {/* Action Buttons Column */}
        <div className="flex-1 flex flex-col gap-2">
          <button
            onClick={() => onStatusChange(problem._id, "In Progress")}
            disabled={problem.status !== "Open"}
            className="w-full py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30 text-[11px] font-semibold rounded-[8px] transition disabled:opacity-40"
          >
            Assign
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = `/ai-match?id=${problem._id}`}
              className="flex-1 py-1.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 border border-indigo-500/20 text-[10px] font-bold rounded-md transition"
            >
              🤖 AI Match
            </button>
            <button
              onClick={() => {
                if (!user) return toast.error("Please login to create a team");
                setShowChat(true);
                // We'll set a timeout or use a state to switch to teams tab
              }}
              className="flex-1 py-1.5 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/20 text-[10px] font-bold rounded-md transition"
            >
              👥 Team
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
