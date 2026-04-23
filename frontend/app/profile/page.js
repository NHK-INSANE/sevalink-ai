"use client";
import { useEffect, useState } from "react";
import { getUser, logout, getRoleLabel } from "../utils/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const ROLE_COLORS = {
  ngo:       "text-blue-600 bg-blue-50 border-blue-200",
  volunteer: "text-emerald-600 bg-emerald-50 border-emerald-200",
  worker:    "text-orange-600 bg-orange-50 border-orange-200",
  user:      "text-gray-600 bg-gray-50 border-gray-200",
};

const ROLE_ICONS = {
  ngo: "🏢",
  volunteer: "🤝",
  worker: "🔧",
  user: "👤",
};

function InfoRow({ label, value, icon }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <span className="text-base mt-0.5">{icon}</span>
      <div>
        <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-sm text-[var(--text)] font-medium">{value}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
    } else {
      setUser(u);
      setFormData({
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || "",
        address: u.address || "",
        bio: u.bio || "",
      });
    }
  }, [router]);

  if (!user) return null;

  const roleKey = (user.role || "user").toLowerCase();
  const roleColor = ROLE_COLORS[roleKey] || ROLE_COLORS.user;
  const roleIcon = ROLE_ICONS[roleKey] || "👤";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${API_BASE}/api/users/update-profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedUser = res.data;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      toast.success("Profile updated successfully! ✨");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-[2rem] bg-[var(--primary)]/10 flex items-center justify-center text-4xl mx-auto mb-6 border border-[var(--primary)]/20 shadow-lg shadow-indigo-500/5">
                {roleIcon}
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--card)] border border-[var(--border)] rounded-xl flex items-center justify-center text-xs shadow-sm hover:scale-110 transition active:scale-95"
                title="Edit Profile"
              >
                {isEditing ? "✕" : "✏️"}
              </button>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight">
              {user.name || "SevaLink User"}
            </h1>
            {user.username && (
              <p className="text-[var(--muted)] text-sm mt-1 font-medium">@{user.username}</p>
            )}
            <span className={`inline-flex items-center gap-1.5 mt-4 px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${roleColor}`}>
              {getRoleLabel ? getRoleLabel(user.role) : user.role}
            </span>
          </div>

          {/* Profile Card / Edit Form */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/5">
            {isEditing ? (
              <form onSubmit={handleUpdate} className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">Email</label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">Location Address</label>
                  <input 
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest ml-1">Bio / Expertise Details</label>
                  <textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition h-24 resize-none"
                    placeholder="Tell us about your background..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3.5 rounded-2xl text-xs font-bold bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)] transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-2xl text-xs font-bold bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20 hover:opacity-90 transition active:scale-95 disabled:opacity-50"
                  >
                    {saving ? "Saving Changes..." : "Save Profile"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="p-8 space-y-1">
                  <InfoRow label="Email Address" value={user.email} icon="📧" />
                  <InfoRow label="Contact Number" value={user.phone || "Not provided"} icon="📱" />
                  <InfoRow label="Base Location" value={user.address || "No address set"} icon="📍" />
                  {user.ngoName && <InfoRow label="Organization" value={user.ngoName} icon="🏢" />}
                  {user.bio && <InfoRow label="Personal Bio" value={user.bio} icon="📝" />}
                </div>

                {/* Skills */}
                {user.skills && user.skills.length > 0 && (
                  <div className="px-8 py-8 border-t border-[var(--border)] bg-indigo-500/[0.02]">
                    <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4">Core Expertise</div>
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill) => (
                        <span key={skill} className="px-4 py-1.5 rounded-xl bg-[var(--primary)] text-white text-[10px] font-bold shadow-sm shadow-indigo-500/20">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-6 sm:p-8 bg-[var(--bg)]/50 border-t border-[var(--border)] grid grid-cols-2 gap-4">
                  <Link href="/dashboard" className="py-4 rounded-2xl text-xs font-bold bg-[var(--card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg)] transition text-center active:scale-95 shadow-sm">
                    Open Dashboard
                  </Link>
                  <button onClick={handleLogout} className="py-4 rounded-2xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition active:scale-95">
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
