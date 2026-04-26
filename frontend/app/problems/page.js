"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import { getUserLocation } from "../utils/location";
import PageWrapper from "../components/PageWrapper";
import { SkeletonCard } from "../components/Skeleton";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
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
      
      if (filterSeverity !== "all") url += `severity=${filterSeverity.toLowerCase()}&`;
      if (filterStatus !== "all") url += `status=${filterStatus.toLowerCase()}&`;

      const res = await axios.get(url);
      const data = res.data.success ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setProblems(data);
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

  const handleLocate = async () => {
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortBy("nearest");
      toast.success("GPS Proximity Lock: Active");
    } catch (err) {
      toast.error("Geolocation signal lost.");
    }
  };

  const filtered = problems.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      const pId = (p.problemId || "").toLowerCase();
      return (p.title || "").toLowerCase().includes(s) || 
             pId.includes(s) || 
             (p.description || "").toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#080B14] text-white pb-24 font-inter">
      <Navbar />
      <PageWrapper className="pt-28 px-6">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 border-b border-white/5 pb-10">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Tactical Grid</h1>
              <div className="flex items-center gap-3">
                 <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                 <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Global Monitoring: Active</p>
              </div>
            </div>
            <Link href="/submit" className="btn-primary !px-10 !py-4 !rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-purple-500/20">
              Report Mission
            </Link>
          </div>

          <div className="space-y-6 mb-12 bg-white/[0.01] p-6 rounded-[2rem] border border-white/5 shadow-2xl">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  placeholder="Search by ID, Keyword, or Personnel..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-xs text-white focus:border-purple-500 outline-none transition-all placeholder:text-gray-700 font-bold"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                {search && (
                   <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                   </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-2xl py-3.5 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 outline-none cursor-pointer focus:border-purple-500"
                >
                  <option value="newest">Latest Archive</option>
                  <option value="nearest">Nearest Nodes</option>
                  <option value="name">Alpha Order</option>
                </select>

                <div className="flex gap-1 bg-black/40 border border-white/10 rounded-2xl p-1">
                  {["all", "critical", "high", "medium", "low"].map(u => (
                    <button
                      key={u} onClick={() => setFilterSeverity(u)}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterSeverity === u ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-gray-600 hover:text-gray-300"}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1 bg-black/40 border border-white/10 rounded-2xl p-1">
                  {["all", "open", "in_progress", "resolved"].map(s => (
                    <button
                      key={s} onClick={() => setFilterStatus(s)}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-300"}`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleLocate}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${userLoc ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "bg-black/40 border border-white/10 text-gray-600 hover:text-white"}`}
                  title="Force GPS Synchronization"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {loading ? (
                [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
              ) : filtered.length === 0 ? (
                <div className="col-span-full py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl opacity-20">🔎</div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">No Active Nodes Found</h2>
                  <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest max-w-xs mx-auto leading-relaxed">Modify your tactical filters or search parameters to find specific crisis signatures.</p>
                </div>
              ) : (
                filtered.map((p) => (
                  <motion.div key={p._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ProblemCard problem={p} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
