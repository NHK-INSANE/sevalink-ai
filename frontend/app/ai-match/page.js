"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers } from "../utils/api";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { Zap, Target, Users, AlertTriangle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

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
      const rawSkills = Array.isArray(h.skills) ? h.skills : (h.skills ? [h.skills] : []);
      const hSkills = rawSkills.map((s) => String(s).toLowerCase());
      if (h.skill) hSkills.push(String(h.skill).toLowerCase());
      const pCat = Array.isArray(problem.category)
        ? problem.category[0]
        : problem.category;
      const pReqSkill = Array.isArray(problem.requiredSkills)
        ? problem.requiredSkills[0]
        : problem.requiredSkill;
      const pSkill = String(pReqSkill || pCat || "").toLowerCase();
      if (pSkill && hSkills.includes(pSkill)) score += 50;
      score += urgencyBoost[String(problem.urgency || "").toLowerCase()] || 0;
      return { ...h, score: Math.round(score), distKm };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

const URGENCY_STYLE = {
  Critical: { bg: "rgba(239,68,68,0.1)",  color: "#ef4444", border: "rgba(239,68,68,0.25)" },
  High:     { bg: "rgba(249,115,22,0.1)", color: "#f97316", border: "rgba(249,115,22,0.25)" },
  Medium:   { bg: "rgba(234,179,8,0.1)",  color: "#eab308", border: "rgba(234,179,8,0.25)"  },
  Low:      { bg: "rgba(34,197,94,0.1)",  color: "#22c55e", border: "rgba(34,197,94,0.25)"  },
};

function ScoreBar({ score }) {
  const pct = Math.min(100, score);
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f97316" : "#6366f1";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
            transition: "width 0.8s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28, textAlign: "right" }}>
        {score}
      </span>
    </div>
  );
}

