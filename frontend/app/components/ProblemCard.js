import { useState, useEffect } from "react";
import { getUser } from "../utils/auth";
import { apiRequest } from "../utils/api";
import { matchVolunteers } from "../data/volunteers";
import toast from "react-hot-toast";

const urgencyConfig = {
  Critical: { bg: "bg-red-100 text-red-600", icon: "🔴" },
  High:     { bg: "bg-orange-100 text-orange-600", icon: "🟠" },
  Medium:   { bg: "bg-yellow-100 text-yellow-600", icon: "🟡" },
  Low:      { bg: "bg-green-100 text-green-600", icon: "🟢" },
};

const statusColors = {
  Open: "text-blue-600 bg-blue-50 border-blue-100",
  "In Progress": "text-yellow-600 bg-yellow-50 border-yellow-100",
  Resolved: "text-emerald-600 bg-emerald-50 border-emerald-100",
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
  const [assigned, setAssigned] = useState(problem.assignedTo);
  const [showVolunteers, setShowVolunteers] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [user, setUser] = useState(null);
  const matched = matchVolunteers(problem.requiredSkill);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleAssign = async (volunteerId, volunteerName) => {
    if (!window.confirm(`Assign ${volunteerName} to this problem?`)) return;
    setIsAssigning(true);
    try {
      await apiRequest(`/api/problems/${problem._id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ volunteerId, volunteerName }),
      });
      setAssigned(volunteerId);
      toast.success(`${volunteerName} assigned!`);
      // Update local status artificially to reflect UI change instantly
      if (onStatusChange) onStatusChange(problem._id, "In Progress");
    } catch (err) {
      toast.error("Failed to assign volunteer");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition duration-200 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-800 text-lg leading-snug flex-1">
          {problem.title}
        </h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${config.bg}`}
        >
          {config.icon} {problem.urgency}
        </span>
      </div>

      <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
        {problem.description}
      </p>

      {/* Submitter info */}
      <p className="text-xs text-gray-400 mb-4 italic">
        Submitted by: {problem.createdBy?.name || "Anonymous"}
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
          <div className="w-full bg-slate-100 rounded-full h-1.5">
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
          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 border border-gray-100">
            📂 {problem.category}
          </span>
        )}
        {problem.requiredSkill && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 border border-gray-100">
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
        <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <button
            onClick={() => setShowVolunteers((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
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
                        disabled={isAssigning}
                        onClick={() => handleAssign(v.id, v.name)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors font-medium disabled:opacity-50"
                      >
                        {isAssigning ? "..." : "Assign"}
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

      {/* Timeline Section */}
      {(problem.timeline && problem.timeline.length > 0) && (
        <div className="mb-4">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center transition-colors"
          >
            🕒 Activity Timeline {showTimeline ? "▲" : "▼"}
          </button>
          
          {showTimeline && (
            <div className="mt-3 pl-2 border-l-2 border-indigo-100 space-y-3">
              {[...problem.timeline].reverse().map((event, idx) => (
                <div key={idx} className="relative pl-3">
                  <span className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-indigo-400 outline outline-2 outline-white"></span>
                  <p className="text-xs text-slate-700 font-medium">{event.text}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{new Date(event.time).toLocaleTimeString()} · {new Date(event.time).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
        <span className="text-xs text-gray-400">
          {timeAgo(problem.createdAt)}
        </span>
        {onStatusChange && (
          <select
            value={problem.status}
            onChange={(e) => onStatusChange(problem._id, e.target.value)}
            className="text-xs bg-white border border-gray-200 text-gray-600 rounded-md px-2 py-1 cursor-pointer transition duration-200"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        )}

        {/* 🔒 Delete button logic */}
        {user &&
          (user.id === problem.createdBy || user._id === problem.createdBy) && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this problem?")) {
                  onDelete && onDelete(problem._id, user.id || user._id);
                }
              }}
              className="bg-red-500 px-3 py-1 rounded text-white mt-2 text-xs font-bold transition-all shadow-lg shadow-red-500/10"
            >
              Delete
            </button>
          )}
      </div>
    </div>
  );
}
