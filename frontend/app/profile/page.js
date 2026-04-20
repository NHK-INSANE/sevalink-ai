"use client";
import { useEffect, useState } from "react";
import { getUser, logout, getRoleLabel } from "../utils/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ROLE_COLORS = {
  NGO: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30",
  Volunteer: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  Worker: "text-orange-300 bg-orange-500/15 border-orange-500/30",
  User: "text-slate-300 bg-slate-500/15 border-slate-500/30",
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
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <span className="text-base mt-0.5">{icon}</span>
      <div>
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        <div className="text-sm text-slate-200 font-medium">{value}</div>
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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl btn-primary flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            {roleIcon}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {user.name || "SevaLink User"}
          </h1>
          {user.username && (
            <p className="text-slate-500 text-sm mt-0.5">@{user.username}</p>
          )}
          {/* Role badge */}
          <span
            className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border text-xs font-semibold ${roleColor}`}
          >
            {roleIcon} {getRoleLabel ? getRoleLabel(user.role) : user.role}
          </span>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          {/* Info rows */}
          <div className="px-6 py-2">
            <InfoRow label="Email" value={user.email} icon="📧" />
            <InfoRow label="Phone" value={user.phone} icon="📱" />
            <InfoRow label="Location" value={user.address} icon="📍" />
            {user.ngoName && (
              <InfoRow label="Organisation" value={user.ngoName} icon="🏢" />
            )}
            {user.ngoContact && (
              <InfoRow label="NGO Contact" value={user.ngoContact} icon="🌐" />
            )}
            {user.ngoLink && (
              <InfoRow label="Works under" value={user.ngoLink} icon="🔗" />
            )}
            {user.bio && (
              <InfoRow label="Bio" value={user.bio} icon="✏️" />
            )}
          </div>

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div className="px-6 py-4 border-t border-white/5">
              <div className="text-xs text-slate-500 mb-2">🛠 Skills</div>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-4 border-t border-white/5 flex gap-3">
            <Link
              href="/"
              className="flex-1 text-center py-2.5 rounded-xl text-sm font-medium glass border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all"
            >
              ← Dashboard
            </Link>
            <button
              id="profile-logout-btn"
              onClick={handleLogout}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-400/50 transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
