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
  const [filterUrgency, setFilterUrgency] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
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
      
      if (filterUrgency !== "All") url += `urgency=${filterUrgency}&`;
      if (filterStatus !== "All") url += `status=${filterStatus}&`;

      const res = await axios.get(url);
      setProblems(res.data);
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
  }, [sortBy, filterUrgency, filterStatus, userLoc]);

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
    <div className="min-h-screen bg-[#080B14] text-white">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* ── HEADER ── */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase">Crisis Archive</h1>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Autonomous Incident Repository & Response Grid</p>
            </div>
            <Link href="/submit" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-500/20 transition-all">
              Initiate Report
            </Link>
          </div>

          {/* ── TOOLBAR ── */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by ID, Title or Description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-[1.5rem] px-6 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600"
              />
              <div className="absolute right-6 top-4 text-gray-700">🔍</div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Sort Dropdown */}
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#0f172a] border border-white/10 rounded-xl px-4 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="nearest">Nearest First</option>
                <option value="score">Priority Score</option>
              </select>

              {/* Urgency Filters */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                {["All", "Critical", "High", "Medium"].map(u => (
                  <button
                    key={u}
                    onClick={() => setFilterUrgency(u)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterUrgency === u ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    {u}
                  </button>
                ))}
              </div>

              {/* Status Filters */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                {["All", "Open", "In Progress", "Resolved"].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleLocate}
                className={`p-4 rounded-xl border transition-all ${userLoc ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"}`}
                title="Locate Me"
              >
                📍
              </button>
            </div>
          </div>

          {/* ── GRID ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-32 text-center bg-[#0f172a]/20 border border-white/5 rounded-[3rem]">
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No active missions matching criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
