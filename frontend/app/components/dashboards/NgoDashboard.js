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

    </div>
  );
}
