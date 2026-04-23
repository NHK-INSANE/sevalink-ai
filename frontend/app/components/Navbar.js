"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useContext } from "react";
import { getUser, logout } from "../utils/auth";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { MapPin, Link2, Bell, ChevronDown, Menu, X } from "lucide-react";
import { NotificationContext } from "../context/NotificationContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  let notifs = [];
  let addNotif = () => {};
  try {
    const context = useContext(NotificationContext);
    if (context) {
      notifs = context.notifications || [];
      addNotif = context.addNotification || (() => {});
    }
  } catch (e) {}

  const notifications = notifs;
  const addNotification = addNotif;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const close = () => { setNotifOpen(false); setProfileOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);

    const socket = io(API_BASE);
    if (currentUser) {
      socket.emit("register-user", currentUser._id || currentUser.id);
    }

    socket.on("sos-alert", (data) => {
      try {
        const audio = new Audio("https://www.soundjay.com/buttons/beep-07a.mp3");
        audio.play().catch(() => {});
      } catch (err) {}

      let isNearby = false;
      if (navigator.geolocation && data.latitude && data.longitude) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const R = 6371;
          const dLat = (data.latitude - pos.coords.latitude) * (Math.PI / 180);
          const dLon = (data.longitude - pos.coords.longitude) * (Math.PI / 180);
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(pos.coords.latitude * Math.PI / 180) *
            Math.cos(data.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          if (dist < 5) {
            isNearby = true;
            toast.error(`🚨 SOS NEAR YOU! (${dist.toFixed(1)}km away)`, {
              duration: 15000,
              style: { background: "#dc2626", color: "#fff", fontWeight: "bold" },
            });
            addNotification(`🚨 URGENT: SOS near you! (${dist.toFixed(1)}km away)`);
          }
        });
      }

      setTimeout(() => {
        if (!isNearby) {
          toast.error(`🚨 EMERGENCY: ${data.message}`, {
            duration: 8000,
            position: "top-center",
            style: { background: "#dc2626", color: "#fff", fontWeight: "bold", borderRadius: "12px" },
          });
          addNotification(`🚨 SOS EMERGENCY: ${data.message}`);
        }
      }, 500);
    });

    socket.on("connect-request", (data) => {
      addNotification(`${data.fromName} wants to connect!`);
      toast(`🤝 ${data.fromName} wants to connect!`, {
        icon: "💬",
        style: { borderRadius: "12px", background: "#1e293b", color: "#fff" },
      });
    });

    return () => socket.disconnect();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/problems",  label: "Problems"  },
    { href: "/volunteers", label: "Helpers"  },
    { href: "/ngo",       label: "NGOs"      },
    { href: "/map",       label: "Map"       },
    { href: "/ai-match",  label: "AI Match"  },
  ];

  return (
    <header
      className="navbar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: scrolled
          ? "rgba(8, 12, 26, 0.92)"
          : "rgba(8, 12, 26, 0.75)",
        boxShadow: scrolled ? "0 1px 0 rgba(255,255,255,0.06)" : "none",
        transition: "background 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      <div
        style={{
          maxWidth: "var(--content-max)",
          margin: "0 auto",
          padding: "0 var(--content-pad)",
          height: "var(--navbar-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        {/* ── Brand ── */}
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}
          className="group"
        >
          <div style={{ display: "flex", gap: "-4px" }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
                transition: "transform 0.2s ease",
              }}
              className="group-hover:scale-110"
            >
              <MapPin size={15} />
            </div>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, #a855f7, #9333ea)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", boxShadow: "0 4px 12px rgba(168,85,247,0.35)",
                marginLeft: -6,
                transition: "transform 0.2s ease",
              }}
              className="group-hover:scale-110"
              style2={{ transitionDelay: "50ms" }}
            >
              <Link2 size={15} />
            </div>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Seva<span style={{ color: "#818cf8" }}>Link</span>{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 14 }}>
              AI
            </span>
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        <nav
          style={{
            display: "flex",
            gap: "4px",
            alignItems: "center",
          }}
          className="hidden lg:flex"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive ? "white" : "var(--text-secondary)",
                  background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
                className={`nav-link ${isActive ? "active" : ""} hover:text-white hover:bg-white/5`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right Actions ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {user ? (
            <>
              {/* Notification */}
              <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); setMobileMenuOpen(false); }}
                  style={{
                    width: 36, height: 36,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--glass-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s ease",
                  }}
                  className="hover:bg-white/8 hover:text-white"
                >
                  <Bell size={15} />
                  {notifications.length > 0 && (
                    <span
                      style={{
                        position: "absolute", top: 6, right: 6,
                        width: 7, height: 7, borderRadius: "50%",
                        background: "#ef4444",
                        border: "1px solid var(--bg-main)",
                        boxShadow: "0 0 6px rgba(239,68,68,0.6)",
                      }}
                    />
                  )}
                </button>

                {notifOpen && (
                  <div
                    style={{
                      position: "absolute", right: 0, top: "calc(100% + 10px)",
                      width: 300,
                      background: "rgba(10, 16, 32, 0.95)",
                      backdropFilter: "blur(24px)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 16,
                      padding: 16,
                      boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
                      zIndex: "var(--z-modal)",
                    }}
                  >
                    <p className="section-label" style={{ marginBottom: 12 }}>Notifications</p>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>
                        All clear — no new alerts
                      </p>
                    ) : (
                      <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                        {notifications.map((n, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: 12,
                              color: "var(--text-primary)",
                              padding: "8px 0",
                              borderBottom: "1px solid var(--border)",
                              lineHeight: 1.5,
                            }}
                          >
                            {n.text || n.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile */}
              <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); setMobileMenuOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px 6px 6px",
                    borderRadius: 10,
                    border: "1px solid var(--glass-border)",
                    background: "rgba(255,255,255,0.04)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  className="hover:bg-white/8"
                >
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: "var(--primary-gradient)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "white",
                      boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
                    }}
                  >
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }} className="hidden sm:block">
                    {user.name?.split(" ")[0] || "User"}
                  </span>
                  <ChevronDown size={12} style={{ color: "var(--text-muted)" }} className="hidden sm:block" />
                </button>

                {profileOpen && (
                  <div
                    style={{
                      position: "absolute", right: 0, top: "calc(100% + 10px)",
                      width: 180,
                      background: "rgba(10, 16, 32, 0.95)",
                      backdropFilter: "blur(24px)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 14,
                      overflow: "hidden",
                      boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
                      zIndex: "var(--z-modal)",
                    }}
                  >
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      style={{
                        display: "block", padding: "12px 16px",
                        fontSize: 13, color: "var(--text-primary)",
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.2s ease",
                      }}
                      className="hover:bg-white/5"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "12px 16px",
                        fontSize: 13, color: "#f87171",
                        fontWeight: 600, cursor: "pointer",
                        background: "none", border: "none",
                        transition: "background 0.2s ease",
                      }}
                      className="hover:bg-red-500/10"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/login"
                style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", padding: "6px 12px", transition: "color 0.2s" }}
                className="hover:text-white"
              >
                Login
              </Link>
              <Link href="/register" className="btn-primary" style={{ fontSize: 13, padding: "8px 16px" }}>
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setNotifOpen(false); setProfileOpen(false); }}
            style={{
              width: 36, height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--glass-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-secondary)", cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            className="lg:hidden hover:bg-white/8 hover:text-white"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileMenuOpen && (
        <div
          style={{
            background: "rgba(8, 14, 28, 0.97)",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid var(--border)",
            padding: "12px var(--content-pad) 20px",
          }}
          className="lg:hidden"
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 500,
                    color: isActive ? "white" : "var(--text-secondary)",
                    background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                    transition: "all 0.2s ease",
                  }}
                  className="hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
