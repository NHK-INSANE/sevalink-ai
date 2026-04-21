"use client";
import { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers } from "../utils/api";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

// ── Haversine (client-side mirror) ───────────────────────────────────────────
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── Smart matching (client-side for initial render) ───────────────────────────
function matchVolunteers(problem, helpers, topN = 5) {
  const urgencyBoost = { critical: 30, high: 20, medium: 10, low: 0 };

  return helpers
    .map((h) => {
      let score = 0;

      const dist = getDistance(
        problem.location?.lat,
        problem.location?.lng,
        h.location?.lat,
        h.location?.lng
      );
      const distKm = dist ?? 999;
      score += Math.max(0, 100 - distKm);

      const hSkills = (h.skills || []).map((s) => s.toLowerCase());
      if (h.skill) hSkills.push(h.skill.toLowerCase());
      const pSkill = (problem.requiredSkill || problem.category || "").toLowerCase();
      if (pSkill && hSkills.includes(pSkill)) score += 50;

      score += urgencyBoost[problem.urgency?.toLowerCase()] || 0;

      return { ...h, score: Math.round(score), distKm };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

const urgencyBadge = (u) => {
  const map = {
    Critical: "bg-red-100 text-red-600 border-red-200",
    High: "bg-orange-100 text-orange-600 border-orange-200",
    Medium: "bg-yellow-100 text-yellow-600 border-yellow-200",
    Low: "bg-green-100 text-green-600 border-green-200",
  };
  return map[u] || "bg-gray-100 text-gray-600 border-gray-200";
};

export default function AIMatchPage() {
  const [problems, setProblems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [liveEvent, setLiveEvent] = useState(null); // latest real-time match
  const currentUser = getUser();

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getProblems(), getUsers()])
      .then(([probs, allUsers]) => {
        setProblems(probs);
        setUsers(allUsers);

        const helpers = allUsers.filter(
          (u) =>
            u.role?.toLowerCase() === "volunteer" ||
            u.role?.toLowerCase() === "worker"
        );

        const openProblems = probs.filter(
          (p) => p.status !== "Resolved"
        );

        const matched = openProblems.map((problem) => ({
          problem,
          volunteers: matchVolunteers(problem, helpers, 5),
        }));

        setMatches(matched);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // ── Socket.IO — live matched-volunteers events ────────────────────────────
  useEffect(() => {
    const socket = io(API_BASE);

    socket.on("matched-volunteers", ({ problem, matched }) => {
      // Add the new problem+matches to the top of the list
      setMatches((prev) => {
        const exists = prev.find((m) => m.problem._id === problem._id);
        if (exists) return prev;
        return [{ problem, volunteers: matched }, ...prev];
      });

      setLiveEvent({ problem, matched });

      // Generic toast
      toast.success(
        `🎯 New match: "${problem.title}" — ${matched.length} volunteer${
          matched.length > 1 ? "s" : ""
        } found!`,
        { duration: 5000 }
      );

      // Personal toast — if the logged-in user is in the matched list
      if (currentUser) {
        const me = matched.find(
          (m) =>
            m._id?.toString() === (currentUser._id || currentUser.id)?.toString()
        );
        if (me) {
          toast(
            `🚨 You are matched to a nearby ${problem.urgency} crisis!\n"${problem.title}"`,
            {
              icon: "⚠️",
              style: {
                background: "#ef4444",
                color: "#fff",
                fontWeight: "bold",
                border: "2px solid #fff",
              },
              duration: 8000,
              position: "top-center",
            }
          );
        }
      }
    });

    // new-problem updates local problem list
    socket.on("new-problem", (newProb) => {
      setProblems((prev) => {
        if (prev.find((p) => p._id === newProb._id)) return prev;
        return [newProb, ...prev];
      });
    });

    return () => socket.disconnect();
  }, [currentUser]);

  const totalMatched = matches.filter((m) => m.volunteers.length > 0).length;
  const totalUnmatched = matches.filter((m) => m.volunteers.length === 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 transition duration-200">
      <Navbar />
      <PageWrapper>
        <main className="max-w-5xl mx-auto px-4 md:px-10 py-10">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-1">🤖 AI Smart Match</h1>
            <p className="text-gray-500 text-sm">
              Real-time volunteer matching — scored on proximity, skills, and urgency
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                ⚡ Live socket-powered matching
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-xs font-semibold text-purple-600">
                📐 Distance + Skill + Urgency scoring
              </div>
            </div>
          </div>

          {/* Live Event Banner */}
          {liveEvent && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 animate-pulse-once">
              <span className="text-2xl">🎯</span>
              <div>
                <div className="font-bold text-emerald-700 text-sm">
                  New real-time match just now!
                </div>
                <div className="text-emerald-600 text-xs mt-0.5">
                  "{liveEvent.problem.title}" matched {liveEvent.matched.length} volunteer
                  {liveEvent.matched.length > 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={() => setLiveEvent(null)}
                className="ml-auto text-emerald-400 hover:text-emerald-600 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Stats */}
          {!loading && matches.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 text-center card-hover">
                <div className="text-2xl font-bold text-blue-600">{matches.length}</div>
                <div className="text-xs text-gray-500 mt-1">Problems Needing Help</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 text-center card-hover">
                <div className="text-2xl font-bold text-emerald-600">{totalMatched}</div>
                <div className="text-xs text-gray-500 mt-1">Successfully Matched</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 text-center card-hover">
                <div className="text-2xl font-bold text-red-500">{totalUnmatched}</div>
                <div className="text-xs text-gray-500 mt-1">Unmatched</div>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl h-32 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl shadow-md border border-dashed border-gray-200">
              <div className="text-5xl mb-4">🤖</div>
              <p className="text-gray-600 font-semibold text-lg">No open problems to match</p>
              <p className="text-gray-400 text-sm mt-1">
                Submit a problem to trigger AI matching
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {matches.map(({ problem, volunteers: vols }, i) => (
                <div
                  key={problem._id || i}
                  className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition duration-200"
                >
                  {/* Problem Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h2 className="text-gray-800 font-bold text-base">{problem.title}</h2>
                      <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">
                        {problem.description}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 px-2 py-1 rounded border ${urgencyBadge(
                        problem.urgency
                      )}`}
                    >
                      {problem.urgency}
                    </span>
                  </div>

                  {/* Skill + Status */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {problem.requiredSkill && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-600 text-xs font-medium">
                        🛠 {problem.requiredSkill}
                      </span>
                    )}
                    {problem.category && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-medium">
                        📂 {problem.category}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded border font-medium ${
                        problem.status === "Open"
                          ? "bg-blue-50 text-blue-600 border-blue-100"
                          : problem.status === "In Progress"
                          ? "bg-yellow-50 text-yellow-600 border-yellow-100"
                          : "bg-green-50 text-green-600 border-green-100"
                      }`}
                    >
                      {problem.status}
                    </span>
                  </div>

                  {/* Matched Volunteers */}
                  {vols.length > 0 ? (
                    <div>
                      <div className="text-emerald-600 text-xs font-semibold mb-2">
                        ✅ Top {vols.length} match{vols.length > 1 ? "es" : ""} — ranked by score
                      </div>
                      <div className="space-y-2">
                        {vols.map((v, vi) => (
                          <div
                            key={v._id || vi}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100"
                          >
                            {/* Rank badge */}
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                vi === 0
                                  ? "bg-yellow-400 text-white"
                                  : vi === 1
                                  ? "bg-gray-300 text-gray-700"
                                  : vi === 2
                                  ? "bg-orange-300 text-white"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              #{vi + 1}
                            </div>

                            {/* Name + Skills */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-800 truncate">
                                {v.name || v.email}
                                {v._id?.toString() ===
                                  (currentUser?._id || currentUser?.id)?.toString() && (
                                  <span className="ml-2 text-xs text-blue-600 font-bold">(You)</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {(v.skills || (v.skill ? [v.skill] : [])).map((s, si) => (
                                  <span
                                    key={si}
                                    className="bg-blue-50 border border-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Distance */}
                            <div className="text-xs text-gray-500 shrink-0 text-right">
                              {v.distKm != null && v.distKm < 999
                                ? `📍 ${v.distKm} km`
                                : "📍 —"}
                            </div>

                            {/* Score */}
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-bold text-emerald-600">
                                {v.score}
                              </div>
                              <div className="text-[10px] text-gray-400">score</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-400 text-xs font-medium">
                      ❌ No matching volunteers — consider broadening skills
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </PageWrapper>
    </div>
  );
}
