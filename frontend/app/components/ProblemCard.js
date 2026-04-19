"use client";

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

export default function ProblemCard({ problem, onStatusChange }) {
  const config = urgencyConfig[problem.urgency] || urgencyConfig.Medium;

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
      </div>
    </div>
  );
}
