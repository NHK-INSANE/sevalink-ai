"use client";
import { motion } from "framer-motion";
import Counter from "../Counter";
import dynamic from "next/dynamic";
import ProblemCard from "../ProblemCard";

const MapView = dynamic(() => import("../MapView"), { ssr: false });

export default function AdminDashboard({ problems, usersList, lastUpdate }) {
  const volunteersCount = usersList.filter(u => u.role?.toLowerCase() === "volunteer").length;
  const ngosCount = usersList.filter(u => u.role?.toLowerCase() === "ngo").length;
  const workersCount = usersList.filter(u => u.role?.toLowerCase() === "worker").length;

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

      {/* Admin Heatmap */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Global Crisis Heatmap</h3>
          <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/20">ADMIN ACCESS</span>
        </div>
        <div className="h-[400px]">
          <MapView problems={problems} height="100%" showHeatmap={true} />
        </div>
      </div>

      {/* User Logs / System Overview */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
           <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-400">System Logs</h3>
           <div className="space-y-3">
              {problems.slice(0, 5).map(p => (
                <div key={p._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-xs">
                  <span className="text-gray-300">New report: "{p.title}"</span>
                  <span className="text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : "Recent"}</span>
                </div>
              ))}
           </div>
        </div>
        <div className="card">
           <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-400">Security Pulse</h3>
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Socket Status</span>
                <span className="text-xs text-green-400 font-bold">CONNECTED</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">API Latency</span>
                <span className="text-xs text-indigo-400 font-bold">24ms</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
