"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { SkeletonCard } from "../components/Skeleton";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function NGOPage() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
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
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((data) => {
        const onlyNgos = data.filter(
          (u) => u.role?.toLowerCase() === "ngo" || u.role === "NGO"
        );
        setNgos(onlyNgos);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  let filteredNgos = [...ngos];
  if (sortNearest && userLoc) {
    filteredNgos.sort((a, b) => {
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
              marginBottom: 40,
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
                Registered NGOs
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Active organizations coordinating response on SevaLink.
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

          {/* ── Content ── */}
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 28,
              }}
            >
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : ngos.length === 0 ? (
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
                NGO
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                No NGOs registered yet
              </p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Be the first to list your organization.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 28,
              }}
            >
              {filteredNgos.map((ngo, i) => (
                <div
                  key={ngo._id || i}
                  className="card card-hover-effect"
                  style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 0 }}
                >
                  {/* ── Card Header: Name + Verified Badge ── */}
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
                      }}
                    >
                      {ngo.ngoName || ngo.name || "Unnamed NGO"}
                    </h3>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#4ade80",
                        border: "1px solid rgba(74,222,128,0.35)",
                        padding: "3px 8px",
                        borderRadius: 6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Verified NGO
                    </span>
                  </div>

                  {/* ── Fields: key-value aligned rows ── */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                    {/* Email */}
                    {ngo.email && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                          }}
                        >
                          Email
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "right",
                          }}
                        >
                          {ngo.email}
                        </span>
                      </div>
                    )}

                    {/* Phone */}
                    {ngo.phone && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                          }}
                        >
                          Phone
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {ngo.phone}
                        </span>
                      </div>
                    )}

                    {/* Website — smart logic */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        Website
                      </span>
                      {ngo.website || ngo.ngoContact ? (
                        <a
                          href={
                            (ngo.website || ngo.ngoContact).startsWith("http")
                              ? (ngo.website || ngo.ngoContact)
                              : `https://${ngo.website || ngo.ngoContact}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12,
                            color: "#818cf8",
                            textDecoration: "none",
                            transition: "color 0.2s ease",
                          }}
                          onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
                          onMouseOut={(e) => (e.target.style.textDecoration = "none")}
                        >
                          Visit Website
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Not available</span>
                      )}
                    </div>

                    {/* Location */}
                    {ngo.address && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                          }}
                        >
                          Location
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "right",
                          }}
                        >
                          {ngo.address}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── CTA Button ── */}
                  <button
                    className="btn-primary"
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: 13,
                      marginTop: "auto",
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
                    }}
                  >
                    Connect with NGO
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </PageWrapper>
    </div>
  );
}
