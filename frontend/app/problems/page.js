"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import { getProblems, updateProblemStatus, deleteProblem } from "../utils/api";
import { getUserLocation } from "../utils/location";
import PageWrapper from "../components/PageWrapper";
import { SkeletonCard } from "../components/Skeleton";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const URGENCY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("nearest");
  const [userLoc, setUserLoc] = useState(null);
  const [sortNearest, setSortNearest] = useState(false);

  const fetchProblems = () => {
    setLoading(true);
    getProblems()
      .then(setProblems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProblems();
    
    // 🌐 Live List Updates
    const socket = io(API_BASE);
    socket.on("new-problem", (newProb) => {
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
    });

    socket.on("problem-updated", (updatedProb) => {
      setProblems(prev => prev.map(p => p._id === updatedProb._id ? updatedProb : p));
    });

    return () => socket.disconnect();
  }, []);

  const handleStatusChange = async (id, status) => {
    await updateProblemStatus(id, status);
    setProblems((prev) =>
      prev.map((p) => (p._id === id ? { ...p, status } : p))
    );
  };

  const handleLocateAndSort = async () => {
    if (sortNearest) {
      setSortNearest(false);
      return;
    }
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortNearest(true);
      toast.success("Sorting by proximity");
    } catch (err) {
      toast.error("Could not get location");
    }
  };

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this problem?")) return;
    try {
      await deleteProblem(id);
      setProblems((prev) => prev.filter((p) => p._id !== id));
      toast.success("Problem deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete problem");
    }
  };

  const filtered = problems
    .filter((p) => {
      if (filterUrgency !== "All" && p.urgency !== filterUrgency) return false;
      if (filterStatus !== "All" && p.status !== filterStatus) return false;
      if (
        search &&
        !p.title.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if ((sortNearest || sortBy === "nearest") && userLoc) {
        const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
        const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
        return d1 - d2;
      }
      if (sortBy === "nearest" && !userLoc) {
        return new Date(b.createdAt) - new Date(a.createdAt); // Fallback to newest if no location
      }
      if (sortBy === "newest")
        return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "urgency")
        return (
          (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9)
        );
      if (sortBy === "score")
        return (b.score ?? 0) - (a.score ?? 0);
      return 0;
    });

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition duration-300">
      <Navbar />
      <PageWrapper>
      <main className="page-container px-6 lg:px-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Crisis Archive
            </h1>
            <p className="text-[#9CA3AF] text-[13px] mt-1 font-medium tracking-wide">
              {loading ? "Synchronizing logs..." : `Accessing ${filtered.length} active event records`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLocateAndSort}
              className="btn-secondary !text-xs !px-6"
            >
              📍 {sortNearest ? "Reset Sort" : "Sort by Nearest"}
            </motion.button>
            <Link href="/submit">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="btn-primary !text-xs !px-6"
              >
                + Report New
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="card !p-5 mb-8 flex flex-col gap-5">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 text-[14px]">🔍</span>
            <input
              type="text"
              placeholder="Filter by title, description, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-5 py-3 rounded-[10px] border border-white/10 bg-black/20 text-[13px] focus:border-purple-500 transition-all outline-none text-white placeholder-gray-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Urgency */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400">URGENCY LEVEL</label>
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-[#0B1220] border border-gray-700 focus:outline-none text-sm text-white"
              >
                <option value="All">All Levels</option>
                <option value="Critical">Critical Only</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
            
            {/* Status */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400">CURRENT STATUS</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-[#0B1220] border border-gray-700 focus:outline-none text-sm text-white"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading && problems.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div>
            {filtered.length === 0 ? (
              <div className="card py-16 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-2xl mb-4">🔍</div>
                <p className="text-white font-semibold text-lg">No matching reports</p>
                <p className="text-gray-500 text-[13px] mt-1 max-w-sm">No crises match your current filters. Try broadening your search parameters.</p>
                <button 
                  onClick={() => { setSearch(""); setFilterUrgency("All"); setFilterStatus("All"); }}
                  className="btn-secondary mt-6 text-sm"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                {filtered.map((p) => (
                  <ProblemCard
                    key={p._id}
                    problem={p}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      </PageWrapper>


      {/* FAB - using global fab class (bottom-100px, right-28px, z-fab) */}
      <div className="fab">
        <Link
          href="/submit"
          className="btn-primary"
          style={{
            width: 52, height: 52,
            borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
          }}
          title="New Report"
        >
          ➕
        </Link>
      </div>
    </div>
  );
}
