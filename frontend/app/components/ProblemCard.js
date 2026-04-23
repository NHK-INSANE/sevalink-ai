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
    <div className="report-card relative group">

      {/* ── Delete button (owner only, hover) ── */}
      {user && user._id === problem.createdBy && (
        <button
          onClick={() => onDelete(problem._id)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 p-1 hover:bg-red-500/10 rounded"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* ── Row 1: Urgency badge + Date ── */}
      <div className="flex justify-between items-start mb-3">
        <span className={`badge ${urgencyBadges[problem.urgency] || "badge-medium"} text-[10px] px-1.5 py-0.5 rounded`}>
          {problem.urgency}
        </span>
        <span className="date text-[10px] text-[#6B7280]">
          {new Date(problem.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* ── Title ── */}
      <h3 className="title text-[14px] font-semibold leading-[1.4] mb-[6px] text-white line-clamp-2 pr-4 group-hover:text-purple-400 transition-colors">
        {problem.title}
      </h3>

      {/* ── Description ── */}
      <p className="desc text-[12px] text-[#9CA3AF] leading-[1.4] mb-[10px] line-clamp-2">
        {problem.description}
      </p>

      {/* ── Location ── */}
      <div className="flex items-center gap-1.5 text-[10px] text-[#6B7280] mb-5">
        <svg className="w-3 h-3 opacity-50 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        <span className="truncate">{problem.locationName || problem.address || "Location unavailable"}</span>
      </div>

      {/* ── Footer: Status (left) | Chat + Assign (right) ── */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">

        {/* Status dropdown — compact, left-aligned */}
        <select
          value={problem.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-[6px] text-gray-300 px-2 py-1.5 text-[11px] font-medium outline-none hover:border-purple-500/50 transition cursor-pointer"
          style={{ minWidth: 100 }}
        >
          <option value="Open" className="bg-[#0f172a]">Open</option>
          <option value="In Progress" className="bg-[#0f172a]">In Progress</option>
          <option value="Resolved" className="bg-[#0f172a]">Resolved</option>
        </select>

        {/* Actions — right */}
        <div className="flex items-center gap-2">
          {/* Chat button — bigger, visible */}
          <button
            onClick={() => setShowChat(true)}
            title="Discussion"
            className="flex items-center justify-center w-8 h-8 rounded-[6px] bg-white/5 hover:bg-purple-600/20 hover:border-purple-500/30 border border-white/10 transition-all"
          >
            <svg className="w-4 h-4 text-gray-400 hover:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>

          {/* Assign button */}
          <button
            onClick={() => onStatusChange(problem._id, "In Progress")}
            disabled={problem.status !== "Open"}
            className="px-4 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30 text-[11px] font-semibold rounded-[6px] transition disabled:opacity-40"
          >
            Assign
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
