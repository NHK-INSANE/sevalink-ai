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
  const [sortBy, setSortBy] = useState("newest");
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
      if (sortNearest && userLoc) {
        const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
        const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
        return d1 - d2;
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-32 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Crisis Archive
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-2 font-medium">
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
                className="btn-primary !text-xs !px-6 shadow-[0_0_20px_var(--primary-glow)]"
              >
                + Report New
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="card !p-6 mb-12 space-y-6 border-white/5 shadow-2xl">
          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
            <input
              type="text"
              placeholder="Filter by title, description, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-[1.25rem] border border-white/5 bg-white/5 text-sm focus:border-[var(--primary)] transition-all outline-none placeholder-white/10"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">Urgency Level</label>
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/5 bg-white/5 text-xs font-bold uppercase tracking-wider outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="All">All Levels</option>
                <option value="Critical">Critical Only</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">Current Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/5 bg-white/5 text-xs font-bold uppercase tracking-wider outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open Reports</option>
                <option value="In Progress">Active Responding</option>
                <option value="Resolved">Resolved Cases</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">Sort Logic</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/5 bg-white/5 text-xs font-bold uppercase tracking-wider outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="newest">Chronological</option>
                <option value="urgency">Urgency Weight</option>
                <option value="score">Priority Index</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading && problems.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div>
            {filtered.length === 0 ? (
              <div className="card !p-20 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-3xl mb-6">🔍</div>
                <p className="text-white font-bold text-xl">No matching reports</p>
                <p className="text-[var(--text-secondary)] text-sm mt-2 max-w-sm">No crises match your current filters. Try broadening your search parameters.</p>
                <button 
                  onClick={() => { setSearch(""); setFilterUrgency("All"); setFilterStatus("All"); }}
                  className="btn-secondary mt-8 !px-8"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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

      {/* Floating Action Button */}
      <div className="fixed bottom-10 right-10 z-[100]">
        <Link href="/submit">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 bg-[var(--primary)] text-white flex items-center justify-center rounded-[1.25rem] shadow-[0_10px_40px_var(--primary-glow)] hover:scale-110 active:scale-95 transition text-2xl border border-white/10"
            title="New Report"
          >
            ➕
          </motion.button>
        </Link>
      </div>
    </div>

      {/* Floating Action Button - Moved up to avoid chat overlap */}
      <Link 
        href="/submit" 
        className="fixed bottom-24 right-6 z-50 bg-[var(--primary)] text-white w-14 h-14 flex items-center justify-center rounded-full shadow-lg hover:scale-110 active:scale-95 transition text-2xl"
      >
        ➕
      </Link>
    </div>
  );
}
