"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useContext } from "react";
import { getUser, logout } from "../utils/auth";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { NotificationContext } from "../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useContext(NotificationContext);

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

    // SOS Alerts are global, keep them in Navbar for now but they could move to context too
    const socket = io(API_BASE);
    socket.on("sos-alert", (data) => {
      try {
        const audio = new Audio("https://www.soundjay.com/buttons/beep-07a.mp3");
        audio.play().catch(() => {});
      } catch (err) {}

      toast.error(`SOS: ${data.message}`, {
        duration: 8000,
        position: "top-center",
        style: { background: "#dc2626", color: "#fff", fontWeight: "bold", borderRadius: "12px" },
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
        background: scrolled ? "rgba(8, 12, 26, 0.95)" : "rgba(8, 12, 26, 0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        transition: "all 0.3s ease",
      }}
    >
      <div className="navbar-grid">
        
        {/* nav-left: Brand */}
        <div className="nav-left">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-extrabold text-xl tracking-tighter text-white">
              SEVALINK <span className="text-indigo-400 font-black text-xs ml-1 uppercase tracking-widest">AI</span>
            </span>
          </Link>
        </div>

        {/* nav-center: Desktop Nav */}
        <div className="nav-center hidden lg:flex">
          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* nav-right: Actions */}
        <div className="nav-right">
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                    className="px-3 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all relative text-[10px] font-bold uppercase tracking-widest"
                  >
                    ALERTS
                    {unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[8px] rounded-md animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 bg-[#0B1220] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[10000]"
                      >
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notifications</span>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Mark all as read</button>
                          )}
                        </div>
                        
                        <div className="max-h-[320px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="py-12 text-center flex flex-col items-center gap-2">
                              <p className="text-xs text-gray-500 font-black uppercase tracking-widest">No Active Alerts</p>
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div 
                                key={n._id} 
                                onClick={() => markAsRead(n._id)}
                                className={`p-4 border-b border-white/5 last:border-0 cursor-pointer transition-colors ${!n.isRead ? "bg-indigo-500/[0.03]" : "opacity-60"} hover:bg-white/5`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.isRead ? "bg-indigo-500" : "bg-gray-700"}`} />
                                  <div className="space-y-1">
                                    <p className="text-[12px] text-gray-200 leading-relaxed font-medium">{n.message}</p>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">
                                      {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                    className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="text-[10px] font-bold text-gray-200 uppercase tracking-widest hidden sm:block">{user.name?.split(" ")[0] || "User"}</span>
                  </motion.button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-48 bg-[#0B1220] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[10000]"
                      >
                        <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-all border-b border-white/5">
                          My Profile
                        </Link>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all">
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-xs font-bold text-gray-400 hover:text-white px-4">Login</Link>
                <Link href="/register" className="btn-primary !text-[11px] !px-5 !py-2 !rounded-xl shadow-indigo-500/20">Register</Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="lg:hidden px-3 h-10 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest"
            >
              {mobileMenuOpen ? "CLOSE" : "MENU"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed top-[var(--navbar-height)] left-0 w-full bg-[#080c1a]/95 backdrop-blur-xl border-b border-white/10 z-[999]"
          >
            <div className="px-6 py-8 flex flex-col gap-4">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-lg font-bold transition-all ${
                      isActive ? "text-indigo-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {!user && (
                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 text-gray-400 font-bold">Login</Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="btn-primary py-3 rounded-xl">Get Started</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
