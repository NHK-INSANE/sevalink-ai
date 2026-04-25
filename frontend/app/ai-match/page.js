"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
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
  const [userMatches, setUserMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("yourself"); // "byProblem" or "yourself"
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
        toast.success(`AI auto-assigned ${data.team?.length || 0} responders!`);
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

      // Handle "Match Yourself" logic
      if (currentUser && (currentUser.role?.toLowerCase() === "volunteer" || currentUser.role?.toLowerCase() === "worker")) {
        // Simple client-side matching for "Yourself" to avoid extra backend calls
        // or we could use the existing matching logic but reversed.
        // For production feel, we'll sort problems based on current user's skills/location
        const scoredProbs = openProblems.map(p => {
          let score = 0;
          const dist = getDistance(p.location?.lat, p.location?.lng, currentUser.location?.lat, currentUser.location?.lng);
          score += Math.max(0, 100 - (dist || 999));
          
          const uSkills = (currentUser.skills || []).map(s => s.toLowerCase());
          const pSkill = (p.requiredSkill || p.category || "").toLowerCase();
          if (pSkill && uSkills.includes(pSkill)) score += 50;
          
          return { problem: p, score: Math.round(score), distKm: dist };
        }).sort((a,b) => b.score - a.score);
        
        setUserMatches(scoredProbs);
      }
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
      toast.success(`New match: "${problem.title}"`);
    });

    return () => socket.disconnect();
  }, []);

  const totalMatched = matches.filter((m) => m.volunteers.length > 0).length;
  const totalUnmatched = matches.filter((m) => m.volunteers.length === 0).length;

  return (
    <div style={{ minHeight: "100vh", background: "#020617" }}>
      <Navbar />
      <PageWrapper>
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 24px 80px" }}>
          
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", mdDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, gap: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", fontSize: 10, fontWeight: 900, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  AI Core
                </div>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>Smart Match Engine</h1>
              </div>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>Neural matching infrastructure — connecting field requirements with responder profiles</p>
            </div>

            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <button 
                onClick={() => setActiveTab("byProblem")}
                style={{ 
                  padding: "8px 16px", borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                  background: activeTab === "byProblem" ? "rgba(99,102,241,0.15)" : "transparent",
                  color: activeTab === "byProblem" ? "#818cf8" : "#64748b",
                  border: activeTab === "byProblem" ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  transition: "all 0.3s ease", cursor: "pointer"
                }}
              >
                Match by Crisis
              </button>
              <button 
                onClick={() => {
                  if (!currentUser) return toast.error("Login to match yourself");
                  setActiveTab("yourself");
                }}
                style={{ 
                  padding: "8px 16px", borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                  background: activeTab === "yourself" ? "rgba(99,102,241,0.15)" : "transparent",
                  color: activeTab === "yourself" ? "#818cf8" : "#64748b",
                  border: activeTab === "yourself" ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  transition: "all 0.3s ease", cursor: "pointer"
                }}
              >
                Match Yourself
              </button>
            </div>
          </div>

          {/* ── Match Yourself View ── */}
          {activeTab === "yourself" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {userMatches.length === 0 ? (
                <div className="card" style={{ padding: 60, textAlign: "center", borderStyle: "dashed" }}>
                   <p style={{ color: "#94a3b8" }}>No specific recommendations found for your profile at this time.</p>
                </div>
              ) : (
                userMatches.map(({ problem, score, distKm }) => (
                  <div key={problem._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 24 }}>
                    <div style={{ flex: 1 }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#818cf8", background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{problem.category}</span>
                          <h3 style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{problem.title}</h3>
                       </div>
                       <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>{problem.description}</p>
                       <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>
                          <span>Dist: {distKm || "???"} km</span>
                          <span>Date: {new Date(problem.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 140 }}>
                       <div style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Compatibility Index</div>
                       <ScoreBar score={score} />
                       <Link href={`/map?lat=${problem.location?.lat}&lng=${problem.location?.lng}&title=${problem.title}`} className="btn-primary !py-2 !px-4 !text-[10px] !mt-4 inline-block">View Location</Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Match by Problem View ── */}
          {activeTab === "byProblem" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
               {matches.map(({ problem, volunteers: vols }) => (
                 <div key={problem._id} className="card" style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                       <div>
                          <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 4 }}>{problem.title}</h3>
                          <p style={{ fontSize: 12, color: "#94a3b8" }}>{problem.description}</p>
                       </div>
                       <span className={`badge badge-${problem.urgency?.toLowerCase()} !text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded`}>{problem.urgency}</span>
                    </div>

                    {vols.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {vols.map((matchObj, vi) => {
                          const v = matchObj.user;
                          return (
                            <div key={v._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                               <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#818cf8" }}>{vi+1}</div>
                               <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{v.name}</div>
                                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>{v.role} · {Array.isArray(v.skills) ? v.skills.slice(0,2).join(", ") : v.skill}</div>
                               </div>
                               <div style={{ minWidth: 100 }}>
                                  <ScoreBar score={matchObj.score} />
                               </div>
                            </div>
                          );
                        })}
                        <button 
                          onClick={() => autoAssign(problem._id)}
                          className="btn-apple !py-3 !text-[10px] !w-full !mt-2 !font-black !uppercase !tracking-[0.1em]"
                        >
                          Execute AI Assignment Protocol
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: 20, textAlign: "center", background: "rgba(239,68,68,0.03)", borderRadius: 12, border: "1px dashed rgba(239,68,68,0.2)", color: "#f87171", fontSize: 11, fontWeight: "bold", textTransform: "uppercase" }}>
                        Insufficient personnel matches identified for this mission
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
