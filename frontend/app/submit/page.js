"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { createProblem, getUrgency, getAISuggestion } from "../utils/api";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { getUserLocation } from "../utils/location";

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
    setForm(prev => ({ ...prev, description: aiSuggestion }));
    setAiSuggestion("");
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
      
      console.log("📥 SUBMIT RESPONSE:", response);
      
      toast.success("Problem submitted successfully!");
      
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
      setForm({ title: "", description: "", category: "", requiredSkill: "" });
      setCustomCategory("");
      setCustomSkill("");
      setAiUrgency(null);
      setAiScore(null);
    } catch (err) {
      console.error("🚨 SUBMISSION FAILED:", err);
      // Log the error message if it exists
      if (err.message) {
        console.log("❌ ERROR DETAILS:", err.message);
      }
      toast.error("Failed to submit. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition duration-200">
        <Navbar />
        <PageWrapper>
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <div className="text-7xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Problem Submitted!</h1>
          <p className="text-slate-500 mb-8">
            AI classified it as{" "}
            <span className={URGENCY_INFO[aiUrgency]?.color || "text-slate-900"}>
              {aiUrgency}
            </span>{" "}
            urgency. The community will respond.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSuccess(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200 shadow-sm font-medium"
            >
              Submit Another
            </button>
            <a
              href="/problems"
              className="px-6 py-3 rounded-xl text-slate-300 font-medium border border-white/10 hover:bg-white/5 transition-colors"
            >
              View All Problems
            </a>
          </div>
        </div>
        </PageWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="max-w-2xl mx-auto bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-10 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Report a Problem</h1>
            <p className="text-[var(--muted)] text-sm mt-1">
              Describe the issue and our AI will assess urgency and match help.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 text-[10px] font-bold text-[var(--primary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              ⚡ AI Urgency Detection
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Problem Title *</label>
              <input
                type="text"
                placeholder="e.g. No clean water in Block C"
                value={form.title}
                onChange={updateForm("title")}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm focus:ring-2 focus:ring-[var(--primary)] transition outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Description *</label>
              <textarea
                placeholder="Describe the situation in detail..."
                value={form.description}
                onChange={updateForm("description")}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm focus:ring-2 focus:ring-[var(--primary)] transition outline-none resize-none"
              />
              <div className="flex flex-wrap gap-4 mt-2">
                <button type="button" onClick={analyzeUrgency} disabled={!form.description.trim() || aiLoading} className="text-[10px] font-bold text-[var(--primary)] hover:opacity-80 disabled:opacity-30">
                  {aiLoading ? "Analyzing..." : "🤖 Analyze Urgency"}
                </button>
                <button type="button" onClick={getAISuggestionHandler} disabled={!form.description.trim() || suggestLoading} className="text-[10px] font-bold text-purple-500 hover:opacity-80 disabled:opacity-30">
                  {suggestLoading ? "Thinking..." : "🤖 AI Suggestion"}
                </button>
              </div>

              {aiSuggestion && (
                <div className="mt-4 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                  <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-2">AI Version:</p>
                  <p className="text-sm italic opacity-80 mb-3">"{aiSuggestion}"</p>
                  <button type="button" onClick={applySuggestion} className="bg-purple-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold hover:opacity-90">Apply</button>
                </div>
              )}
            </div>

            {/* AI Urgency Result */}
            {aiUrgency && (
              <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center gap-4">
                <div className="text-2xl">🤖</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${URGENCY_INFO[aiUrgency]?.color}`}>{aiUrgency} Urgency</div>
                  <div className="text-[10px] text-[var(--muted)] truncate">{URGENCY_INFO[aiUrgency]?.desc}</div>
                </div>
                {aiScore !== null && (
                  <div className="text-right">
                    <div className={`text-lg font-bold ${URGENCY_INFO[aiUrgency]?.color}`}>{aiScore}%</div>
                    <div className="text-[8px] text-[var(--muted)] font-bold uppercase tracking-widest">Score</div>
                  </div>
                )}
              </div>
            )}

            {/* Multiple Selects (Pills) */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Categories (Select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleSelection("categories", c)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        form.categories.includes(c)
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-indigo-500/20"
                          : "bg-[var(--bg)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--primary)]/50"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {form.categories.includes("Other") && (
                  <input
                    type="text"
                    placeholder="Enter custom category..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-3 w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Required Skills</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSelection("requiredSkills", s)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        form.requiredSkills.includes(s)
                          ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20"
                          : "bg-[var(--bg)] text-[var(--muted)] border-[var(--border)] hover:border-purple-500/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {form.requiredSkills.includes("Other") && (
                  <input
                    type="text"
                    placeholder="Enter custom skill..."
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    className="mt-3 w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                )}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Address / Neighborhood</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    placeholder="Enter address manually"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                  />
                  <button type="button" onClick={handleUseMyLocation} className="px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-xs font-bold hover:bg-[var(--card)] active:scale-95 transition">
                    📍 Locate Me
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Pin on Map</label>
                <div className="h-[250px] sm:h-[300px] rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg)]">
                  <MapPicker setLocation={setLocation} setAddress={setAddress} initialLocation={location} />
                </div>
                {location && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Coordinates Saved
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--primary)] text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-indigo-500/20 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Submitting Report..." : "Submit Crisis Report"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
