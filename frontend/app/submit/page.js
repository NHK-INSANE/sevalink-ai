"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { createProblem, getUrgency } from "../utils/api";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

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
  const [location, setLocation] = useState({ lat: 22.3, lng: 87.3, address: "" });
  const [aiUrgency, setAiUrgency] = useState(null);
  const [aiScore, setAiScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
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
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const d = await r.json();
        setLocation({ lat, lng, address: d.display_name || "" });
      } catch {
        setLocation({ lat, lng, address: "" });
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

      await createProblem({ ...form, urgency, score: score ?? 0, location });
      toast.success("Problem submitted! AI classified it as " + urgency + " urgency.");
      setSuccess(true);
      setForm({ title: "", description: "", category: "", requiredSkill: "" });
      setAiUrgency(null);
      setAiScore(null);
    } catch {
      toast.error("Failed to submit. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <div className="text-7xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-white mb-3">Problem Submitted!</h1>
          <p className="text-slate-400 mb-8">
            AI classified it as{" "}
            <span className={URGENCY_INFO[aiUrgency]?.color || "text-white"}>
              {aiUrgency}
            </span>{" "}
            urgency. The community will respond.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSuccess(false)}
              className="btn-primary px-6 py-3 rounded-xl text-white font-medium"
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <motion.main
        className="max-w-2xl mx-auto px-6 py-12"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Report a Problem
          </h1>
          <p className="text-slate-400">
            Describe the issue and our AI will instantly assess urgency and
            match volunteers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Problem Title *
            </label>
            <input
              id="problem-title"
              type="text"
              placeholder="e.g. No clean water in Block C"
              value={form.title}
              onChange={updateForm("title")}
              className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description *
            </label>
            <textarea
              id="problem-description"
              placeholder="Describe the situation in detail — who is affected, since when, what is urgently needed…"
              value={form.description}
              onChange={updateForm("description")}
              rows={5}
              className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
            />
            <button
              type="button"
              onClick={analyzeUrgency}
              disabled={!form.description.trim() || aiLoading}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              {aiLoading ? (
                <>
                  <span className="w-3 h-3 border border-indigo-400/50 border-t-indigo-400 rounded-full animate-spin inline-block" />
                  Analyzing…
                </>
              ) : (
                "🤖 Analyze urgency with AI"
              )}
            </button>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category
              </label>
              <select
                id="problem-category"
                value={form.category}
                onChange={updateForm("category")}
                className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all bg-[#12121a] cursor-pointer"
              >
                <option value="">Select…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Required Skill
              </label>
              <select
                id="problem-skill"
                value={form.requiredSkill}
                onChange={updateForm("requiredSkill")}
                className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all bg-[#12121a] cursor-pointer"
              >
                <option value="">Select…</option>
                {SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Location
            </label>
            <div className="glass border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-slate-400 text-sm flex-1 truncate">
                {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
              </span>
              <button
                type="button"
                onClick={detectLocation}
                className="ml-3 text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap transition-colors"
              >
                📍 Detect
              </button>
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
            className="w-full btn-primary py-4 rounded-xl text-white font-semibold text-base disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Getting AI urgency & submitting…
              </>
            ) : (
              "Submit Problem"
            )}
          </button>
        </form>
      </motion.main>
    </div>
  );
}
