"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useContext } from "react";
import { getUser, logout } from "../utils/auth";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";
import { NotificationContext } from "../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Link2, MapPin } from "lucide-react";

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

    return () => {
      socket.off("sos-alert");
    };
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
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md">
              <Link2 size={16} className="text-white" />
              <MapPin size={14} className="text-white -ml-1" />
            </div>
            <span className="text-lg font-semibold tracking-wide text-white">
              SEVALINK <span className="text-purple-400">AI</span>
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
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                    className="relative p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-72 bg-[#0f172a] border border-white/10 rounded-xl shadow-xl p-4 z-50 overflow-hidden"
                      >
                        <p className="text-sm text-gray-400 mb-3 font-semibold">Notifications</p>
                        
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {notifications.length === 0 ? (
                            <p className="text-xs text-gray-500 py-4 text-center">No active alerts</p>
                          ) : (
                            notifications.map((n) => (
                              <div 
                                key={n._id} 
                                onClick={() => markAsRead(n._id)}
                                className={`p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors ${!n.isRead ? "border-l-2 border-purple-500" : "opacity-60"}`}
                              >
                                <p className="text-[12px] text-gray-200 leading-tight mb-1">{n.message}</p>
                                <p className="text-[9px] text-gray-500 font-bold uppercase">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="w-full mt-3 pt-3 border-t border-white/5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest text-center">Mark all as read</button>
                        )}
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
