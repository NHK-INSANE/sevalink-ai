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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition duration-200">
      <Navbar />
      <PageWrapper>
      <div className="flex items-center justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
              {roleIcon}
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {user.name || "SevaLink User"}
            </h1>
            {user.username && (
              <p className="text-gray-400 text-sm mt-0.5">@{user.username}</p>
            )}
            {/* Role badge */}
            <span
              className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border text-xs font-semibold ${roleColor}`}
            >
              {roleIcon} {getRoleLabel ? getRoleLabel(user.role) : user.role}
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition duration-200">
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
              <div className="px-6 py-4 border-t border-gray-50">
                <div className="text-xs text-gray-400 mb-2">🛠 Skills</div>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-50 flex gap-3">
              <Link
                href="/"
                className="ripple flex-1 text-center py-2.5 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition duration-200 hover:scale-105 active:scale-95"
              >
                ← Dashboard
              </Link>
              <button
                id="profile-logout-btn"
                onClick={handleLogout}
                className="ripple flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition duration-200 hover:scale-105 active:scale-95"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      </PageWrapper>
    </div>
  );
}
