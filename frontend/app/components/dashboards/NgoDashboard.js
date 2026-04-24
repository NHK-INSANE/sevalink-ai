"use client";
import { motion } from "framer-motion";
import Counter from "../Counter";
import dynamic from "next/dynamic";
import ProblemCard from "../ProblemCard";
import Link from "next/link";

const MapView = dynamic(() => import("../MapView"), { ssr: false });

export default function NgoDashboard({ problems, usersList }) {
  const openProblems = problems.filter(p => p.status === "Open");
  const inProgress = problems.filter(p => p.status === "In Progress");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-[11px] tracking-widest text-gray-500 mb-2 uppercase">Unassigned Cases</p>
          <p className="text-2xl font-bold text-red-400"><Counter value={openProblems.length} /></p>
        </div>
        <div className="card">
          <p className="text-[11px] tracking-widest text-gray-500 mb-2 uppercase">Active Missions</p>
          <p className="text-2xl font-bold text-indigo-400"><Counter value={inProgress.length} /></p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Critical Priority Queue</h3>
            <Link href="/ai-match" className="btn-primary !py-2 !px-4 !text-[10px]">AI Matching Center</Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {problems.filter(p => p.urgency === "Critical").slice(0, 4).map(p => (
              <ProblemCard key={p._id} problem={p} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-400">NGO Stats</h3>
            <div className="space-y-4">
               <div className="flex justify-between">
                 <span className="text-xs text-gray-400">Response Rate</span>
                 <span className="text-xs text-white font-bold">94%</span>
               </div>
               <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500 w-[94%]" />
               </div>
            </div>
          </div>
          <div className="card h-[300px] p-0 overflow-hidden">
             <MapView problems={problems} height="100%" />
          </div>
        </div>
      </div>
    </div>
  );
}
