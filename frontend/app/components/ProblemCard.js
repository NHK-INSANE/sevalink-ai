"use client";
import { useState, useEffect } from "react";
import { getUser } from "../utils/auth";
import { apiRequest } from "../utils/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function ProblemCard({ problem, onStatusChange, onDelete }) {
  const [user, setUser] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleStatusChange = async (newStatus) => {
    if (onStatusChange) onStatusChange(problem._id, newStatus);
  };

  const urgencyColors = {
    Critical: "text-red-600 bg-red-50 border-red-100",
    High:     "text-orange-600 bg-orange-50 border-orange-100",
    Medium:   "text-yellow-600 bg-yellow-50 border-yellow-100",
    Low:      "text-green-600 bg-green-50 border-green-100",
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200 group flex flex-col h-full"
    >
      {/* Urgency Badge */}
      <div className="flex justify-between items-center mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${urgencyColors[problem.urgency] || urgencyColors.Medium}`}>
          {problem.urgency}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">
          {new Date(problem.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Content */}
      <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-blue-600 transition truncate">
        {problem.title}
      </h3>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
        {problem.description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 mb-4">
        <div className="text-xs text-gray-400 flex items-center gap-1">
          📍 <span className="truncate max-w-[150px]">{problem.locationName || problem.address || "Location unavailable"}</span>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2">
           <select
            value={problem.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-[11px] font-bold border-none bg-gray-50 text-gray-600 px-2 py-1 rounded-lg focus:ring-0 cursor-pointer"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {/* AI Score (Subtle badge) */}
        {problem.score > 0 && (
          <div className="flex items-center gap-1.5" title="AI Priority Score">
            <span className="text-[10px] font-bold text-indigo-500">{problem.score}%</span>
            <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500" style={{ width: `${problem.score}%` }} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
