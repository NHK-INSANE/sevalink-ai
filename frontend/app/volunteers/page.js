"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const ROLE_FILTERS = [
  { key: "all",       label: "All Helpers" },
  { key: "volunteer", label: "Volunteers"  },
  { key: "worker",    label: "Workers"     },
];

export default function VolunteersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("all");
  const [userLoc, setUserLoc] = useState(null);
  const [sortNearest, setSortNearest] = useState(false);

  const handleLocateAndSort = async () => {
    if (sortNearest) {
      setSortNearest(false);
      return;
    }
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortNearest(true);
      toast.success("Sorting by proximity");
    } catch (err) {
      toast.error("Could not get location");
    }
  };

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  useEffect(() => {
    getUsers()
      .then((data) => {
        const helpers = data.filter(
          (u) =>
            u.role?.toLowerCase() === "volunteer" ||
            u.role?.toLowerCase() === "worker"
        );
        setUsers(helpers);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  let filtered =
    filterRole === "all"
      ? users
      : users.filter((u) => u.role?.toLowerCase() === filterRole);

  if (sortNearest && userLoc) {
    filtered = [...filtered].sort((a, b) => {
      const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
      const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
      return d1 - d2;
    });
  }

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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              marginBottom: 36,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
              <div>
                <h1
                  style={{
                    background: "linear-gradient(135deg,#fff 25%,#a78bfa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginBottom: 8,
                  }}
                >
                  Helpers &amp; Volunteers
                </h1>
                <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  People actively resolving civic issues across the SevaLink network.
                </p>
              </div>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleLocateAndSort}
                className="btn-secondary"
                style={{ fontSize: 12, padding: "8px 24px" }}
              >
                📍 {sortNearest ? "Reset Sort" : "Sort by Nearest"}
              </motion.button>
            </div>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: 6 }}>
              {ROLE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterRole(key)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: filterRole === key
                      ? "1px solid rgba(99,102,241,0.5)"
                      : "1px solid var(--glass-border)",
                    background: filterRole === key
                      ? "rgba(99,102,241,0.15)"
                      : "rgba(255,255,255,0.03)",
                    color: filterRole === key ? "white" : "var(--text-secondary)",
                    transition: "all 0.2s ease",
                    boxShadow: filterRole === key
                      ? "0 2px 8px rgba(99,102,241,0.2)"
                      : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 160, borderRadius: 16 }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "64px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                border: "1px dashed rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontSize: 48 }}>🤝</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                No helpers registered yet
              </p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Be the first to join as a volunteer
              </p>
              <a
                href="/register"
                className="btn-primary"
                style={{ marginTop: 12, padding: "10px 24px", fontSize: 13 }}
              >
                Register as Volunteer →
              </a>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {filtered.map((u, i) => {
                const isVol = u.role?.toLowerCase() === "volunteer";
                const skills = Array.from(
                  new Set([...(u.skills || []), u.skill].filter(Boolean))
                );
                return (
                  <div
                    key={u._id || i}
                    className="card card-hover-effect"
                    style={{ padding: 20, cursor: "default" }}
                  >
                    {/* Avatar + Name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          background: isVol
                            ? "linear-gradient(135deg,#10b981,#059669)"
                            : "linear-gradient(135deg,#6366f1,#4f46e5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          boxShadow: isVol
                            ? "0 4px 12px rgba(16,185,129,0.3)"
                            : "0 4px 12px rgba(99,102,241,0.3)",
                          flexShrink: 0,
                        }}
                      >
                        {isVol ? "🤝" : "🔧"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {u.name || "Unnamed Helper"}
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 3,
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: isVol
                              ? "rgba(16,185,129,0.1)"
                              : "rgba(99,102,241,0.1)",
                            color: isVol ? "#4ade80" : "#a5b4fc",
                            border: `1px solid ${isVol ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.2)"}`,
                          }}
                        >
                          {isVol ? "Volunteer" : "Worker"}
                        </span>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                      {u.email && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "rgba(255,255,255,0.03)",
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span style={{ opacity: 0.6 }}>✉</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {u.email}
                          </span>
                        </div>
                      )}
                      {u.phone && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "rgba(255,255,255,0.03)",
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span style={{ opacity: 0.6 }}>📞</span>
                          <span>{u.phone}</span>
                        </div>
                      )}
                      {u.address && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "rgba(255,255,255,0.03)",
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span style={{ opacity: 0.6 }}>📍</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {u.address}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div
                        style={{
                          paddingTop: 12,
                          borderTop: "1px solid var(--border)",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {skills.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            style={{
                              padding: "3px 10px",
                              borderRadius: 6,
                              background: "rgba(99,102,241,0.08)",
                              border: "1px solid rgba(99,102,241,0.18)",
                              color: "#a5b4fc",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            {s}
                          </span>
                        ))}
                        {skills.length > 4 && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)", padding: "3px 4px" }}>
                            +{skills.length - 4}
                          </span>
                        )}
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
