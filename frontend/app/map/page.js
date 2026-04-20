"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import { getProblems } from "../utils/api";
import { motion } from "framer-motion";

// Import MapView dynamically to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-slate-900/50 rounded-2xl animate-pulse">
      <div className="flex flex-col items-center gap-3 text-indigo-400">
        <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-medium">Initializing Map System...</span>
      </div>
    </div>
  ),
});

const MODES = [
  { id: "all", label: "All Assets", icon: "🌐" },
  { id: "problems", label: "Crisis Reports", icon: "🔴" },
  { id: "ngo", label: "Registered NGOs", icon: "🏢" },
  { id: "helpers", label: "Volunteers", icon: "🤝" },
];

export default function MapPage() {
  const [type, setType] = useState("all");
  const [problems, setProblems] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Problems
        const problemData = await getProblems();
        setProblems(problemData);

        // Fetch Users (NGOs & Helpers)
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
        if (BASE_URL) {
          const res = await fetch(`${BASE_URL}/users`);
          if (res.ok) {
            const users = await res.json();
            setNgos(users.filter((u) => u.role === "ngo"));
            setHelpers(users.filter((u) => u.role === "volunteer" || u.role === "worker"));
          }
        }
      } catch (err) {
        console.error("Map Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen premium-bg text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Global Crisis Map
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Live visualization of reports, relief organizations, and field volunteers.
            </p>
          </div>

          {/* Filter System */}
          <div className="flex flex-wrap gap-2 p-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setType(mode.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-semibold ${
                  type === mode.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* The Map Component */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative h-[650px] rounded-3xl overflow-hidden border border-white/10 shadow-3xl"
        >
          {/* Statistics Overlay */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <div className="glass px-4 py-2 rounded-xl border border-white/10 text-xs font-mono shadow-2xl">
              <span className="text-red-400 mr-2">●</span> {problems.length} Problems
            </div>
            <div className="glass px-4 py-2 rounded-xl border border-white/10 text-xs font-mono shadow-2xl">
              <span className="text-indigo-400 mr-2">●</span> {ngos.length} NGOs
            </div>
            <div className="glass px-4 py-2 rounded-xl border border-white/10 text-xs font-mono shadow-2xl">
              <span className="text-emerald-400 mr-2">●</span> {helpers.length} Helpers
            </div>
          </div>

          <MapView
            problems={problems}
            ngos={ngos}
            helpers={helpers}
            type={type}
            height="100%"
            zoom={6}
          />
        </motion.div>
      </main>
    </div>
  );
}