export default function AIMatchPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveEvent, setLiveEvent] = useState(null);
  const currentUser = getUser();

  const autoAssign = async (problemId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/ai/auto-assign/${problemId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`🤖 AI auto-assigned ${data.matched.length} responders!`);
        // Refresh matches
        fetchMatches();
      }
    } catch (err) {
      toast.error("Auto-assignment failed");
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const probs = await getProblems();
      const openProblems = probs.filter((p) => p.status === "Open");
      
      const matchedResults = await Promise.all(openProblems.map(async (p) => {
        const res = await fetch(`${API_BASE}/api/ai/match/users/${p._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const vols = await res.json();
        return { problem: p, volunteers: Array.isArray(vols) ? vols : [] };
      }));
      
      setMatches(matchedResults);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load AI matches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();

    const socket = io(API_BASE);
    socket.on("matched-volunteers", ({ problem, matched }) => {
      setMatches((prev) => {
        if (prev.find((m) => m.problem._id === problem._id)) return prev;
        return [{ problem, volunteers: matched }, ...prev];
      });
      setLiveEvent({ problem, matched });
      toast.success(`🎯 New match: "${problem.title}"`);
    });

    return () => socket.disconnect();
  }, []);

  const totalMatched = matches.filter((m) => m.volunteers.length > 0).length;
  const totalUnmatched = matches.filter((m) => m.volunteers.length === 0).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <Navbar />
      <PageWrapper>
        <main
          style={{
            maxWidth: "var(--content-max)",
            margin: "0 auto",
            padding: "0 var(--content-pad)",
            paddingTop: "calc(var(--navbar-height) + 48px)",
            paddingBottom: 80,
          }}
        >
          {/* ── Header ── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: "var(--primary-gradient)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
                  flexShrink: 0,
                }}
              >
                <Zap size={20} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: 32, marginBottom: 2 }}>AI Smart Match</h1>
                <p style={{ fontSize: 13 }}>
                  Real-time volunteer matching — scored on proximity, skills &amp; urgency
                </p>
              </div>
            </div>

            {/* Status badges */}
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px",
                  borderRadius: 20,
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  fontSize: 11, fontWeight: 700, color: "#818cf8",
                  letterSpacing: "0.04em",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "pulse 2s infinite" }} />
                LIVE MATCHING ENGINE
              </div>
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px",
                  borderRadius: 20,
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.2)",
                  fontSize: 11, fontWeight: 700, color: "#c084fc",
                }}
              >
                SCORING ALGORITHM v2
              </div>
            </div>
          </div>

          {/* ── Live Event Banner ── */}
          {liveEvent && (
            <div
              style={{
                marginBottom: 24,
                padding: "14px 18px",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Target size={18} color="#22c55e" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "#4ade80", fontSize: 13 }}>
                  New match detected in real-time!
                </div>
                <div style={{ fontSize: 12, color: "rgba(74,222,128,0.75)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  "{liveEvent.problem.title}" matched {liveEvent.matched.length} volunteer{liveEvent.matched.length > 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={() => setLiveEvent(null)}
                style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", padding: 4, fontSize: 16, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Stats Row ── */}
          {!loading && matches.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {[
                { label: "Total Problems",  value: matches.length,   color: "#818cf8", Icon: AlertTriangle },
                { label: "Fully Matched",   value: totalMatched,     color: "#4ade80", Icon: Target        },
                { label: "Need Helpers",    value: totalUnmatched,   color: "#f87171", Icon: Users         },
              ].map(({ label, value, color, Icon }) => (
                <div
                  key={label}
                  className="card"
                  style={{ padding: "20px 22px", textAlign: "center" }}
                >
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 12px",
                      border: `1px solid ${color}28`,
                    }}
                  >
                    <Icon size={17} color={color} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.02em" }}>
                    {value}
                  </div>
                  <div className="section-label" style={{ marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Content ── */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "64px 24px",
                textAlign: "center",
                border: "1px dashed rgba(255,255,255,0.08)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              }}
            >
              <div style={{ fontSize: 48 }}>🤖</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                No open problems to match
              </p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Submit a problem to trigger AI matching
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {matches.map(({ problem, volunteers: vols }, i) => {
                const urgencyStyle = URGENCY_STYLE[problem.urgency] || {};
                return (
                  <div
                    key={problem._id || i}
                    className="card"
                    style={{ padding: 24 }}
                  >
                    {/* Problem header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        marginBottom: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            marginBottom: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {problem.title}
                        </h2>
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {problem.description}
                        </p>
                      </div>
                      {problem.urgency && (
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            background: urgencyStyle.bg,
                            color: urgencyStyle.color,
                            border: `1px solid ${urgencyStyle.border}`,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {problem.urgency}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                      {problem.requiredSkill && (
                        <span
                          style={{
                            padding: "3px 10px", borderRadius: 6,
                            background: "rgba(168,85,247,0.08)",
                            border: "1px solid rgba(168,85,247,0.18)",
                            color: "#c084fc", fontSize: 10, fontWeight: 700,
                          }}
                        >
                          🛠 {problem.requiredSkill}
                        </span>
                      )}
                      {problem.category && (
                        <span
                          style={{
                            padding: "3px 10px", borderRadius: 6,
                            background: "rgba(99,102,241,0.08)",
                            border: "1px solid rgba(99,102,241,0.18)",
                            color: "#a5b4fc", fontSize: 10, fontWeight: 700,
                          }}
                        >
                          {Array.isArray(problem.category) ? problem.category[0] : problem.category}
                        </span>
                      )}
                    </div>

                    {/* Separator */}
                    <div style={{ borderTop: "1px solid var(--border)", marginBottom: 16 }} />

                    {/* Volunteers */}
                    {vols.length > 0 ? (
                      <div>
                        <div className="section-label" style={{ marginBottom: 12 }}>
                          Recommended Volunteers — {vols.length} matched
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {vols.map((matchObj, vi) => {
                            const v = matchObj.user;
                            const score = matchObj.score;
                            const isMe = v._id?.toString() === (currentUser?._id || currentUser?.id)?.toString();
                            const isTop = vi === 0;
                            return (
                              <div
                                key={v._id || vi}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: "10px 14px",
                                  borderRadius: 12,
                                  background: isTop
                                    ? "rgba(99,102,241,0.07)"
                                    : "rgba(255,255,255,0.02)",
                                  border: `1px solid ${isTop ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)"}`,
                                  transition: "all 0.2s ease",
                                }}
                              >
                                {/* Rank */}
                                <div
                                  style={{
                                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 11, fontWeight: 800,
                                    background: isTop ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.04)",
                                    color: isTop ? "white" : "var(--text-muted)",
                                    boxShadow: isTop ? "0 2px 8px rgba(245,158,11,0.3)" : "none",
                                  }}
                                >
                                  #{vi + 1}
                                </div>
                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {v.name || v.email}
                                    </span>
                                    {isMe && <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 700 }}>(You)</span>}
                                  </div>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                    {v.role} · {v.skills?.slice(0, 2).join(", ")}
                                  </div>
                                </div>
                                {/* Score */}
                                <div style={{ minWidth: 100 }}>
                                  <div style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>Match Score</div>
                                  <ScoreBar score={score} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => autoAssign(problem._id)}
                          className="w-full mt-4 py-3 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all"
                        >
                          ⚡ Execute AI Auto-Assignment
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "16px",
                          background: "rgba(239,68,68,0.05)",
                          border: "1px dashed rgba(239,68,68,0.2)",
                          borderRadius: 10,
                          textAlign: "center",
                          color: "#f87171",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        No volunteers matched nearby for this problem
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </PageWrapper>
    </div>
  );
}
