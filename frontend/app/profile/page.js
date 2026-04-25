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
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
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
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          
          {/* ── PROFILE HEADER ── */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 blur-2xl -ml-12 -mb-12 rounded-full" />
            
            <motion.div whileHover={{ scale: 1.05 }} className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full bg-white text-indigo-600 flex items-center justify-center text-3xl font-black shadow-xl border-4 border-white/20">
                {user.name?.[0]?.toUpperCase()}
              </div>
            </motion.div>

            <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">{user.name}</h2>
            
            {/* ROLE BADGE */}
            <div className="flex justify-center gap-2 mb-3">
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm
                ${String(user.role).toLowerCase() === "volunteer" 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                  : "bg-blue-500/20 text-blue-300 border-blue-500/30"}
              `}>
                {user.role || "FIELD OPERATOR"}
              </span>
            </div>

            <p className="text-[10px] font-mono text-white/60 tracking-widest uppercase">Operator ID: {user.customId || user.id?.slice(-8) || "GEN-77218"}</p>
          </motion.div>

          {/* ── EDIT MODE OR INFO GRID ── */}
          {isEditing ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#0f172a]/50 border border-white/10 rounded-[2rem] p-8 shadow-xl"
            >
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Full Name</label>
                    <input 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Mobile Contact</label>
                    <input 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                    <input 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Operation Base (Location)</label>
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
                    {saving ? "Updating..." : "Save Changes"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-[#0f172a]/30 border border-white/5 rounded-3xl p-6 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">📍</div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Operation Base</p>
                </div>
                <p className="text-sm font-bold text-gray-200">{user.address || "Field Operator: Global"}</p>
              </motion.div>

              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-[#0f172a]/30 border border-white/5 rounded-3xl p-6 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">📞</div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Encrypted Line</p>
                </div>
                <p className="text-sm font-bold text-gray-200">{user.phone || "Not Linked"}</p>
              </motion.div>

              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-[#0f172a]/30 border border-white/5 rounded-3xl p-6 md:col-span-2 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">📧</div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Secure Email</p>
                </div>
                <p className="text-sm font-bold text-gray-200">{user.email}</p>
              </motion.div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="md:col-span-2 py-5 rounded-[1.5rem] bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                Logout Tactical Network
              </motion.button>
            </div>
          )}

        </div>
      </PageWrapper>
    </div>
  );
}
