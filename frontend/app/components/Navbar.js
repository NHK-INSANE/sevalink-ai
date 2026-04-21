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
    
    // Check initial dark mode (minimal support, no toggle)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") || "light";
      document.documentElement.className = saved;
    }

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

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-50 px-6 flex justify-between items-center shadow-sm">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 group">
        <h1 className="text-xl font-bold text-blue-600 tracking-tight transition group-hover:scale-105">
          SevaLink AI
        </h1>
      </Link>

      {/* Main Nav (Minimalist Startup Style) */}
      <div className="hidden lg:flex gap-8 text-sm font-semibold text-gray-500">
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
            className={`hover:text-blue-600 transition flex items-center gap-1 ${
              pathname.includes(link.href) ? "text-blue-600 font-bold border-b-2 border-blue-600 pb-1" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            {/* Notification Dropdown */}
            <div className="relative">
              <button 
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition relative"
              >
                <span className="text-xl">🔔</span>
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-4 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Notifications</p>
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">No new notifications</p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {notifications.map((n, i) => (
                        <div key={i} className="text-sm border-b border-gray-50 dark:border-gray-700 pb-2 last:border-0">
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user.name || "User"}</span>
                <span className="text-[10px] opacity-40">▼</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <Link 
                    href="/profile" 
                    className="block px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700"
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
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-gray-600">Login</Link>
            <Link href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-600/20">Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
