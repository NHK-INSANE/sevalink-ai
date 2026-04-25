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
    username: "",
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
        username: u.username || "",
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
    <div className="min-h-screen bg-[#0B1220] text-gray-200">
      <Navbar />
      <PageWrapper className="pt-24 pb-20">
        <div className="max-w-xl mx-auto px-4">
          
          {/* ── PROFILE CARD ── */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0f172a]/50 border border-white/10 rounded-[2rem] p-10 text-center mb-8 backdrop-blur-xl relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 blur-[80px] -z-10" />
            
            <motion.div whileHover={{ scale: 1.05 }} className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl">
                {user.name?.[0]?.toUpperCase()}
              </div>
            </motion.div>

            <h2 className="text-[20px] font-semibold text-white mb-1 tracking-tight">{user.name}</h2>
            <p className="text-[12px] opacity-60 font-mono tracking-widest mb-4">ID: {user.customId || user.id || user._id}</p>

            <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
              {user.role}
            </span>
          </motion.div>

          {/* ── DETAILS CARD ── */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#0f172a]/30 border border-white/5 rounded-[2rem] overflow-hidden mb-8"
          >
            {isEditing ? (
              <form onSubmit={handleUpdate} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Full Name</label>
                      <input 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Mobile</label>
                      <input 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email</label>
                    <input 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Location</label>
                    <input 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 rounded-2xl bg-white/5 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={saving} className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
                    {saving ? "Syncing..." : "Sync Profile"}
                  </motion.button>
                </div>
              </form>
            ) : (
              <div className="divide-y divide-white/5">
                <div className="p-8 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col gap-1">
                    <strong className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Location</strong>
                    <p className="text-sm font-bold text-gray-200">{user.address || "Field Operator: Global"}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">📍</div>
                </div>
                <div className="p-8 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col gap-1">
                    <strong className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Phone</strong>
                    <p className="text-sm font-bold text-gray-200">{user.phone || "Not Linked"}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">📞</div>
                </div>
                <div className="p-8 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col gap-1">
                    <strong className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Email</strong>
                    <p className="text-sm font-bold text-gray-200">{user.email}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">📧</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* ── ACTIONS ── */}
          {!isEditing && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className="py-5 rounded-[1.5rem] bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest hover:bg-indigo-600/20 transition-all shadow-xl shadow-indigo-500/5"
              >
                Edit Profile
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="py-5 rounded-[1.5rem] bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
              >
                Logout Account
              </motion.button>
            </motion.div>
          )}

        </div>
      </PageWrapper>
    </div>
  );
}
