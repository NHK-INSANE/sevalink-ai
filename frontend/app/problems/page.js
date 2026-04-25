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
import { socket } from "../../lib/socket";
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
    socket.on("new-problem", (newProb) => {
      setProblems(prev => {
        if (prev.find(p => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
    });
    socket.on("problem-updated", (updatedProb) => {
      setProblems(prev => prev.map(p => p._id === updatedProb._id ? updatedProb : p));
    });
    return () => {
      socket.off("new-problem");
      socket.off("problem-updated");
    };
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
      if (sortBy === "category") {
        const catA = (a.category && a.category[0]) || "General";
        const catB = (b.category && b.category[0]) || "General";
        return catA.localeCompare(catB);
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Navbar />
      <PageWrapper>
        <div className="page-wrapper pt-28 pb-20">
          <main className="flex flex-col space-y-8">
          
          {/* ── HEADER SECTION ── */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Incident Archive</h1>
              <p className="text-[var(--text-secondary)] text-sm font-medium">Full repository of civic disruptions and resolution status.</p>
            </div>
            <Link href="/submit" className="btn-apple">
              NEW REPORT
            </Link>
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
              <div className="relative group">
                <select 
                  value={sortBy} 
                  onChange={(e) => {
                    if (e.target.value === "nearest" && !userLoc) handleLocate();
                    else setSortBy(e.target.value);
                  }}
                  className="bg-[#0B1220] border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold text-gray-300 outline-none hover:border-purple-500/50 transition cursor-pointer appearance-none shadow-lg w-full md:w-48"
                >
                  <option value="newest" className="bg-[#0B1220]">Newest First</option>
                  <option value="nearest" className="bg-[#0B1220]">Nearest</option>
                  <option value="urgency" className="bg-[#0B1220]">By Urgency</option>
                  <option value="category" className="bg-[#0B1220]">By Category</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 group-hover:text-purple-400 transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          </div>

          {/* ── FILTERS ── */}
          <div className="flex flex-wrap gap-2">
            {["All", "Critical", "High", "Medium", "Low"].map((u) => (
              <button
                key={u}
                onClick={() => setFilterUrgency(u)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                  filterUrgency === u 
                    ? "bg-indigo-600/20 text-white border-indigo-500/50" 
                    : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* ── CONTENT ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center glass-card">
              <p className="text-white font-semibold">No problems found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <ProblemCard 
                  key={p._id} 
                  problem={p} 
                  onStatusChange={handleStatusChange} 
                  onDelete={handleDelete}
                  showActions={true} 
                />
              ))}
            </div>
          )}
          </main>
        </div>
      </PageWrapper>
    </div>
  );
}
