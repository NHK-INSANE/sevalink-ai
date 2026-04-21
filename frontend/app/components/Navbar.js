"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout, getRoleLabel } from "../utils/auth";

const navLinks = [
  { href: "/", label: "Dashboard", icon: "⚡" },
  { href: "/problems", label: "All Problems", icon: "📋" },
  { href: "/helper", label: "Helper", icon: "🤝" },
  { href: "/ngo", label: "NGO", icon: "🏢" },
  { href: "/map", label: "Map", icon: "🗺️" },
  { href: "/ai-match", label: "AI Match", icon: "🤖" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]); // re-check on route change

  const handleLogout = () => {
    logout();
    setUser(null);
    setMenuOpen(false);
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 navbar-solid">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg btn-primary flex items-center justify-center text-sm font-bold text-white">
            S
          </div>
          <span className="font-bold text-lg tracking-tight">
            Seva<span className="text-indigo-400">Link</span>{" "}
            <span className="text-purple-400 text-sm font-medium">AI</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-indigo-600/10 text-indigo-600 border border-indigo-500/20"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
                  }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Live
          </div>


          {/* Auth */}
          {user ? (
            <div className="relative">
              <button
                id="user-menu-btn"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-slate-200 hover:border-indigo-500/30 transition-all text-sm"
              >
                <span className="text-base">{user.role === "NGO" ? "🏢" : user.role === "Volunteer" ? "🤝" : user.role === "Worker" ? "🔧" : "👤"}</span>
                <span className="text-slate-700 font-medium max-w-[100px] truncate">
                  {user.name || user.email?.split("@")[0]}
                </span>
                <span className="text-slate-500 text-xs">▾</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 glass rounded-xl border border-slate-200 shadow-xl py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100 space-y-1">
                    <div className="text-sm font-bold text-slate-800 truncate uppercase">{user.name || "User"}</div>
                    <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    
                    <hr className="my-2 border-slate-100" />
                    
                    <div className="text-xs text-indigo-400 font-medium pb-1">{getRoleLabel(user.role)}</div>

                    {user.phone && <div className="text-xs text-slate-600 mt-0.5">📞 {user.phone}</div>}
                    {user.address && <div className="text-xs text-slate-600 mt-0.5">📍 {user.address}</div>}

                    {(user.skill || user.ngoName || (user.skills && user.skills.length > 0)) && <hr className="my-2 border-slate-100" />}

                    {user.skill && <div className="text-xs text-slate-600 mt-0.5">🛠 Skill: {user.skill}</div>}
                    {user.skills && user.skills.length > 0 && !user.skill && <div className="text-xs text-slate-600 mt-0.5">🛠 Skills: {user.skills.join(", ")}</div>}
                    {user.ngoName && <div className="text-xs text-slate-600 mt-0.5">🏢 NGO: {user.ngoName}</div>}
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    👤 My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    🚪 Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn-primary px-3 py-1.5 rounded-lg text-white text-sm font-medium"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
