"use client";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import ProblemCard from "../ProblemCard";
import Link from "next/link";
import { Zap, MapPin, Target } from "lucide-react";

const MapView = dynamic(() => import("../MapView"), { ssr: false });

export default function VolunteerDashboard({ problems, userLoc }) {
  // Sort by nearest if location is available
  const sorted = userLoc ? [...problems].sort((a,b) => {
    const d1 = Math.hypot(a.location?.lat - userLoc.lat, a.location?.lng - userLoc.lng);
    const d2 = Math.hypot(b.location?.lat - userLoc.lat, b.location?.lng - userLoc.lng);
    return d1 - d2;
  }) : problems;

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card bg-gradient-to-br from-indigo-900/20 to-transparent border-indigo-500/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
               <Zap size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Ready to help?</h3>
              <p className="text-sm text-gray-400 mb-6">We've found {problems.filter(p => p.status === "Open").length} open crises near you that match your skills.</p>
              <div className="flex gap-3">
                <Link href="/map" className="btn-primary !py-2.5 !px-5 !text-xs">Open Map View</Link>
                <Link href="/ai-match" className="btn-secondary !py-2.5 !px-5 !text-xs">See AI Matches</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="card flex flex-col justify-center items-center text-center">
           <MapPin className="text-gray-600 mb-3" size={32} />
           <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Your Location</p>
           <p className="text-sm text-white font-medium">{userLoc ? "Tracking Active" : "Location Disabled"}</p>
        </div>
      </div>

      {/* Recommended for You */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Target className="text-indigo-400" size={20} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Recommended Missions</h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.slice(0, 6).map(p => (
            <ProblemCard key={p._id} problem={p} />
          ))}
        </div>
      </div>

      {/* Map Insight */}
      <div className="card p-0 overflow-hidden h-[300px]">
         <MapView problems={problems} height="100%" zoomToUser={true} />
      </div>
    </div>
  );
}
