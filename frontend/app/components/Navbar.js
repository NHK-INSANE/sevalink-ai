"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useContext, useRef } from "react";
import { getUser, logout } from "../utils/auth";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";
import { NotificationContext } from "../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Link2, MapPin } from "lucide-react";
import { useLocationTracker } from "../hooks/useLocationTracker";

export default function Navbar() {
  useLocationTracker(); // Persistent background tracking
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useContext(NotificationContext);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);

    // 🔥 Global Emergency Alerts
    const handleGlobalAlert = (alert) => {
      toast.error(alert.message, {
        duration: 10000,
        position: "top-center",
        style: {
          background: alert.type === "CRITICAL" ? "#dc2626" : "#f97316",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "14px",
          border: "2px solid #fff",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          minWidth: "300px"
        },
        icon: alert.type === "CRITICAL" ? "🚨" : "🆘",
      });

      // Play alert sound if critical
      if (alert.type === "CRITICAL" || alert.type === "SOS") {
        try {
          const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
          audio.play().catch(() => {});
        } catch (e) {}
      }
    };

    socket.on("global_alert", handleGlobalAlert);
    return () => socket.off("global_alert", handleGlobalAlert);
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
    { href: "/chat",      label: "Messages"  },
  ];

  const isAdmin = user?.role === "admin" || user?.role === "developer";
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
    {isOffline && (
      <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 z-[99999] shadow-lg">
        Offline Mode: Connection to Neural Link Lost. Retrying...
      </div>
    )}
    <header className="navbar">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* LEFT: Logo (Desktop) / Hamburger (Mobile) */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
            </svg>
          </button>
          
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-xs">SL</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white hidden sm:block">
              SEVALINK <span className="text-purple-500">AI</span>
            </span>
          </Link>
        </div>

        {/* CENTER: Navigation (Desktop Only) */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  isActive ? "text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT: Notifications & Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                  className="p-2 text-gray-400 hover:text-white transition-all relative"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full border-2 border-[#0b1220]" />
                  )}
                </button>
                
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[1000]"
                    >
                      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <span className="text-xs font-bold text-white uppercase tracking-widest">Notifications</span>
                        {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[10px] text-purple-400 font-bold uppercase">Mark all read</button>}
                      </div>
                      <div className="max-h-[350px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-500 text-xs font-medium">No new alerts.</div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n._id} onClick={() => markAsRead(n._id)} className={`p-4 border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors ${!n.isRead ? "bg-purple-500/5" : "opacity-60"}`}>
                              <p className="text-[12px] text-gray-200 leading-snug">{n.message}</p>
                              <span className="text-[9px] text-gray-500 mt-2 block font-bold">{new Date(n.createdAt).toLocaleTimeString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Menu */}
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                  className="w-9 h-9 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center hover:border-purple-500/50 transition-all overflow-hidden"
                >
                  <span className="text-xs font-bold text-gray-400">{user.name?.[0]?.toUpperCase()}</span>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-56 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-2 z-[1000]"
                    >
                      <div className="px-4 py-3 border-b border-white/5 mb-1">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Active User</p>
                        <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      </div>
                      <Link href="/profile" className="flex items-center px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">Profile Overview</Link>
                      <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/5 rounded-xl transition-all">Logout Terminal</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-xs font-bold text-gray-400 hover:text-white px-2">Login</Link>
              <Link href="/register" className="btn-primary !py-2 !px-4 !text-xs">Join Mission</Link>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0b1220] border-t border-white/5 overflow-hidden shadow-2xl"
          >
            <div className="p-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    pathname === link.href ? "bg-purple-600/10 text-purple-400" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center text-sm font-bold text-gray-400">Login</Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center text-sm font-bold text-white bg-purple-600 rounded-xl">Get Started</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </>
  );
}
