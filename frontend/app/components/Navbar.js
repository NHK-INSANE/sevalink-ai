"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout } from "../utils/auth";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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

      toast.error(`🚨 EMERGENCY: ${data.message}`, {
        duration: 8000,
        position: "top-center",
        style: { background: "#dc2626", color: "#fff", fontWeight: "bold", borderRadius: "12px" },
      });
    });

    socket.on("connect-request", (data) => {
      const newNotif = { message: `${data.fromName} wants to connect!`, time: new Date() };
      setNotifications(prev => [newNotif, ...prev]);
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

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <h1 className="text-lg font-bold text-[var(--text)] tracking-tight">
            SevaLink AI
          </h1>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden lg:flex gap-8 text-sm font-medium text-[var(--muted)]">
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/problems",  label: "Problems" },
            { href: "/helper",    label: "Helpers" },
            { href: "/ngo",       label: "NGO" },
            { href: "/map",       label: "Map" },
            { href: "/ai-match",  label: "AI Match" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-[var(--text)] transition-colors ${
                pathname.includes(link.href) ? "text-[var(--text)] font-semibold" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                title="Toggle Theme"
              >
                <span className="dark:hidden">🌙</span>
                <span className="hidden dark:inline">☀️</span>
              </button>

              {/* Notification Button */}
              <div className="relative">
                <button 
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                  className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors relative"
                >
                  <span className="text-lg">🔔</span>
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-600 w-1.5 h-1.5 rounded-full" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-[var(--card)] shadow-xl rounded-xl p-4 border border-[var(--border)] animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Notifications</p>
                    {notifications.length === 0 ? (
                      <p className="text-[var(--muted)] text-sm py-4 text-center">No new notifications</p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {notifications.map((n, i) => (
                          <div key={i} className="text-sm border-b border-[var(--border)] pb-2 last:border-0 text-[var(--text)]">
                            {n.message}
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
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--card)] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-[10px]">
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                  <span className="text-sm font-medium text-[var(--text)] hidden sm:inline">{user.name || "User"}</span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-[var(--card)] shadow-xl rounded-xl border border-[var(--border)] overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <Link 
                      href="/profile" 
                      className="block px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--bg)] border-b border-[var(--border)]"
                      onClick={() => setProfileOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-semibold"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex gap-4 items-center">
              <Link href="/login" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors">Login</Link>
              <Link href="/register" className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shadow-indigo-500/10">Register</Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
