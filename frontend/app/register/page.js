"use client";
import { useState } from "react";
import { login } from "../utils/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ROLES = ["User", "Volunteer", "NGO", "Worker"];

const ROLE_INFO = {
  User: { icon: "👤", desc: "Report civic problems in your area" },
  Volunteer: { icon: "🤝", desc: "Help solve problems with your skills" },
  NGO: { icon: "🏢", desc: "Coordinate large-scale relief efforts" },
  Worker: { icon: "🔧", desc: "On-ground support under an NGO" },
};

const SKILLS = [
  "Medical Aid", "Food Supply", "Engineering", "Logistics",
  "Education", "Social Work", "IT Support", "Legal Aid", "Other",
];

export default function RegisterPage() {
  const [form, setForm] = useState({ role: "User" });
  const [error, setError] = useState("");
  const router = useRouter();

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Name, email and password are required.");
      return;
    }
    if (form.role === "NGO" && !form.ngoName) {
      setError("Please enter your NGO name.");
      return;
    }
    login(form);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl btn-primary flex items-center justify-center text-lg font-bold text-white">
              S
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">
              Seva<span className="text-indigo-400">Link</span>{" "}
              <span className="text-purple-400 text-base font-medium">AI</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 mt-1 text-sm">Join the community — pick your role below</p>
        </div>

        <div className="glass rounded-2xl p-8 border border-white/8">
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Role selector */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">I am a…</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                      form.role === role
                        ? "border-indigo-500/60 bg-indigo-600/15 text-indigo-300"
                        : "border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-300"
                    }`}
                  >
                    <span>{ROLE_INFO[role].icon}</span>
                    <div>
                      <div className="leading-tight">{role}</div>
                      <div className="text-[10px] text-slate-500 font-normal leading-tight">
                        {ROLE_INFO[role].desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Core fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name *</label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Rahul Sharma"
                  onChange={update("name")}
                  className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  onChange={update("phone")}
                  className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email *</label>
              <input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                onChange={update("email")}
                className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password *</label>
              <input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                onChange={update("password")}
                className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">📍 Your Location</label>
              <input
                id="reg-address"
                type="text"
                placeholder="e.g. Kolkata, West Bengal"
                onChange={update("address")}
                className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
              />
            </div>

            {/* Role-based extra fields */}
            {form.role === "NGO" && (
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                <p className="text-xs font-semibold text-indigo-300 mb-2">🏢 NGO Details</p>
                <input
                  id="reg-ngo-name"
                  type="text"
                  placeholder="Organisation Name *"
                  onChange={update("ngoName")}
                  className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                />
                <input
                  id="reg-ngo-contact"
                  type="text"
                  placeholder="Public Contact / Website"
                  onChange={update("ngoContact")}
                  className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                />
              </div>
            )}

            {form.role === "Volunteer" && (
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                <p className="text-xs font-semibold text-emerald-300 mb-2">🤝 Volunteer Details</p>
                <select
                  id="reg-volunteer-skill"
                  onChange={update("skill")}
                  className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm bg-[#12121a] cursor-pointer"
                >
                  <option value="">Select your primary skill…</option>
                  {SKILLS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  id="reg-volunteer-bio"
                  type="text"
                  placeholder="Short bio (optional)"
                  onChange={update("bio")}
                  className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                />
              </div>
            )}

            {form.role === "Worker" && (
              <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 space-y-3">
                <p className="text-xs font-semibold text-orange-300 mb-2">🔧 Worker Details</p>
                <select
                  id="reg-worker-skill"
                  onChange={update("skill")}
                  className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm bg-[#12121a] cursor-pointer"
                >
                  <option value="">Select your skill…</option>
                  {SKILLS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  id="reg-worker-ngo"
                  type="text"
                  placeholder="NGO / Organisation you work under"
                  onChange={update("ngoLink")}
                  className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                />
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                ⚠️ {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              className="w-full btn-primary py-3 rounded-xl text-white font-semibold text-sm mt-2"
            >
              Create Account →
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
