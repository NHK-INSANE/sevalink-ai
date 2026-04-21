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
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    
    // Check initial dark mode
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") || "light";
      document.documentElement.className = saved;
      setIsDarkMode(saved === "dark");
    }

    // 🚨 Critical SOS & Social Listeners
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
      setNotifications(prev => [...prev, data]);
      toast(`🤝 ${data.fromName} wants to connect!`, {
        icon: "💬",
        style: { borderRadius: "12px", background: "#333", color: "#fff" },
      });
    });

    return () => socket.disconnect();
  }, []);

  const toggleTheme = () => {
    const current = document.documentElement.className;
    const newTheme = current.includes("dark") ? "light" : "dark";
    
    document.documentElement.className = newTheme;
    setIsDarkMode(newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-100 z-[100] px-6 py-3 flex justify-between items-center shadow-sm">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 group">
        <h1 className="text-xl font-bold text-blue-600 tracking-tight transition group-hover:scale-105">
          SevaLink AI
        </h1>
      </Link>

      {/* Main Nav (Minimalist Startup Style) */}
      <div className="hidden md:flex gap-8 text-sm font-semibold text-gray-500">
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
              pathname.includes(link.href) ? "text-blue-600 font-bold" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-6">
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition duration-200"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>

        {user && (
          <div className="relative cursor-pointer" title="Notifications">
             <span className="text-xl">🔔</span>
             {notifications.length > 0 && (
               <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold animate-bounce">
                 {notifications.length}
               </span>
             )}
          </div>
        )}

        {user ? (
          <div className="flex items-center gap-4">
            <Link 
              href="/profile"
              className="hidden sm:flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 font-semibold hover:text-blue-600 transition px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <span>👤</span>
              {user.name || user.email?.split("@")[0]}
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition uppercase tracking-wider"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link href="/login" className="text-sm font-semibold text-gray-600">Login</Link>
            <Link href="/register" className="text-sm font-semibold text-blue-600">Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
