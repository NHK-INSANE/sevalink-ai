"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import DiscussionPanel from "./DiscussionPanel";
import { getUser } from "../utils/auth";

export default function ProblemCard({ problem, onStatusChange, onDelete }) {
  const [user, setUser] = useState(null);
  const [showChat, setShowChat] = useState(false);

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
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 md:p-6 hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative ${
        problem.urgency === "Critical" ? "border-red-100 dark:border-red-900/20 shadow-red-100/10" : ""
      }`}
    >
      {/* Delete button (Owner only) */}
      {user && user._id === problem.createdBy && (
        <button 
          onClick={() => onDelete(problem._id)}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 dark:bg-red-900/20 text-red-500 p-1.5 rounded-lg hover:bg-red-500 hover:text-white"
          title="Delete Report"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}

      {/* Urgency Badge */}
      <div className="flex justify-between items-center mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${urgencyColors[problem.urgency] || urgencyColors.Medium}`}>
          {problem.urgency}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">
          {new Date(problem.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Content */}
      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
        {problem.title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
        {problem.description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 mb-4">
        <div className="text-xs text-gray-400 flex items-center gap-1.5 italic">
          <svg className="w-3 h-3 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
          <span className="truncate max-w-[150px]">{problem.locationName || problem.address || "Location unavailable"}</span>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="flex flex-col pt-4 border-t border-gray-50 dark:border-gray-800 mt-auto">
        <div className="flex items-center justify-between">
           <select
            value={problem.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-[11px] font-bold border-none bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-lg focus:ring-0 cursor-pointer"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* AI Score (Subtle badge) */}
          {problem.score > 0 && (
            <div className="flex items-center gap-1.5" title="AI Priority Score">
              <span className="text-[10px] font-bold text-indigo-500">{problem.score}%</span>
              <div className="w-10 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500" style={{ width: `${problem.score}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Team Discussion */}
        <button
          onClick={() => setShowChat(true)}
          className="mt-3 w-full py-2.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          Team Coordination
        </button>

        {problem.status === "Open" && (
          <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
            <button
              onClick={() => onStatusChange(problem._id, "In Progress")}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 hover:scale-[1.01] active:scale-95 transition"
            >
              Take Action
            </button>
          </div>
        )}
      </div>
    </motion.div>

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
