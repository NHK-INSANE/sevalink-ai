"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import { getProblems, getUsers } from "../utils/api";
import { motion } from "framer-motion";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

// Import MapView dynamically to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-gray-50 rounded-2xl animate-pulse border border-gray-100">
      <div className="flex flex-col items-center gap-3 text-blue-600">
        <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-medium text-sm">Initializing Map System...</span>
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
        const users = await getUsers();
        setNgos(users.filter((u) => u.role === "ngo" || u.role === "NGO"));
        setHelpers(users.filter((u) => u.role === "volunteer" || u.role === "worker"));
      } catch (err) {
        console.error("Map Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 🌐 Real-time Map Updates
    const socket = io(API_BASE);
    socket.on("new-problem", (newProb) => {
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 transition duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-10 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              🗺️ Global Crisis Map
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">
              Live visualization of reports, relief organizations, and field volunteers.
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 p-1 bg-white border border-gray-200 rounded-2xl shadow-sm">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setType(mode.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition duration-200 text-xs font-semibold ${
                  type === mode.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-blue-600 hover:bg-gray-50"
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
          className="relative h-[650px] rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-white"
        >
          {/* Statistics Overlay */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-slate-700">{problems.length} Problems</span>
            </div>
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-slate-700">{ngos.length} NGOs</span>
            </div>
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-700">{helpers.length} Helpers</span>
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
