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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Crisis Problems
            </h1>
            <p className="text-[#9CA3AF] text-[14px] mt-1 font-medium tracking-wide">
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
        <div className="card !p-0 mb-10 overflow-hidden">

          {/* ── Search Row ── */}
          <div className="px-5 pt-6 pb-5">
            <input
              type="text"
              placeholder="Search by title, area, description, or date…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-[10px] border border-white/10 bg-black/20 text-[13px] focus:border-purple-500 transition-all outline-none text-white placeholder-gray-500"
            />
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-white/6 mx-5" />

          {/* ── Dropdowns Row ── */}
          <div className="px-5 pt-5 pb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Urgency */}
              <div className="flex flex-col gap-2 md:w-[48%]">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.12em] pl-1.5">Urgency Level</label>
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

              {/* Status — pushed right */}
              <div className="flex flex-col gap-2 md:w-[48%] md:ml-auto">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.12em] pl-1.5">Current Status</label>
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
        </div>

        {/* Grid */}
        {loading && problems.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mt-10">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mt-10">
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


    </div>
  );
}
