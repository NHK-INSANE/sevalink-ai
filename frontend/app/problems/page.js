"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import { getProblems, updateProblemStatus } from "../utils/api";

const URGENCY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    getProblems()
      .then(setProblems)
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id, status) => {
    await updateProblemStatus(id, status);
    setProblems((prev) =>
      prev.map((p) => (p._id === id ? { ...p, status } : p))
    );
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
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              All Problems
            </h1>
            <p className="text-slate-400">
              {loading ? "…" : `${filtered.length} of ${problems.length} reports`}
            </p>
          </div>
          <a
            href="/submit"
            className="btn-primary px-5 py-3 rounded-xl text-white font-medium text-sm self-start md:self-auto"
          >
            + Report New Problem
          </a>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4 mb-8 flex flex-wrap gap-4 items-center">
          <input
            id="search-problems"
            type="text"
            placeholder="🔍 Search problems…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/40 transition-all"
          />
          <select
            id="filter-urgency"
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2.5 text-slate-300 text-sm cursor-pointer"
          >
            <option value="All">All Urgencies</option>
            <option value="Critical">🔴 Critical</option>
            <option value="High">🟠 High</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Low">🟢 Low</option>
          </select>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2.5 text-slate-300 text-sm cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select
            id="sort-problems"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2.5 text-slate-300 text-sm cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="urgency">By Urgency</option>
            <option value="score">By Priority Score</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="glass rounded-xl h-48 animate-pulse bg-white/3"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-600">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg">No problems match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <ProblemCard
                key={p._id}
                problem={p}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
