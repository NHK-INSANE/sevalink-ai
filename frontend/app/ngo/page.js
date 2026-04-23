"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { SkeletonCard } from "../components/Skeleton";
import { Globe, Phone, Mail, MapPin, Building2, CheckCircle } from "lucide-react";

export default function NGOPage() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);

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
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: "linear-gradient(135deg,#10b981,#059669)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
                  flexShrink: 0,
                }}
              >
                <Building2 size={20} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: 30, marginBottom: 4 }}>Registered NGOs</h1>
                <p style={{ fontSize: 13 }}>
                  Active organizations coordinating response on SevaLink.
                </p>
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 20,
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
              <Building2 size={48} color="var(--text-muted)" />
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
                gap: 20,
              }}
            >
              {ngos.map((ngo, i) => (
                <div key={ngo._id || i} className="card card-hover-effect" style={{ padding: 22 }}>
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                        background: "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.1))",
                        border: "1px solid rgba(16,185,129,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Building2 size={22} color="#4ade80" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: 4,
                        }}
                      >
                        {ngo.ngoName || ngo.name || "Unnamed NGO"}
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "#4ade80",
                          background: "rgba(34,197,94,0.08)",
                          border: "1px solid rgba(34,197,94,0.2)",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        <CheckCircle size={9} />
                        Verified NGO
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                    {ngo.email && (
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 12px", borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          fontSize: 12, color: "var(--text-secondary)",
                        }}
                      >
                        <Mail size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ngo.email}
                        </span>
                      </div>
                    )}
                    {ngo.phone && (
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 12px", borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          fontSize: 12, color: "var(--text-secondary)",
                        }}
                      >
                        <Phone size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                        <span>{ngo.phone}</span>
                      </div>
                    )}
                    {ngo.ngoContact && (
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 12px", borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          fontSize: 12,
                        }}
                      >
                        <Globe size={13} style={{ opacity: 0.5, flexShrink: 0, color: "#818cf8" }} />
                        <a
                          href={ngo.ngoContact.startsWith("http") ? ngo.ngoContact : `https://${ngo.ngoContact}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#818cf8",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            transition: "color 0.2s ease",
                          }}
                          className="hover:text-white"
                        >
                          {ngo.ngoContact}
                        </a>
                      </div>
                    )}
                    {ngo.address && (
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 12px", borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          fontSize: 12, color: "var(--text-secondary)",
                        }}
                      >
                        <MapPin size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                        <span
                          style={{
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {ngo.address}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    className="btn-primary"
                    style={{ width: "100%", padding: "10px 16px", fontSize: 13 }}
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
