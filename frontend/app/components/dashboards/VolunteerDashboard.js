"use client";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import ProblemCard from "../ProblemCard";
import Link from "next/link";

const ZapIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MapView = dynamic(() => import("../MapView"), { ssr: false });

export default function VolunteerDashboard({ problems, userLoc }) {
  const sorted = userLoc
    ? [...problems].sort((a, b) => {
        const aLat = a.location?.lat ?? a.latitude ?? 0;
        const aLng = a.location?.lng ?? a.longitude ?? 0;
        const bLat = b.location?.lat ?? b.latitude ?? 0;
        const bLng = b.location?.lng ?? b.longitude ?? 0;
        if (!aLat || !bLat) return 0;
        const d1 = Math.hypot(aLat - userLoc.lat, aLng - userLoc.lng);
        const d2 = Math.hypot(bLat - userLoc.lat, bLng - userLoc.lng);
        return d1 - d2;
      })
    : problems;

  const openCount = problems.filter((p) => p.status === "Open").length;

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card bg-gradient-to-br from-indigo-900/20 to-transparent border-indigo-500/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <ZapIcon />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Ready to help?</h3>
              <p className="text-sm text-gray-400 mb-6">
                We've found {openCount} open {openCount === 1 ? "crisis" : "crises"} near you that match your skills.
              </p>
              <div className="flex gap-3">
                <Link href="/map" className="btn-primary !py-2.5 !px-5 !text-xs">
                  Open Map View
                </Link>
                <Link href="/ai-match" className="btn-secondary !py-2.5 !px-5 !text-xs">
                  See AI Matches
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="card flex flex-col justify-center items-center text-center gap-2">
          <MapPinIcon />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Location</p>
          <p className="text-sm text-white font-medium">
            {userLoc ? "Tracking Active" : "Location Disabled"}
          </p>
        </div>
      </div>

      {/* Problems Feed */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-400">
          <TargetIcon />
          <h4 className="text-sm font-semibold uppercase tracking-widest">
            {userLoc ? "Nearest First" : "All Open Issues"}
          </h4>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No problems found in your area.</p>
        ) : (
          sorted.map((problem, i) => (
            <motion.div
              key={problem.id ?? i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProblemCard problem={problem} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}