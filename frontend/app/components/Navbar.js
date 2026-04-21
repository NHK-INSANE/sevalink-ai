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

  useEffect(() => {
    setUser(getUser());

    // 🚨 Critical SOS Listener (Preserved "Core" logic)
    const socket = io(API_BASE);
    socket.on("sos-alert", (data) => {
      try {
        const audio = new Audio("https://www.soundjay.com/buttons/beep-07a.mp3");
        audio.play().catch(() => {});
      } catch (err) {}

      toast.error(`🚨 SOS ALERT: ${data.message}`, {
        duration: 10000,
        position: "top-center",
        style: { background: "#dc2626", color: "#fff", fontWeight: "bold" },
      });
    });
    return () => socket.disconnect();
  }, []);

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
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`hover:text-blue-600 transition ${
              pathname.includes(link.href) ? "text-blue-600" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-6">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-gray-600 font-medium border-r border-gray-100 pr-4">
              {user.name || user.email?.split("@")[0]}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-500 hover:text-red-600 transition uppercase tracking-wider"
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
