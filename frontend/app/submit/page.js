"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { createProblem, getUrgency, getAISuggestion } from "../utils/api";
import { socket } from "../../lib/socket";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { getUserLocation } from "../utils/location";
import Link from "next/link";
const MapPicker = dynamic(() => import("../components/MapPicker"), { ssr: false });

const CATEGORIES = [
  "Food & Water",
  "Medical",
  "Shelter",
  "Infrastructure",
  "Education",
  "Safety",
  "Environment",
  "Other",
];

const SKILLS = [
  "Medical Aid",
  "Food Supply",
  "Engineering",
  "Logistics",
  "Education",
  "Social Work",
  "IT Support",
  "Legal Aid",
  "Other",
];

const URGENCY_INFO = {
  Critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", desc: "Immediate threat to life" },
  High: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", desc: "Urgent, needs action today" },
  Medium: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", desc: "Important, needs attention soon" },
  Low: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", desc: "Minor issue, can wait" },
};

export default function SubmitPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    categories: [], // ✅ multiple
    requiredSkills: [], // ✅ multiple
  });
  const [customCategory, setCustomCategory] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [aiUrgency, setAiUrgency] = useState(null);
  const [aiScore, setAiScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Auth guard — redirect if not logged in
  useEffect(() => {
    if (!getUser()) router.push("/login");
  }, [router]);

  const updateForm = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleSelection = (field, value) => {
    setForm(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLocation({ lat, lng });

      // 🌍 Reverse Geocoding via Nominatim
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        if (data.display_name) {
          setAddress(data.display_name);
        }
      } catch (err) {
        console.error("Submit GPS Reverse geocoding error:", err);
      }
    });
  };

  const analyzeUrgency = async () => {
    if (!form.description.trim()) return;
    setAiLoading(true);
    try {
      const result = await getUrgency(form.description);
      setAiUrgency(result.urgency);
      setAiScore(result.score ?? null);
      if (result.responders && result.responders.length > 0) {
        setForm(prev => ({
          ...prev,
          requiredSkills: [...new Set([...prev.requiredSkills, ...result.responders])]
        }));
        toast.success(`AI detected needed responders: ${result.responders.join(", ")}`);
      }

      // 🔥 Emit to OPS Command Center
      socket.emit("ai_update", {
        priority: result.urgency,
        score: result.score,
        responders: result.responders,
        message: `AI Analysis: ${result.urgency} priority detected.`
      });
    } catch {
      setAiUrgency("Medium");
      setAiScore(null);
    } finally {
      setAiLoading(false);
    }
  };

  const getAISuggestionHandler = async () => {
    if (!form.description.trim()) return;
    setSuggestLoading(true);
    try {
      const data = await getAISuggestion(form.description);
      if (data.result) {
        setAiSuggestion(data.result);
        toast.success("AI suggestion ready!");
      }
    } catch (err) {
      console.error("AI Suggest Error:", err);
      toast.error("Failed to get AI suggestion");
    } finally {
      setSuggestLoading(false);
    }
  };

  const applySuggestion = () => {
    if (!aiSuggestion) return;
    setForm(prev => {
      const next = { ...prev, description: aiSuggestion };
      console.log("Applying AI Suggestion. New description:", aiSuggestion);
      return next;
    });
    setAiSuggestion("");
    toast.success("AI suggestion applied!");
  };

  const handleUseMyLocation = async () => {
    detectLocation();
    toast.success("Current location detected! 📍");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error("Title and description are required.");
      return;
    }
    if (form.categories.length === 0) {
      toast.error("Please select at least one category.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let urgency = aiUrgency;
      let score = aiScore;
      if (!urgency) {
        const result = await getUrgency(form.description);
        urgency = result.urgency;
        score = result.score ?? 0;
        setAiUrgency(urgency);
        setAiScore(score);
      }

      const finalCategories = form.categories.includes("Other") && customCategory.trim() 
        ? [...form.categories.filter(c => c !== "Other"), customCategory] 
        : form.categories;

      const finalSkills = form.requiredSkills.includes("Other") && customSkill.trim() 
        ? [...form.requiredSkills.filter(s => s !== "Other"), customSkill] 
        : form.requiredSkills;

      const response = await createProblem({ 
        title: form.title,
        description: form.description,
        category: finalCategories, // Now sending array
        requiredSkills: finalSkills, // Now sending array
        urgency, 
        score: score ?? 0, 
        location: {
          lat: location?.lat || 22.3,
          lng: location?.lng || 87.3,
          address: address || ""
        } 
      });
      
      toast.success("Problem submitted successfully!");

      // 🔥 Emit to OPS Command Center
      socket.emit("new_crisis", {
        title: form.title,
        urgency: urgency,
        location: { lat: location?.lat, lng: location?.lng },
        message: form.description
      });
      
      // Show matched volunteer info if available
      if (response?.matched?.length > 0) {
        const top = response.matched[0];
        toast(`🎯 AI matched ${response.matched.length} volunteer${response.matched.length > 1 ? 's' : ''}! Top: ${top.name || top.email}`, {
          icon: "🤖",
          duration: 6000,
          style: { background: "#1e3a8a", color: "#bfdbfe", fontWeight: "600" }
        });
      }
      setSuccess(true);
      setForm({ title: "", description: "", categories: [], requiredSkills: [] });
      setCustomCategory("");
      setCustomSkill("");
      setAiUrgency(null);
      setAiScore(null);
    } catch (err) {
      console.error("🚨 SUBMISSION FAILED:", err);
      if (err.message && err.message.includes("401")) {
        toast.error("Session expired or unauthorized. Please log out and log in again.");
      } else {
        toast.error(`Failed to submit: ${err.message || "Make sure the backend is running."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)]">
        <Navbar />
        <PageWrapper>
        <div className="max-w-lg mx-auto px-6 py-40 text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-7xl mb-8"
          >
            ✅
          </motion.div>
          <h1 className="text-4xl font-extrabold tracking-tight gradient-text mb-4">Transmission Successful</h1>
          <p className="text-[var(--text-secondary)] mb-10 text-sm font-medium">
            AI has classified this incident as{" "}
            <span className={`badge ${URGENCY_INFO[aiUrgency]?.color} !text-[10px] !px-4`}>
              {aiUrgency}
            </span>{" "}
            priority. Emergency protocols initiated.
          </p>
          <div className="flex gap-4 justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSuccess(false)}
              className="btn-primary !px-8 !py-4"
            >
              Report Another
            </motion.button>
            <Link href="/problems">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="btn-secondary !px-8 !py-4"
              >
                View Network
              </motion.button>
            </Link>
          </div>
        </div>
        </PageWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition duration-300">
      <Navbar />
      <PageWrapper>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-32 pb-20">
        <div className="max-w-2xl mx-auto card !p-8 sm:!p-12 shadow-2xl border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight gradient-text">
              Report Crisis
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-3 font-medium max-w-sm mx-auto">
              Our AI coordination engine will instantly analyze urgency and broadcast to nearby responders.
            </p>
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                SevaLink Intelligence Active
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Title */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Crisis Header *</label>
              <input
                type="text"
                placeholder="e.g. Structural failure at East Bridge"
                value={form.title}
                onChange={updateForm("title")}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-[var(--primary)] outline-none transition-all placeholder-white/10"
              />
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Incident Report *</label>
              <div className="relative group">
                <textarea
                  placeholder="Provide detailed context for AI assessment..."
                  value={form.description}
                  onChange={updateForm("description")}
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-6 py-5 text-sm focus:border-[var(--primary)] outline-none transition-all placeholder-white/10 resize-none"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button 
                    type="button" 
                    onClick={analyzeUrgency} 
                    disabled={!form.description.trim() || aiLoading} 
                    className="btn-secondary !text-[9px] !px-4 !py-2 !rounded-xl !bg-black/40 backdrop-blur-md border-white/5 hover:!border-white/20"
                  >
                    {aiLoading ? "Analyzing..." : "🤖 Get AI Score"}
                  </button>
                  <button 
                    type="button" 
                    onClick={getAISuggestionHandler} 
                    disabled={!form.description.trim() || suggestLoading} 
                    className="btn-secondary !text-[9px] !px-4 !py-2 !rounded-xl !bg-black/40 backdrop-blur-md !text-purple-400 border-purple-500/20 hover:!border-purple-500/40"
                  >
                    {suggestLoading ? "Thinking..." : "🤖 Refine"}
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
                    <div className="mt-4 p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10 shadow-inner">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs">🤖</span>
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Optimized Version</p>
                      </div>
                      <p className="text-sm italic text-gray-300 leading-relaxed mb-4">"{aiSuggestion}"</p>
                      <button type="button" onClick={applySuggestion} className="btn-primary !text-[9px] !px-4 !py-2 !bg-purple-600 shadow-none">Apply Suggestion</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Severity */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Your Severity Estimate</label>
              <select
                value={form.userSeverity || "Medium"}
                onChange={(e) => setForm(prev => ({ ...prev, userSeverity: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-[var(--primary)] outline-none transition-all text-white"
              >
                <option value="Low">Low (No immediate danger)</option>
                <option value="Medium">Medium (Minor risk)</option>
                <option value="High">High (Serious issue)</option>
                <option value="Critical">Critical (Life-threatening)</option>
              </select>
            </div>

            {/* AI Urgency Result */}
            <AnimatePresence>
              {aiUrgency && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col gap-3"
                >
                  <div className="card !bg-white/[0.02] border-white/10 flex items-center gap-6 p-6">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">🤖</div>
                    <div className="flex-1">
                      <div className={`text-sm font-bold uppercase tracking-tight ${URGENCY_INFO[aiUrgency]?.color}`}>{aiUrgency} Priority</div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium">{URGENCY_INFO[aiUrgency]?.desc}</div>
                    </div>
                    {aiScore !== null && (
                      <div className="text-right">
                        <div className={`text-3xl font-extrabold ${URGENCY_INFO[aiUrgency]?.color} tracking-tighter`}>{aiScore}%</div>
                        <div className="text-[8px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-0.5">Confidence</div>
                      </div>
                    )}
                  </div>
                  {aiUrgency !== form.userSeverity && aiScore > 70 && (
                    <div className="text-yellow-400 text-sm font-bold bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-xl flex items-center gap-2">
                      ⚠️ AI upgraded severity to {aiUrgency}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Multi-select Pills */}
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Incident Categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleSelection("categories", c)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-bold border uppercase tracking-widest transition-all ${
                        form.categories.includes(c)
                          ? "bg-purple-600 text-white border-transparent shadow-lg shadow-purple-500/20"
                          : "bg-white/5 text-[var(--text-secondary)] border-white/5 hover:border-white/10 hover:text-white"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Operational Skills Needed</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSelection("requiredSkills", s)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-bold border uppercase tracking-widest transition-all ${
                        form.requiredSkills.includes(s)
                          ? "bg-purple-600 text-white border-transparent shadow-lg shadow-purple-500/20"
                          : "bg-white/5 text-[var(--text-secondary)] border-white/5 hover:border-white/10 hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex flex-col gap-1 ml-1 mb-1">
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Mission Geolocation *</label>
                  <p className="text-[9px] text-gray-500 font-medium">Auto-detecting real-time coordinates for precise response.</p>
                </div>
                <div className="flex gap-3">
                  <input
                    placeholder="Search location or enter address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-[var(--primary)] outline-none transition-all placeholder-white/10"
                  />
                  <button 
                    type="button" 
                    onClick={handleUseMyLocation} 
                    className="btn-secondary !px-6 !text-[10px] !uppercase !tracking-widest"
                  >
                    Auto Detect Location
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="h-[300px] rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 group relative">
                  <MapPicker setLocation={setLocation} setAddress={setAddress} initialLocation={location} />
                  {!location && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/20 transition-opacity opacity-100 group-hover:opacity-0">
                      <p className="text-[10px] font-bold text-white uppercase tracking-widest">Pin exact location on map</p>
                    </div>
                  )}
                </div>
                {location && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest ml-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Geolocation Locked
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action Card */}
            <div className="pt-6">
              <div className="card !bg-white/5 border-white/10 p-8 flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="btn-glow !px-12 !py-4 !text-sm !rounded-2xl shadow-[0_20px_50px_var(--primary-glow)] active:scale-95 disabled:opacity-50 group flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="loader-small"></div>
                  ) : (
                    <>
                      Submit
                      <span className="text-xl group-hover:translate-x-2 transition-transform">→</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      </main>
      </PageWrapper>
    </div>
  );
}
