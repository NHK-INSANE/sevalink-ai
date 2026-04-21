"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout, getRoleLabel } from "../utils/auth";
import { apiRequest } from "../utils/api";

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
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const loggedUser = getUser();
    setUser(loggedUser);
    
    if (loggedUser) {
      const fetchNotifs = async () => {
        try {
          const res = await apiRequest(`/api/users/${loggedUser.id || loggedUser._id}/notifications`);
          setNotifications(res || []);
        } catch (err) {
          console.error("Failed to fetch notifications");
        }
      };
      fetchNotifs();
      
      // Auto-refresh notifications every 30s
      const int = setInterval(fetchNotifs, 30000);
      return () => clearInterval(int);
    }
  }, [pathname]); // re-check on route change

  const handleLogout = () => {
    logout();
    setUser(null);
    setMenuOpen(false);
    setShowNotifs(false);
    router.push("/login");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markNotifsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      await apiRequest(`/api/users/${user.id || user._id}/notifications/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      // Ignored
    }
  };

  const toggleNotifs = () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) markNotifsRead();
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm transition duration-200">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <h1 className="font-bold text-xl text-blue-600 transition duration-200 group-hover:scale-105">SevaLink AI</h1>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ripple hover:scale-105 active:scale-95
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
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
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Live
          </div>

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-3 relative">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={toggleNotifs}
                  className="p-2 rounded-full hover:bg-slate-100 transition-all ripple hover:scale-110 active:scale-90 relative text-lg"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 border-2 border-white bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-[100] max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                      <span className="font-bold text-slate-800 text-sm">Notifications</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-500">No new notifications</div>
                      ) : (
                        notifications.map((n, i) => (
                          <div key={i} className={`px-4 py-3 ${n.read ? 'opacity-70' : 'bg-indigo-50/30'}`}>
                            <p className="text-sm text-slate-700">{n.text}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.date).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              {/* User Menu Trigger */}
              <div>
                <button
                  id="user-menu-btn"
                  onClick={() => { setMenuOpen((v) => !v); setShowNotifs(false); }}
                  className="ripple flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-500/30 hover:scale-105 active:scale-95 transition duration-200 text-sm"
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
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="ripple px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-blue-600 transition duration-200 font-medium hover:scale-105 active:scale-95"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="ripple bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 shadow-sm text-sm font-medium hover:scale-105 active:scale-95"
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
