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
  loading: () => <div className="h-full w-full bg-slate-900 animate-pulse rounded-[2rem]" />
});

const CATEGORIES = ["Medical", "Food & Water", "Shelter", "Rescue", "Infrastructure", "Fire", "Safety", "Other"];
const SKILLS = ["First Aid", "Heavy Lifting", "Logistics", "Cooking", "Communication", "Technical", "Security", "Other"];

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
        toast.success("AI suggestion generated!");
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
    toast.success("AI text applied");
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
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <span className="text-5xl">✅</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-white">Mission Transmitted</h1>
            <p className="text-sm text-gray-400">Emergency protocols have been initiated. Responders in your sector have been alerted.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => setSuccess(false)} className="btn-primary w-full py-4">Report Another</button>
            <Link href="/problems" className="btn-secondary w-full py-4 text-center">View Global Grid</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] pb-32">
      <Navbar />
      <PageWrapper className="pt-28 px-6">
        <div className="max-w-3xl mx-auto">
          
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-white mb-2">Report Emergency</h1>
            <p className="text-sm text-gray-400 font-medium">Deploy AI-assisted crisis reporting for immediate response coordination.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            
            {/* 1. TITLE & DESCRIPTION */}
            <section className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Incident Header *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  placeholder="e.g. Flash flood at Riverside Sector"
                  className="w-full !rounded-xl !py-4 !px-6"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tactical Description *</label>
                <div className="relative">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="Describe the situation in detail..."
                    rows={6}
                    className="w-full !rounded-[1.5rem] !py-5 !px-6 !resize-none"
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button 
                      type="button" onClick={handleAIScore} disabled={aiLoading}
                      className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-bold text-gray-400 transition-all"
                    >
                      {aiLoading ? "Analyzing..." : "🤖 Get AI Score"}
                    </button>
                    <button 
                      type="button" onClick={handleAISuggest} disabled={suggestLoading}
                      className="bg-purple-600/20 hover:bg-purple-600/40 backdrop-blur-md border border-purple-500/20 rounded-xl px-4 py-2.5 text-[10px] font-bold text-purple-400 transition-all"
                    >
                      {suggestLoading ? "Thinking..." : "🤖 AI Refine"}
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
                      <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">AI Intelligence Suggestion</p>
                          <button onClick={() => setAiSuggestion("")} className="text-gray-500 hover:text-white">✕</button>
                        </div>
                        <p className="text-sm italic text-gray-300 leading-relaxed">"{aiSuggestion}"</p>
                        <button type="button" onClick={applySuggestion} className="btn-primary !py-2 !px-4 !text-[10px] !rounded-lg">Apply Optimized Text</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* 2. AI SEVERITY INDICATOR */}
            <section className="space-y-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">AI Detected Severity</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(SEVERITY_LEVELS).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAiUrgency(key)}
                    className={`p-4 rounded-2xl border transition-all text-left group ${
                      (aiUrgency || form.userSeverity) === key 
                        ? `${val.bg} ${val.border}` 
                        : "bg-white/[0.02] border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{val.icon}</span>
                      <div className={`w-2 h-2 rounded-full ${val.bg} border ${val.border}`} />
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${val.color}`}>{val.label}</p>
                    <p className="text-[8px] text-gray-500 mt-1 font-medium">{val.desc}</p>
                  </button>
                ))}
              </div>
              {aiScore && (
                <p className="text-[9px] text-purple-400 font-bold uppercase tracking-widest ml-1">AI Confidence: {aiScore}%</p>
              )}
            </section>

            {/* 3. CATEGORIES & SKILLS */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Mission Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => toggleSelection("categories", c)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                        form.categories.includes(c) ? "bg-purple-600 text-white border-transparent" : "bg-white/5 text-gray-500 border-white/5"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Specialized Skills Needed</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => toggleSelection("requiredSkills", s)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                        form.requiredSkills.includes(s) ? "bg-purple-600 text-white border-transparent" : "bg-white/5 text-gray-500 border-white/5"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. LOCATION */}
            <section className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Mission Geolocation *</label>
                  <p className="text-[9px] text-gray-600 font-medium">Pin the exact incident location for responders.</p>
                </div>
                <button type="button" onClick={detectLocation} className="text-[10px] font-bold text-purple-400 hover:text-white transition-colors">
                  📍 Auto-Detect GPS
                </button>
              </div>
              <div className="h-[350px] rounded-[2rem] overflow-hidden border border-white/5 bg-slate-900 shadow-inner group">
                <MapPicker setLocation={setLocation} setAddress={setAddress} initialLocation={location} />
              </div>
              {address && <p className="text-[9px] text-gray-500 italic ml-2">📍 {address}</p>}
            </section>

            {/* 5. SUBMIT */}
            <div className="pt-6">
              <button 
                type="submit" disabled={loading}
                className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-purple-500/10"
              >
                {loading ? "Transmitting..." : "Initiate Emergency Broadcast"}
              </button>
              <p className="text-center text-[9px] text-gray-600 mt-6 font-medium">By submitting, you agree to the tactical transmission protocols of SevaLink AI.</p>
            </div>

          </form>
        </div>
      </PageWrapper>
    </div>
  );
}
