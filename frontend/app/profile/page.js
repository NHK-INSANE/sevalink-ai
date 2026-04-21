"use client";
import { useEffect, useState } from "react";
import { getUser, logout, getRoleLabel } from "../utils/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";

const ROLE_COLORS = {
  NGO:       "text-blue-600 bg-blue-50 border-blue-200",
  Volunteer: "text-emerald-600 bg-emerald-50 border-emerald-200",
  Worker:    "text-orange-600 bg-orange-50 border-orange-200",
  User:      "text-gray-600 bg-gray-50 border-gray-200",
};

const ROLE_ICONS = {
  NGO: "🏢",
  Volunteer: "🤝",
  Worker: "🔧",
  User: "👤",
};

function InfoRow({ label, value, icon }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className="text-base mt-0.5">{icon}</span>
      <div>
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        <div className="text-sm text-gray-700 font-medium">{value}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
    } else {
      setUser(u);
    }
  }, [router]);

  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.User;
  const roleIcon = ROLE_ICONS[user.role] || "👤";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="w-20 h-20 rounded-3xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl mx-auto mb-4 border border-[var(--primary)]/20 shadow-sm">
              {roleIcon}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {user.name || "SevaLink User"}
            </h1>
            {user.username && (
              <p className="text-[var(--muted)] text-sm mt-1">@{user.username}</p>
            )}
            <span className={`inline-flex items-center gap-1.5 mt-3 px-4 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${roleColor}`}>
              {getRoleLabel ? getRoleLabel(user.role) : user.role}
            </span>
          </div>

          {/* Profile Card */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 sm:p-8 space-y-1">
              <InfoRow label="Email" value={user.email} icon="📧" />
              <InfoRow label="Phone" value={user.phone} icon="📱" />
              <InfoRow label="Location" value={user.address} icon="📍" />
              {user.ngoName && <InfoRow label="Organisation" value={user.ngoName} icon="🏢" />}
            </div>

            {/* Skills */}
            {user.skills && user.skills.length > 0 && (
              <div className="px-6 sm:px-8 py-6 border-t border-[var(--border)]">
                <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Expertise</div>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 sm:p-6 bg-[var(--bg)]/50 border-t border-[var(--border)] grid grid-cols-2 gap-3">
              <Link href="/dashboard" className="py-2.5 rounded-xl text-xs font-bold bg-[var(--card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg)] transition text-center active:scale-95">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="py-2.5 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition active:scale-95">
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
