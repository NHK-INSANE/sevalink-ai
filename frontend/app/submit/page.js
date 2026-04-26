"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { createProblem, getSeverity, getAISuggestion } from "../utils/api";
import { socket } from "../../lib/socket";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";

const MapPicker = dynamic(() => import("../components/MapPicker"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900 animate-pulse rounded-[2.5rem]" />
});

const CATEGORIES = ["Medical", "Food & Water", "Shelter", "Rescue", "Infrastructure", "Fire", "Safety", "Industrial", "Education", "Medicine Supply", "Technical", "Other"];
const SKILLS = ["First Aid", "Heavy Lifting", "Logistics", "Cooking", "Communication", "Technical", "Security", "Medical Pro", "Search & Rescue", "Other"];

const SEVERITY_LEVELS = {
  critical: { label: "Critical", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: "🚨", desc: "Life-threatening emergency" },
  high: { label: "High", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: "⚠️", desc: "Serious risk, urgent action" },
  medium: { label: "Medium", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: "🔸", desc: "Requires attention" },
  low: { label: "Low", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "🔹", desc: "No immediate danger" },
};

export default function SubmitPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    categories: [],
    requiredSkills: [],
    userSeverity: "medium"
  });
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [aiUrgency, setAiUrgency] = useState(null);
  const [aiScore, setAiScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!getUser()) router.push("/login");
  }, [router]);

  const toggleSelection = (field, value) => {
    setForm(prev => {
      const current = prev[field];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const handleAIScore = async () => {
    if (!form.description.trim()) return toast.error("Enter description first");
    setAiLoading(true);
    try {
      const res = await getSeverity(form.description);
      setAiUrgency(res.severity);
      setAiScore(res.score);
      toast.success(`AI Detection: ${res.severity.toUpperCase()}`);
    } catch (err) {
      toast.error("AI Analysis failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAISuggest = async () => {
    if (!form.description.trim()) return toast.error("Enter description first");
    setSuggestLoading(true);
    try {
      const res = await getAISuggestion(form.description);
      if (res.result) {
        setAiSuggestion(res.result);
        toast.success("AI Summarization ready!");
      }
    } catch (err) {
      toast.error("AI failed to think.");
    } finally {
      setSuggestLoading(false);
    }
  };

  const applySuggestion = () => {
    setForm(prev => ({ ...prev, description: aiSuggestion }));
    setAiSuggestion("");
    toast.success("AI Explained version applied");
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error("GPS not supported");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLocation({ lat, lng });
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data.display_name) setAddress(data.display_name);
      } catch (err) {}
      toast.success("Location locked 📍");
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || form.categories.length === 0) {
      return toast.error("Please fill all required fields");
    }

    setLoading(true);
    try {
      const res = await createProblem({
        ...form,
        severity: aiUrgency || form.userSeverity,
        location: { ...location, address }
      });
      
      setSuccess(true);
      socket.emit("new_crisis", { title: form.title, severity: aiUrgency || form.userSeverity });
      toast.success("Mission Reported Successfully!");
    } catch (err) {
      toast.error("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#080B14] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <span className="text-5xl">✅</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Mission Transmitted</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Emergency protocols initiated. Responders alerted.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => setSuccess(false)} className="btn-primary w-full py-4 !rounded-2xl">Report Another</button>
            <Link href="/problems" className="btn-secondary w-full py-4 text-center !rounded-2xl">View Global Grid</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B14] text-white pb-32 font-inter">
      <Navbar />
      <PageWrapper className="pt-28 px-6">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-12 border-b border-white/5 pb-8">
            <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Report Emergency</h1>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Deploy AI-assisted crisis reporting for immediate coordination.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            
            <section className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Crisis Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  placeholder="e.g. Flash flood at Riverside Sector"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-sm focus:border-purple-500 outline-none transition-all placeholder:text-gray-700 font-bold"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Incident Report *</label>
                <div className="relative">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="Describe the situation in detail..."
                    rows={8}
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 px-8 text-sm focus:border-purple-500 outline-none transition-all placeholder:text-gray-700 font-medium leading-relaxed resize-none"
                  />
                  <div className="absolute bottom-6 right-6 flex gap-2">
                    <button 
                      type="button" onClick={handleAIScore} disabled={aiLoading}
                      className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 text-[9px] font-black text-white uppercase tracking-widest transition-all"
                    >
                      {aiLoading ? "..." : "🤖 Get AI Score"}
                    </button>
                    <button 
                      type="button" onClick={handleAISuggest} disabled={suggestLoading}
                      className="bg-purple-600 hover:bg-purple-500 backdrop-blur-md border border-purple-400/20 rounded-xl px-4 py-2.5 text-[9px] font-black text-white uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20"
                    >
                      {suggestLoading ? "..." : "🤖 AI Summarization"}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {aiSuggestion && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-8 rounded-[2rem] bg-purple-500/5 border border-purple-500/10 space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">AI Intelligence: Explained Version</p>
                          <button onClick={() => setAiSuggestion("")} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        <p className="text-sm font-medium text-gray-300 leading-relaxed italic">"{aiSuggestion}"</p>
                        <button type="button" onClick={applySuggestion} className="bg-purple-600 text-white font-black text-[9px] uppercase tracking-widest py-2 px-5 rounded-xl">Apply Explained Version</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            <section className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tactical Severity Estimate</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(SEVERITY_LEVELS).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAiUrgency(key)}
                    className={`p-6 rounded-[1.5rem] border transition-all text-left group ${
                      (aiUrgency || form.userSeverity) === key 
                        ? `${val.bg} ${val.border}` 
                        : "bg-white/[0.02] border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{val.icon}</span>
                      <div className={`w-2 h-2 rounded-full ${val.bg} border ${val.border}`} />
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${val.color}`}>{val.label}</p>
                    <p className="text-[8px] text-gray-600 mt-1 font-black uppercase tracking-tight">{val.desc}</p>
                  </button>
                ))}
              </div>
              {aiScore && (
                <p className="text-[9px] text-purple-400 font-black uppercase tracking-[0.2em] ml-1">AI Confidence Rating: {aiScore}%</p>
              )}
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Incident Categories</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => toggleSelection("categories", c)}
                      className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all text-center ${
                        form.categories.includes(c) ? "bg-purple-600 text-white border-transparent shadow-lg shadow-purple-500/20" : "bg-white/5 text-gray-600 border-white/5"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Required Expertise</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS.map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => toggleSelection("requiredSkills", s)}
                      className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all text-center ${
                        form.requiredSkills.includes(s) ? "bg-blue-600 text-white border-transparent shadow-lg shadow-blue-500/20" : "bg-white/5 text-gray-600 border-white/5"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Mission Geolocation *</label>
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Pin exact deployment sector.</p>
                </div>
                <button type="button" onClick={detectLocation} className="text-[9px] font-black text-purple-400 hover:text-white transition-colors uppercase tracking-widest">
                  📍 Auto-Detect GPS
                </button>
              </div>
              <div className="h-[400px] rounded-[2.5rem] overflow-hidden border border-white/10 bg-slate-900 shadow-2xl group">
                <MapPicker setLocation={setLocation} setAddress={setAddress} initialLocation={location} />
              </div>
              {address && <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest ml-2">📍 {address}</p>}
            </section>

            <div className="pt-10 flex justify-center">
              <button 
                type="submit" disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white w-full max-w-md py-5 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 rounded-2xl"
              >
                {loading ? "TRANSMITTING..." : "Initiate Emergency Broadcast"}
              </button>
            </div>

          </form>
        </div>
      </PageWrapper>
    </div>
  );
}
