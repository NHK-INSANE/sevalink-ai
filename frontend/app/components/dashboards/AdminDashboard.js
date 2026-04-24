"use client";
import { motion } from "framer-motion";
import Counter from "../Counter";

import ProblemCard from "../ProblemCard";



export default function AdminDashboard({ problems = [], usersList = [], lastUpdate }) {
  const safeProbs = Array.isArray(problems) ? problems : [];
  const safeUsers = Array.isArray(usersList) ? usersList : [];

  const volunteersCount = safeUsers.filter(u => u?.role?.toLowerCase() === "volunteer").length;
  const ngosCount = safeUsers.filter(u => u?.role?.toLowerCase() === "ngo").length;
  const workersCount = safeUsers.filter(u => u?.role?.toLowerCase() === "worker").length;

  return (
    <div className="space-y-6">
      {/* Admin Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Systems Active", value: problems.length },
          { label: "Global Volunteers", value: volunteersCount },
          { label: "NGO Partners", value: ngosCount },
          { label: "Field Workers", value: workersCount },
        ].map((s, i) => (
          <div key={i} className="card">
            <p className="text-[11px] tracking-widest text-gray-500 mb-2 uppercase">{s.label}</p>
            <p className="text-2xl font-bold text-white"><Counter value={s.value} /></p>
          </div>
        ))}
      </div>

    </div>
  );
}
