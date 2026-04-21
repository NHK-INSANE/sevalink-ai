"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { getProblems, getUsers } from "../utils/api";

export default function AIMatchPage() {
  const [problems, setProblems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    Promise.all([getProblems(), getUsers()])
      .then(([probs, allUsers]) => {
        setProblems(probs);
        setUsers(allUsers);

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

  const urgencyBadge = (u) => {
    const map = {
      Critical: "bg-red-100 text-red-600",
      High: "bg-orange-100 text-orange-600",
      Medium: "bg-yellow-100 text-yellow-600",
      Low: "bg-green-100 text-green-600",
    };
    return map[u] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 transition duration-200">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 md:px-10 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">🤖 AI Smart Match</h1>
          <p className="text-gray-500 text-sm">
            Automatically matching open problems with skilled volunteers based on required skills
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-600">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
            ⚡ AI-powered skill matching engine
          </div>
        </div>

        {/* Summary Stats */}
        {!loading && matches.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 text-center transition duration-200">
              <div className="text-2xl font-bold text-blue-600">{matches.length}</div>
              <div className="text-xs text-gray-500 mt-1">Problems Needing Help</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 text-center transition duration-200">
              <div className="text-2xl font-bold text-emerald-600">
                {matches.filter((m) => m.volunteers.length > 0).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Successfully Matched</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 text-center transition duration-200">
              <div className="text-2xl font-bold text-red-500">
                {matches.filter((m) => m.volunteers.length === 0).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Unmatched</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl h-28 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-md border border-dashed border-gray-200">
            <div className="text-5xl mb-4">🤖</div>
            <p className="text-gray-600 font-semibold text-lg">No matchable problems right now</p>
            <p className="text-gray-400 text-sm mt-1">
              Problems need a requiredSkill field and volunteers need matching skills
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(({ problem, volunteers: vols }, i) => (
              <div
                key={problem._id || i}
                className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition duration-200"
              >
                {/* Problem header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-gray-800 font-bold text-base">{problem.title}</h2>
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{problem.description}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 px-2 py-1 rounded ${urgencyBadge(problem.urgency)}`}>
                    {problem.urgency}
                  </span>
                </div>

                {/* Skill needed */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-400 text-xs">Skill needed:</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-600 text-xs font-medium">
                    {problem.requiredSkill}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${
                    problem.status === "Open" ? "bg-blue-50 text-blue-600 border-blue-100" :
                    problem.status === "In Progress" ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                    "bg-green-50 text-green-600 border-green-100"
                  }`}>{problem.status}</span>
                </div>

                {/* Matched volunteers */}
                {vols.length > 0 ? (
                  <div>
                    <span className="text-emerald-600 text-xs font-semibold">
                      ✅ {vols.length} match{vols.length > 1 ? "es" : ""} found
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {vols.map((v, vi) => (
                        <div
                          key={v._id || vi}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs"
                        >
                          <span className="text-emerald-700 font-medium">{v.name || v.email}</span>
                          {v.phone && <span className="text-gray-400">· {v.phone}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="text-red-400 text-xs font-medium">
                    ❌ No matching volunteers — consider broadening skills
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
