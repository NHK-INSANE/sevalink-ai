"use client";
import { useEffect, useState } from "react";
import { getUser, logout, getRoleLabel } from "../utils/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { Loader } from "../components/Skeleton";
import { motion } from "framer-motion";
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

      // Check for edit mode in URL
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("edit") === "true") setIsEditing(true);
      }
    }
  }, [router]);

  if (!user) return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Navbar />
      <div className="pt-40">
        <Loader />
      </div>
    </div>
  );

  const roleKey = (user.role || "user").toLowerCase();
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
      localStorage.setItem("seva_user", JSON.stringify(updatedUser));
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
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition duration-300">
      <Navbar />
      <PageWrapper>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="relative inline-block mb-8">
              <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center text-5xl mx-auto border border-white/5 shadow-2xl shadow-indigo-500/10">
                {roleIcon}
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsEditing(!isEditing)}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-[var(--bg-card)] border border-white/10 rounded-2xl flex items-center justify-center text-xs shadow-2xl hover:scale-110 transition active:scale-95 z-10"
                title="Edit Profile"
              >
                {isEditing ? "✕" : "✏️"}
              </motion.button>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight gradient-text">
              {user.name || "SevaLink User"}
            </h1>
            {user.username && (
              <p className="text-[var(--text-secondary)] text-sm mt-2 font-medium tracking-wide">@{user.username}</p>
            )}
            <div className="mt-6">
              <span className={`badge ${
                roleKey === "ngo" ? "badge-high" : roleKey === "volunteer" ? "badge-low" : "badge-medium"
              } !text-[10px] !px-6 !py-2`}>
                {getRoleLabel ? getRoleLabel(user.role) : user.role}
              </span>
              {user.customId && (
                <div className="mt-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest bg-white/5 inline-block px-3 py-1 rounded-lg border border-white/5">
                  ID: {user.customId}
                </div>
              )}
            </div>
          </div>

          {/* Profile Card / Edit Form */}
          <div className="card !p-0 !rounded-[2.5rem] border-white/5 overflow-hidden shadow-2xl">
            {isEditing ? (
              <form onSubmit={handleUpdate} className="p-10 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Full Name</label>
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-[var(--primary)] outline-none transition-all placeholder-white/20"
                      placeholder="Your Name"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Email</label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-[var(--primary)] outline-none transition-all placeholder-white/20"
                      placeholder="Email Address"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Contact Phone</label>
                  <input 
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-[var(--primary)] outline-none transition-all placeholder-white/20"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Operational Address</label>
                  <input 
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-[var(--primary)] outline-none transition-all placeholder-white/20"
                    placeholder="City, Region"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Professional Bio</label>
                  <textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-[var(--primary)] outline-none transition-all placeholder-white/20 h-32 resize-none"
                    placeholder="Describe your expertise or mission..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary flex-1 !py-4"
                  >
                    Cancel
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    type="submit" 
                    disabled={saving}
                    className="btn-primary flex-1 !py-4 shadow-[0_0_30px_var(--primary-glow)] disabled:opacity-50 flex items-center justify-center"
                  >
                    {saving ? <div className="loader-small"></div> : "Sync Changes"}
                  </motion.button>
                </div>
              </form>
            ) : (
              <>
                <div className="p-10 space-y-2">
                  <InfoRow label="Access Email" value={user.email} icon="📧" />
                  <InfoRow label="Field Contact" value={user.phone || "Not provided"} icon="📱" />
                  <InfoRow label="Command Center" value={user.address || "No address set"} icon="📍" />
                  {user.ngoName && <InfoRow label="Organization" value={user.ngoName} icon="🏢" />}
                  {user.bio && <InfoRow label="Mission Profile" value={user.bio} icon="📝" />}
                </div>

                {/* Skills */}
                {(Array.isArray(user.skills) ? user.skills : (user.skills ? [user.skills] : [])).length > 0 && (
                  <div className="px-10 py-10 border-t border-white/5 bg-white/[0.01]">
                    <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-6">Expertise Stack</div>
                    <div className="flex flex-wrap gap-3">
                      {(Array.isArray(user.skills) ? user.skills : [user.skills]).map((skill) => (
                        <span key={skill} className="px-5 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20 shadow-lg shadow-indigo-500/5 uppercase tracking-wider">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-10 bg-black/20 border-t border-white/5 grid grid-cols-2 gap-6">
                  <Link href="/dashboard">
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary !py-5 !text-xs !uppercase !tracking-widest w-full">
                      Dashboard
                    </motion.button>
                  </Link>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} className="btn-secondary !text-red-500 !border-red-500/20 hover:!bg-red-500/10 !py-5 !text-xs !uppercase !tracking-widest">
                    Logout
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      </PageWrapper>
    </div>
  );
}
