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
    category: "",
    requiredSkill: "",
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

      const finalCategory = form.category === "Other" && customCategory.trim() ? customCategory : form.category;
      const finalSkill = form.requiredSkill === "Other" && customSkill.trim() ? customSkill : form.requiredSkill;

      const response = await createProblem({ 
        ...form, 
        category: finalCategory, 
        requiredSkill: finalSkill, 
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 transition duration-200">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 transition duration-200">
      <Navbar />
      <PageWrapper>
        <main className="max-w-2xl mx-auto px-4 md:px-10 py-12 bg-white rounded-2xl shadow-md p-5 border border-gray-100 transition duration-200 mt-6 mb-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Report a Problem
          </h1>
          <p className="text-slate-400">
            Describe the issue and our AI will instantly assess urgency and
            match volunteers.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
            ⚡ AI-powered urgency detection
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Problem Title *
            </label>
            <input
              id="problem-title"
              type="text"
              placeholder="e.g. No clean water in Block C"
              value={form.title}
              onChange={updateForm("title")}
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Description *
            </label>
            <textarea
              id="problem-description"
              placeholder="Describe the situation in detail — who is affected, since when, what is urgently needed…"
              value={form.description}
              onChange={updateForm("description")}
              rows={5}
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 resize-none"
            />
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={analyzeUrgency}
                disabled={!form.description.trim() || aiLoading}
                className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                {aiLoading ? "Analyzing…" : "🤖 Analyze Urgency"}
              </button>
              <button
                type="button"
                onClick={getAISuggestionHandler}
                disabled={!form.description.trim() || suggestLoading}
                className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                {suggestLoading ? "Thinking…" : "🤖 Improve with AI"}
              </button>
            </div>

            {aiSuggestion && (
              <div className="mt-4 p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/30">
                <p className="text-xs text-indigo-300 font-bold mb-1 uppercase tracking-wider">AI Suggested Version:</p>
                <p className="text-sm text-slate-200 mb-3 leading-relaxed italic">"{aiSuggestion}"</p>
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 shadow-sm text-xs mt-3"
                >
                  Apply Suggestion
                </button>
              </div>
            )}
          </div>

          {/* AI Urgency Result */}
          {aiUrgency && URGENCY_INFO[aiUrgency] && (
            <div
              className={`p-4 rounded-xl border ${URGENCY_INFO[aiUrgency].bg} flex items-center gap-3`}
            >
              <span className="text-2xl">🤖</span>
              <div className="flex-1">
                <div className={`font-semibold ${URGENCY_INFO[aiUrgency].color}`}>
                  {aiUrgency} Urgency
                </div>
                <div className="text-xs text-slate-500">
                  {URGENCY_INFO[aiUrgency].desc}
                </div>
                <div className="text-[10px] text-indigo-400/70 mt-0.5 font-medium">
                  ⚡ Powered by Gemini AI
                </div>
              </div>
              {aiScore !== null && (
                <div className="text-right">
                  <div className={`text-2xl font-bold ${URGENCY_INFO[aiUrgency].color}`}>
                    {aiScore}
                  </div>
                  <div className="text-xs text-slate-500">/ 100</div>
                </div>
              )}
            </div>
          )}

          {/* Category & Skill */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Category
              </label>
              <select
                id="problem-category"
                value={form.category}
                onChange={updateForm("category")}
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 cursor-pointer appearance-none bg-white"
              >
                <option value="">Select…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {form.category === "Other" && (
                <input
                  type="text"
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 mt-3"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Required Skill
              </label>
              <select
                id="problem-skill"
                value={form.requiredSkill}
                onChange={updateForm("requiredSkill")}
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 cursor-pointer appearance-none bg-white"
              >
                <option value="">Select…</option>
                {SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {form.requiredSkill === "Other" && (
                <input
                  type="text"
                  placeholder="Enter custom skill"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 mt-3"
                />
              )}
            </div>
          </div>
          {/* Location */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Address / Neighborhood
              </label>
              <input
                placeholder="Enter address manually"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              />
            </div>

            <button
              type="button"
              onClick={handleUseMyLocation}
              className="ripple bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm text-gray-700 transition duration-200 inline-block hover:scale-105 active:scale-95"
            >
              📍 Use My Location
            </button>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-300 mb-2">Pin your location on map <span className="text-gray-400 font-normal opacity-50">(click on map)</span></p>
              <div style={{ height: "300px" }} className="rounded-xl overflow-hidden border border-white/10 shadow-lg bg-slate-900">
                <MapPicker 
                  setLocation={setLocation} 
                  setAddress={setAddress} 
                  initialLocation={location}
                />
              </div>
              {location && (
                <p className="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Pin: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="submit-problem-btn"
            type="submit"
            disabled={loading}
            className="ripple w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition duration-200 shadow-sm text-base font-medium disabled:opacity-60 flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting Crisis Report…
              </>
            ) : (
              "Submit Problem"
            )}
          </button>
        </form>
        </main>
      </PageWrapper>
    </div>
  );
}
