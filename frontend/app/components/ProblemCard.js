import { useState, useEffect } from "react";
import { getUser } from "../utils/auth";
import { matchVolunteers } from "../data/volunteers";

const urgencyConfig = {
  Critical: {
    badgeClass: "badge-critical",
    dot: "bg-red-500",
    pulse: "animate-pulse-critical",
    icon: "🔴",
  },
  High: {
    badgeClass: "badge-high",
    dot: "bg-orange-500",
    pulse: "",
    icon: "🟠",
  },
  Medium: {
    badgeClass: "badge-medium",
    dot: "bg-yellow-500",
    pulse: "",
    icon: "🟡",
  },
  Low: {
    badgeClass: "badge-low",
    dot: "bg-green-500",
    pulse: "",
    icon: "🟢",
  },
};

const statusColors = {
  Open: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  "In Progress": "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  Resolved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const getScoreColor = (score) => {
  if (score > 80) return "text-red-400";
  if (score > 60) return "text-orange-400";
  if (score > 30) return "text-yellow-400";
  return "text-green-400";
};

const getScoreBarColor = (score) => {
  if (score > 80) return "bg-red-500";
  if (score > 60) return "bg-orange-500";
  if (score > 30) return "bg-yellow-500";
  return "bg-green-500";
};

export default function ProblemCard({ problem, onStatusChange, onDelete }) {
  const config = urgencyConfig[problem.urgency] || urgencyConfig.Medium;
  const [assigned, setAssigned] = useState(null);
  const [showVolunteers, setShowVolunteers] = useState(false);
  const [user, setUser] = useState(null);
  const matched = matchVolunteers(problem.requiredSkill);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <div
      className={`glass rounded-xl p-5 transition-all duration-300 hover:border-indigo-500/20 hover:-translate-y-0.5 ${config.pulse}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-white text-base leading-snug flex-1">
          {problem.title}
        </h3>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${config.badgeClass}`}
        >
          {config.icon} {problem.urgency}
        </span>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">
        {problem.description}
      </p>

      {/* Priority Score */}
      {typeof problem.score === "number" && problem.score > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              Priority Score
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[9px] font-bold tracking-wide">⚡ AI</span>
            </span>
            <span className={`text-xs font-bold ${getScoreColor(problem.score)}`}>
              {problem.score} / 100
            </span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${getScoreBarColor(problem.score)}`}
              style={{ width: `${problem.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {problem.category && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
            📂 {problem.category}
          </span>
        )}
        {problem.requiredSkill && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
            🛠 {problem.requiredSkill}
          </span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded-md border ${statusColors[problem.status] || statusColors.Open}`}
        >
          {problem.status}
        </span>
      </div>

      {/* Volunteer Matching */}
      {problem.requiredSkill && (
        <div className="mb-4 rounded-lg border border-white/8 bg-white/3 p-3">
          <button
            onClick={() => setShowVolunteers((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <span>
              🤝 Matched Volunteers
              <span
                className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  matched.length > 0
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-slate-500"
                }`}
              >
                {matched.length}
              </span>
            </span>
            <span className="text-slate-500">{showVolunteers ? "▲" : "▼"}</span>
          </button>

          {showVolunteers && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-white/8">
              {matched.length > 0 ? (
                matched.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs text-emerald-400 font-medium">
                        {v.name}
                      </span>
                      <span className="text-xs text-slate-500 ml-1.5">
                        {v.skill} · {v.location}
                      </span>
                    </div>
                    {assigned === v.id ? (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        ✓ Assigned
                      </span>
                    ) : (
                      <button
                        onClick={() => setAssigned(v.id)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors font-medium"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-1">
                  No volunteers matched for this skill
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">
          {timeAgo(problem.createdAt)}
        </span>
        {onStatusChange && (
          <select
            value={problem.status}
            onChange={(e) => onStatusChange(problem._id, e.target.value)}
            className="text-xs bg-white/5 border border-white/10 text-slate-300 rounded-md px-2 py-1 cursor-pointer hover:border-indigo-500/40 transition-colors"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        )}

        {/* 🔒 Delete button logic */}
        {user &&
          (user.role === "user" || user.role === "volunteer") &&
          (user.id === problem.createdBy || user._id === problem.createdBy) && (
            <button
              onClick={() => onDelete && onDelete(problem._id)}
              className="px-3 py-1 text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
            >
              Delete
            </button>
          )}
      </div>
    </div>
  );
}
