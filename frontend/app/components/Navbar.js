"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout } from "../utils/auth";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { MapPin, Link2 } from "lucide-react";

import { NotificationContext } from "../context/NotificationContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use global context but handle SSR gracefully
  let notifs = [];
  let addNotif = () => {};
  try {
    const context = require("react").useContext(NotificationContext);
    if (context) {
      notifs = context.notifications || [];
      addNotif = context.addNotification || (() => {});
    }
  } catch (e) {}

  const notifications = notifs;
  const addNotification = addNotif;

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    
    // Theme Management
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.classList.toggle("dark", saved === "dark");

    const socket = io(API_BASE);

    if (currentUser) {
      socket.emit("register-user", currentUser._id || currentUser.id);
    }

    socket.on("sos-alert", (data) => {
      try {
        const audio = new Audio("https://www.soundjay.com/buttons/beep-07a.mp3");
        audio.play().catch(() => {});
      } catch (err) {}

      // Default alert
      let isNearby = false;
      if (navigator.geolocation && data.latitude && data.longitude) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const lat1 = pos.coords.latitude;
          const lon1 = pos.coords.longitude;
          const lat2 = data.latitude;
          const lon2 = data.longitude;
          const R = 6371; 
          const dLat = (lat2 - lat1) * (Math.PI / 180);
          const dLon = (lon2 - lon1) * (Math.PI / 180);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          
          if (dist < 5) {
            isNearby = true;
            toast.error("🚨 SOS IS NEAR YOU! Immediate help needed!", { duration: 15000, style: { background: "#dc2626", color: "#fff", fontWeight: "bold" } });
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
      }, 500); // slight delay to allow geo check
    });

    socket.on("connect-request", (data) => {
      addNotification(`${data.fromName} wants to connect!`);
      toast(`🤝 ${data.fromName} wants to connect!`, {
        icon: "💬",
        style: { borderRadius: "12px", background: "#333", color: "#fff" },
      });
    });

    return () => socket.disconnect();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/problems",  label: "Problems" },
    { href: "/volunteers", label: "Helpers" },
    { href: "/ngo",       label: "NGO" },
    { href: "/map",       label: "Map" },
    { href: "/ai-match",  label: "AI Match" },
  ];

  return (
    <header className="navbar sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <MapPin size={18} />
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform delay-75">
              <Link2 size={18} />
            </div>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Seva<span className="text-indigo-500">Link</span> AI
          </h1>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex gap-8 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link hover:text-white transition-colors ${
                pathname.includes(link.href) ? "active" : "text-[var(--text-secondary)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              {/* Notification Button */}
              <div className="relative">
                <button 
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); setMobileMenuOpen(false); }}
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors relative"
                >
                  <span className="text-lg">🔔</span>
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-600 w-1.5 h-1.5 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-80 card shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Notifications</p>
                    {notifications.length === 0 ? (
                      <p className="text-[var(--text-secondary)] text-sm py-8 text-center">No new notifications</p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {notifications.map((n, i) => (
                          <div key={i} className="text-xs border-b border-[var(--border)] pb-3 last:border-0 text-[var(--text-primary)] leading-relaxed">
                            {n.text || n.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-white/5 transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-bold text-[10px] shadow-lg shadow-indigo-500/20">
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] hidden sm:block">{user.name || "User"}</span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-48 card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-0">
                    <Link 
                      href="/profile" 
                      className="block px-4 py-4 text-sm text-[var(--text-primary)] hover:bg-white/5 border-b border-[var(--border)]"
                      onClick={() => setProfileOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-4 text-sm hover:bg-red-500/10 text-red-500 font-semibold"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex gap-4 items-center">
              <Link href="/login" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors">Login</Link>
              <Link href="/register" className="btn-primary">Register</Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setNotifOpen(false); setProfileOpen(false); }}
            className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[var(--bg-card)] border-b border-[var(--border)] animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col p-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-4 rounded-xl text-sm font-medium transition-colors ${
                  pathname.includes(link.href) 
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]" 
                    : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
