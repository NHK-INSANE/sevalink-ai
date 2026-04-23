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
    const R = 6371;
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
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  marginBottom: 6,
                  letterSpacing: "-0.02em",
                }}
              >
                Helpers &amp; Volunteers
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                People actively resolving civic issues across the SevaLink network.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLocateAndSort}
              className="btn-secondary"
              style={{ fontSize: 12, padding: "8px 24px" }}
            >
              {sortNearest ? "Reset Sort" : "Sort by Nearest"}
            </motion.button>
          </div>

          {/* ── Filter Pills ── */}
          <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
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
                  boxShadow: filterRole === key ? "0 2px 8px rgba(99,102,241,0.2)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 28,
              }}
            >
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 200, borderRadius: 16 }}
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
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-muted)" }}>
                No Helpers
              </div>
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
                gap: 28,
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
                    style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 0 }}
                  >
                    {/* ── Card Header: Name + Role Badge ── */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 20,
                        paddingBottom: 16,
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          lineHeight: 1.3,
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {u.name || "Unnamed Helper"}
                      </h3>
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: isVol ? "#4ade80" : "#a5b4fc",
                          border: `1px solid ${isVol ? "rgba(74,222,128,0.35)" : "rgba(165,180,252,0.35)"}`,
                          padding: "3px 8px",
                          borderRadius: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isVol ? "Volunteer" : "Worker"}
                      </span>
                    </div>

                    {/* ── Fields: key-value aligned rows ── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                      {u.email && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", flexShrink: 0 }}>
                            Email
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                            {u.email}
                          </span>
                        </div>
                      )}

                      {u.phone && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", flexShrink: 0 }}>
                            Phone
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                            {u.phone}
                          </span>
                        </div>
                      )}

                      {u.address && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", flexShrink: 0 }}>
                            Location
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                            {u.address}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── Skills (if any) ── */}
                    {skills.length > 0 && (
                      <div
                        style={{
                          paddingTop: 12,
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginBottom: 16,
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

                    {/* ── CTA Button ── */}
                    <button
                      className="btn-primary"
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: 13,
                        marginTop: "auto",
                        background: isVol
                          ? "linear-gradient(135deg, #059669, #10b981)"
                          : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        boxShadow: isVol
                          ? "0 4px 14px rgba(16,185,129,0.25)"
                          : "0 4px 14px rgba(99,102,241,0.25)",
                      }}
                    >
                      Connect
                    </button>
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
