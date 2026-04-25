"use client";
import { useEffect, useState } from "react";
import { getUser, logout } from "../utils/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { Loader } from "../components/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const PREDEFINED_SKILLS = ["Medical Aid", "Rescue", "IT Support", "Logistics", "Food Supply", "Security", "Translation", "Counseling"];

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    bio: "",
    skills: []
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/users/profile`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      setUser(res.data);
      setFormData({
        name: res.data.name || "",
        phone: res.data.phone || "",
        address: res.data.address || "",
        bio: res.data.bio || "",
        skills: res.data.skills || []
      });
    } catch (err) {
      console.error("Profile Fetch Error:", err);
      toast.error("Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
    } else {
      fetchProfile();
    }
  }, [router]);

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
      toast.success("Identity updated successfully! ✨");
    } catch (err) {
      console.error(err);
      toast.error("Update failed. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-[#080B14]">
      <Navbar />
      <div className="pt-40">
        <Loader />
      </div>
    </div>
  );

  const roleLabel = user.role?.toUpperCase() || "RESPONDER";
  const roleColor = 
    user.role === "volunteer" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" :
    user.role === "worker" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
    user.role === "ngo" ? "text-purple-400 bg-purple-400/10 border-purple-400/20" :
    "text-gray-400 bg-gray-400/10 border-gray-400/20";

  return (
    <div className="min-h-screen bg-[#080B14] text-white">
      <Navbar />
      
      <PageWrapper className="pt-24 pb-32">
        <div className="max-w-2xl mx-auto px-6 space-y-8">
          
          {/* ── HEADER CARD ── */}
          <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
            
            <div className="relative inline-block mb-6">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 p-1">
                <div className="w-full h-full rounded-[1.4rem] bg-[#080B14] flex items-center justify-center text-4xl font-black text-white">
                  {user.name?.[0]?.toUpperCase()}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-[#080B14] rounded-full" />
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white mb-2 uppercase">{user.name}</h1>
            
            <div className="flex flex-col items-center gap-3">
              <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${roleColor}`}>
                {roleLabel}
              </span>
              <p className="text-[10px] font-mono text-gray-500 tracking-[0.3em] uppercase">User ID: {user.customId || user._id?.slice(-12).toUpperCase()}</p>
            </div>
          </div>

          {/* ── INFO SECTION ── */}
          <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location */}
                <div className="bg-[#0f172a]/20 border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Location</p>
                  <p className="text-sm font-bold text-gray-300">{user.address || "Global Ops"}</p>
                </div>
                {/* Contact */}
                <div className="bg-[#0f172a]/20 border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Phone</p>
                  <p className="text-sm font-bold text-gray-300">{user.phone || "No direct line"}</p>
                </div>
             </div>

             {/* Email */}
             <div className="bg-[#0f172a]/20 border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Secure Email</p>
                <p className="text-sm font-bold text-gray-300">{user.email}</p>
             </div>

             {/* Skills */}
             <div className="bg-[#0f172a]/20 border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Tactical Skills</p>
                <div className="flex flex-wrap gap-2">
                  {user.skills?.length > 0 ? user.skills.map(s => (
                    <span key={s} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-indigo-400">{s}</span>
                  )) : (
                    <p className="text-xs text-gray-600 italic">No specialized skills registered</p>
                  )}
                </div>
             </div>

             {/* Bio */}
             <div className="bg-[#0f172a]/20 border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Operator Bio</p>
                <p className="text-sm text-gray-400 leading-relaxed italic">
                  {user.bio || "No professional summary provided."}
                </p>
             </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <button 
              onClick={() => setIsEditing(true)}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 transition-all"
             >
                Edit Identity
             </button>
             <Link 
              href="/dashboard"
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all text-center"
             >
                Dashboard
             </Link>
          </div>

        </div>
      </PageWrapper>

      {/* ── EDIT MODAL ── */}
      <AnimatePresence>
        {isEditing && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-ml-[300px] md:w-[600px] bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 z-[10000] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-xl font-black uppercase tracking-widest text-white">Edit Profile</h2>
                 <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                 </button>
              </div>

              <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Full Name</label>
                  <input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Phone</label>
                    <input 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Address</label>
                    <input 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Specialized Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_SKILLS.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase transition-all border ${
                          formData.skills.includes(skill) 
                            ? "bg-indigo-600 border-indigo-500 text-white" 
                            : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Professional Bio</label>
                  <textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={4}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all resize-none"
                    placeholder="Tell us about your experience..."
                  />
                </div>
              </form>

              <div className="pt-8 flex gap-4 mt-auto">
                 <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all"
                 >
                   {saving ? "Updating..." : "Save Identity"}
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
