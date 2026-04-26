"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import { getUserLocation } from "../utils/location";
import PageWrapper from "../components/PageWrapper";
import { SkeletonCard } from "../components/Skeleton";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { socket } from "../../lib/socket";
import Link from "next/link";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [userLoc, setUserLoc] = useState(null);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/problems?`;
      if (sortBy === "nearest" && userLoc) {
        url += `lat=${userLoc.lat}&lng=${userLoc.lng}&sort=nearest&`;
      } else {
        url += `sort=${sortBy}&`;
      }
      
      if (filterSeverity !== "all") url += `severity=${filterSeverity}&`;
      if (filterStatus !== "all") url += `status=${filterStatus}&`;

      const res = await axios.get(url);
      setProblems(res.data.success ? res.data.data : res.data);
    } catch (err) {
      toast.error("Failed to load mission data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
    
    socket.on("new-problem", (newProb) => {
      setProblems(prev => [newProb, ...prev]);
    });
    
    socket.on("problem-updated", (updated) => {
      setProblems(prev => prev.map(p => p._id === updated._id ? updated : p));
    });

    socket.on("problem-deleted", (deletedId) => {
      setProblems(prev => prev.filter(p => p._id !== deletedId));
    });

    return () => {
      socket.off("new-problem");
      socket.off("problem-updated");
      socket.off("problem-deleted");
    };
  }, [sortBy, filterSeverity, filterStatus, userLoc]);

  const [errorShown, setErrorShown] = useState(false);

  const handleLocate = async () => {
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortBy("nearest");
      toast.success("GPS Proximity Lock: Active");
      setErrorShown(false);
    } catch (err) {
      if (!errorShown) {
        toast.error("Geolocation signal lost.");
        setErrorShown(true);
      }
    }
  };

  const filtered = problems.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      const pId = (p.problemId || "").toLowerCase();
      return p.title.toLowerCase().includes(s) || pId.includes(s) || p.description.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Crisis Archive</h1>
              <p className="text-sm text-gray-400 font-medium">Real-time incident monitoring and response coordination.</p>
            </div>
            <Link href="/submit" className="btn-primary !px-8 !py-4 shadow-xl shadow-purple-500/20">
              Report Incident
            </Link>
          </div>

          {/* TOOLBAR */}
          <div className="space-y-6 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Search */}
              <div className="lg:col-span-5 relative">
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full !rounded-xl !py-3.5 pl-12"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
              </div>

              {/* Filters & Sort */}
              <div className="lg:col-span-7 flex flex-wrap items-center gap-3">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="!rounded-xl !py-3 !px-4 !text-xs !font-bold uppercase tracking-wider !bg-white/5 border-none cursor-pointer"
                >
                  <option value="newest">Latest First</option>
                  <option value="nearest">Nearest First</option>
                  <option value="name">Sort by Name</option>
                </select>

                <div className="h-8 w-[1px] bg-white/10 hidden sm:block mx-1" />

                <div className="flex gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/5 overflow-x-auto">
                  {["all", "critical", "high", "medium", "low"].map(u => (
                    <button
                      key={u}
                      onClick={() => setFilterSeverity(u)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filterSeverity === u ? "bg-purple-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/5 overflow-x-auto">
                  {["all", "open", "in_progress", "resolved"].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === s ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleLocate}
                  className={`p-3 rounded-xl border transition-all ${userLoc ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}
                  title="Locate Me"
                >
                  📍
                </button>
              </div>
            </div>
          </div>

          {/* GRID */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
              <div className="text-4xl mb-4">🔎</div>
              <h2 className="text-lg font-bold text-white mb-2">No problems found</h2>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">Try changing filters or search terms to find specific reports.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <ProblemCard key={p._id} problem={p} />
              ))}
            </div>
          )}
        </div>
      </PageWrapper>
    </div>
  );
}
