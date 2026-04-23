"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import { getProblems, updateProblemStatus, deleteProblem } from "../utils/api";
import { getUserLocation } from "../utils/location";
import PageWrapper from "../components/PageWrapper";
import { SkeletonCard } from "../components/Skeleton";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
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
  const [sortBy, setSortBy] = useState("newest"); // Default to newest
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
    setProblems((prev) => prev.map((p) => (p._id === id ? { ...p, status } : p)));
  };

  const handleLocate = async () => {
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortBy("nearest");
      toast.success("Sorting by proximity");
    } catch (err) {
      toast.error("Could not get location");
    }
  };

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
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
    } catch (err) { toast.error(err.message || "Failed to delete problem"); }
  };

  const filtered = problems
    .filter((p) => {
      if (filterUrgency !== "All" && p.urgency !== filterUrgency) return false;
      if (filterStatus !== "All" && p.status !== filterStatus) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "nearest" && userLoc) {
        const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
        const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
        return d1 - d2;
      }
      if (sortBy === "urgency") return (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9);
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Navbar />
      <PageWrapper>
        {/* 🔥 PAGE CONTAINER — Added pt-28 to clear fixed Navbar */}
        <main className="max-w-[var(--content-max)] mx-auto px-6 lg:px-12 pt-28 pb-20 flex flex-col gap-[28px]">
          
          {/* ── HEADER SECTION ── */}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Crisis Problems</h1>
            <p className="text-[var(--text-secondary)] text-sm font-medium">
              {loading ? "Synchronizing logs..." : `Accessing ${filtered.length} active event records`}
            </p>
          </div>

          {/* ── TOP BAR (Search + Actions) ── */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <input
              type="text"
              placeholder="Search problems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:max-w-md px-4 py-2.5 rounded-xl border border-white/10 bg-black/20 text-sm focus:border-purple-500 transition-all outline-none text-white"
            />
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select 
                value={sortBy} 
                onChange={(e) => {
                  if (e.target.value === "nearest" && !userLoc) handleLocate();
                  else setSortBy(e.target.value);
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-300 outline-none hover:border-purple-500/50 transition cursor-pointer h-10"
              >
                <option value="newest" className="bg-[#0f172a]">Sort by Newest</option>
                <option value="urgency" className="bg-[#0f172a]">Sort by Urgency</option>
                <option value="nearest" className="bg-[#0f172a]">Sort by Nearest</option>
              </select>

              <Link href="/submit" className="flex-1 md:flex-none">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary !text-xs !px-6 w-full h-10"
                  style={{ background: "linear-gradient(to right, #7c3aed, #6366f1)" }}
                >
                  + Report New
                </motion.button>
              </Link>
            </div>
          </div>

          {/* ── FILTER CARD ── */}
          <div className="p-5 rounded-2xl bg-[#0f172a] border border-white/5 flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Urgency Level</label>
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0B1220] border border-white/10 focus:border-purple-500 transition outline-none text-sm text-white"
              >
                <option value="All">All Levels</option>
                <option value="Critical">Critical Only</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0B1220] border border-white/10 focus:border-purple-500 transition outline-none text-sm text-white"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* ── PROBLEMS GRID ── */}
          {loading && problems.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <>
              {filtered.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
                  <p className="text-white font-semibold">No matching records found</p>
                  <button onClick={() => { setSearch(""); setFilterUrgency("All"); setFilterStatus("All"); }} className="text-purple-400 text-sm mt-2 hover:underline">Clear all filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((p) => (
                    <ProblemCard key={p._id} problem={p} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </PageWrapper>
    </div>
  );
}
