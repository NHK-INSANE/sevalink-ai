"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { getProblems } from "../utils/api";

export default function AIMatchPage() {
  const [problems, setProblems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    Promise.all([
      getProblems(),
      getUsers(),
    ])
      .then(([probs, allUsers]) => {
        setProblems(probs);
        setUsers(allUsers);

        // AI matching logic: match problems needing skills with volunteers who have them
        const volunteers = allUsers.filter(
          (u) =>
            u.role?.toLowerCase() === "volunteer" ||
            u.role?.toLowerCase() === "worker"
        );

        const openProblems = probs.filter(
          (p) => p.status !== "Resolved" && p.requiredSkill
        );

        const matched = openProblems.map((problem) => {
          const matchedVols = volunteers.filter((v) => {
            const vSkills = (v.skills || []).map((s) => s.toLowerCase());
            const pSkill = problem.requiredSkill?.toLowerCase() || "";
            return vSkills.includes(pSkill) || v.skill?.toLowerCase() === pSkill;
          });
          return { problem, volunteers: matchedVols };
        });

        setMatches(matched);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const urgencyColor = (u) =>
    u === "Critical" ? "text-red-400" :
    u === "High" ? "text-orange-400" :
    u === "Medium" ? "text-yellow-400" : "text-emerald-400";

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">🤖 AI Smart Match</h1>
          <p className="text-slate-400 text-sm">
            Automatically matching open problems with skilled volunteers based on required skills
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
            ⚡ AI-powered skill matching engine
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass rounded-xl h-28 animate-pulse bg-white/3 border border-white/5" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
            <div className="text-5xl mb-4">🤖</div>
            <p className="text-slate-400 font-semibold text-lg">No matchable problems right now</p>
            <p className="text-slate-600 text-sm mt-1">
              Problems need a requiredSkill field and volunteers need matching skills
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(({ problem, volunteers: vols }, i) => (
              <div
                key={problem._id || i}
                className="glass rounded-xl p-5 border border-white/8 hover:border-indigo-500/20 transition-all"
              >
                {/* Problem header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-white font-bold text-base">{problem.title}</h2>
                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{problem.description}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${urgencyColor(problem.urgency)}`}>
                    {problem.urgency}
                  </span>
                </div>

                {/* Skill needed */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-slate-500 text-xs">Skill needed:</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-medium">
                    {problem.requiredSkill}
                  </span>
                </div>

                {/* Matched volunteers */}
                {vols.length > 0 ? (
                  <div>
                    <span className="text-emerald-400 text-xs font-semibold">
                      ✅ {vols.length} match{vols.length > 1 ? "es" : ""} found
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {vols.map((v, vi) => (
                        <div
                          key={v._id || vi}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs"
                        >
                          <span className="text-emerald-300 font-medium">{v.name || v.email}</span>
                          {v.phone && <span className="text-slate-500">· {v.phone}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="text-red-400/70 text-xs font-medium">
                    ❌ No matching volunteers — consider broadening skills
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary stats */}
        {!loading && matches.length > 0 && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="glass rounded-xl p-4 border border-white/8 text-center">
              <div className="text-2xl font-bold text-white">{matches.length}</div>
              <div className="text-xs text-slate-500 mt-1">Problems Needing Help</div>
            </div>
            <div className="glass rounded-xl p-4 border border-white/8 text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {matches.filter((m) => m.volunteers.length > 0).length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Successfully Matched</div>
            </div>
            <div className="glass rounded-xl p-4 border border-white/8 text-center">
              <div className="text-2xl font-bold text-red-400">
                {matches.filter((m) => m.volunteers.length === 0).length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Unmatched</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
