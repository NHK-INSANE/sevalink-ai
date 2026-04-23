"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { getProblems, getUsers } from "../utils/api";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function matchVolunteers(problem, helpers, topN = 5) {
  const urgencyBoost = { critical: 30, high: 20, medium: 10, low: 0 };
  return helpers
    .map((h) => {
      let score = 0;
      const dist = getDistance(problem.location?.lat, problem.location?.lng, h.location?.lat, h.location?.lng);
      const distKm = dist ?? 999;
      score += Math.max(0, 100 - distKm);
      const hSkills = (h.skills || []).map((s) => String(s).toLowerCase());
      if (h.skill) hSkills.push(String(h.skill).toLowerCase());
      
      const pCat = Array.isArray(problem.category) ? problem.category[0] : problem.category;
      const pReqSkill = Array.isArray(problem.requiredSkills) ? problem.requiredSkills[0] : problem.requiredSkill;
      const pSkill = String(pReqSkill || pCat || "").toLowerCase();

      if (pSkill && hSkills.includes(pSkill)) score += 50;
      score += urgencyBoost[String(problem.urgency || "").toLowerCase()] || 0;
      return { ...h, score: Math.round(score), distKm };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

const urgencyBadge = (u) => {
  const map = {
    Critical: "bg-red-500/10 text-red-500 border-red-500/20",
    High: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    Low: "bg-green-500/10 text-green-500 border-green-500/20",
  };
  return map[u] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
};

export default function AIMatchPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveEvent, setLiveEvent] = useState(null);
  const currentUser = getUser();

  useEffect(() => {
    Promise.all([getProblems(), getUsers()])
      .then(([probs, allUsers]) => {
        const helpers = allUsers.filter(u => u.role?.toLowerCase() === "volunteer" || u.role?.toLowerCase() === "worker");
        const openProblems = probs.filter(p => p.status !== "Resolved");
        const matched = openProblems.map(problem => ({
          problem,
          volunteers: matchVolunteers(problem, helpers, 5),
        }));
        setMatches(matched);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    const socket = io(API_BASE);
    socket.on("matched-volunteers", ({ problem, matched }) => {
      setMatches(prev => {
        if (prev.find(m => m.problem._id === problem._id)) return prev;
        return [{ problem, volunteers: matched }, ...prev];
      });
      setLiveEvent({ problem, matched });
      toast.success(`🎯 New match: "${problem.title}"`);
    });

    return () => socket.disconnect();
  }, []);

  const totalMatched = matches.filter(m => m.volunteers.length > 0).length;
  const totalUnmatched = matches.filter(m => m.volunteers.length === 0).length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">🤖 AI Smart Match</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Real-time volunteer matching — scored on proximity, skills, and urgency
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 text-[10px] font-bold text-[var(--primary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              ⚡ Live matching
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-200/20 bg-purple-500/5 text-[10px] font-bold text-purple-500">
              📐 Scoring Algorithm
            </div>
          </div>
        </div>

        {/* Live Event Banner */}
        {liveEvent && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
            <span className="text-xl">🎯</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-emerald-600 text-sm">New match detected!</div>
              <div className="text-emerald-500/80 text-xs mt-0.5 truncate">
                "{liveEvent.problem.title}" matched {liveEvent.matched.length} volunteer{liveEvent.matched.length > 1 ? "s" : ""}
              </div>
            </div>
            <button onClick={() => setLiveEvent(null)} className="text-emerald-400 hover:text-emerald-600 p-1">✕</button>
          </div>
        )}

        {/* Stats */}
        {!loading && matches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-[var(--primary)]">{matches.length}</div>
              <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mt-1">Problems</div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-emerald-500">{totalMatched}</div>
              <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mt-1">Matched</div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-red-500">{totalUnmatched}</div>
              <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mt-1">Unmatched</div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-[var(--card)] border border-[var(--border)] rounded-2xl animate-pulse" />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 bg-[var(--card)] rounded-3xl border border-dashed border-[var(--border)] flex flex-col items-center">
            <p className="text-[var(--text)] font-bold text-lg">No open problems to match</p>
            <p className="text-[var(--muted)] text-sm mt-1">Submit a problem to trigger AI matching</p>
          </div>
        ) : (
          <div className="space-y-6">
            {matches.map(({ problem, volunteers: vols }, i) => (
              <div key={problem._id || i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">{problem.title}</h2>
                    <p className="text-[var(--muted)] text-xs mt-1 line-clamp-1">{problem.description}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${urgencyBadge(problem.urgency)}`}>
                    {problem.urgency}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {problem.requiredSkill && (
                    <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-500 text-[10px] font-bold">🛠 {problem.requiredSkill}</span>
                  )}
                  {problem.category && (
                    <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">📂 {problem.category}</span>
                  )}
                </div>

                {vols.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-2">Recommended Volunteers</div>
                    {vols.map((v, vi) => (
                      <div key={v._id || vi} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${vi === 0 ? "bg-yellow-500 text-white" : "bg-[var(--card)] text-[var(--muted)]"}`}>
                          #{vi + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">
                            {v.name || v.email}
                            {v._id?.toString() === (currentUser?._id || currentUser?.id)?.toString() && <span className="ml-2 text-xs text-[var(--primary)]">(You)</span>}
                          </div>
                          <div className="text-[10px] text-[var(--muted)] truncate">
                            {v.distKm != null && v.distKm < 999 ? `📍 ${v.distKm} km` : "Location unknown"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-emerald-500">{v.score}</div>
                          <div className="text-[10px] text-[var(--muted)] font-bold uppercase">score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-red-500/5 border border-dashed border-red-500/20 rounded-xl text-center">
                    <p className="text-red-500 text-[11px] font-bold">No volunteers matched nearby</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
