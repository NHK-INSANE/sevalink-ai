"use client";
import { useState } from "react";
import { login } from "../utils/auth";
import { registerUser } from "../utils/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LocationPicker from "../components/LocationPicker";

const ROLES = ["User", "Volunteer", "NGO", "Worker"];

const ROLE_INFO = {
  User: { icon: "👤", desc: "Report civic problems in your area" },
  Volunteer: { icon: "🤝", desc: "Help solve problems with your skills" },
  NGO: { icon: "🏢", desc: "Coordinate large-scale relief efforts" },
  Worker: { icon: "🔧", desc: "On-ground support under an NGO" },
};

const SKILLS_LIST = [
  "Medical Aid",
  "Food Supply",
  "Engineering",
  "Logistics",
  "Education",
  "Social Work",
  "IT Support",
  "Legal Aid",
  "Rescue",
  "Other",
];

const INPUT_CLS =
  "w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm";

export default function RegisterPage() {
  const [form, setForm] = useState({ role: "User" });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [pinnedLocation, setPinnedLocation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleSkill = (skill, checked) => {
    setSelectedSkills((prev) =>
      checked ? [...prev, skill] : prev.filter((s) => s !== skill)
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Name, email and password are required.");
      return;
    }
    if (form.role === "NGO" && !form.ngoName) {
      setError("Please enter your NGO name.");
      return;
    }

    const data = {
      ...form,
      skills: selectedSkills,
      // primary skill = first selected (for matching)
      skill: selectedSkills.includes("Other")
        ? form.otherSkill || "Other"
        : selectedSkills[0] || form.skill || "",
      location: pinnedLocation
        ? { lat: pinnedLocation.lat, lng: pinnedLocation.lng }
        : null,
    };

    setLoading(true);
    setError("");
    try {
      const user = await registerUser(data);
      login(user);
      router.push("/");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const needsSkills = form.role === "Volunteer" || form.role === "Worker";

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setForm((prev) => ({
          ...prev,
          address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
        }));
        setPinnedLocation({ lat, lng });
      },
      () => {
        alert("Unable to fetch your location. Please allow location access.");
      }
    );
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
          <p className="text-slate-400 mt-1 text-sm">
            Join the community — pick your role below
          </p>
        </div>

        <div className="glass rounded-2xl p-8 border border-white/8">
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Role selector */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                I am a…
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, role }))
                    }
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

            {/* Name + Username */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Rahul Sharma"
                  onChange={update("name")}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Username
                </label>
                <input
                  id="reg-username"
                  type="text"
                  placeholder="rahul99"
                  onChange={update("username")}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Phone
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  onChange={update("phone")}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  onChange={update("email")}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Password *
              </label>
              <input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                onChange={update("password")}
                className={INPUT_CLS}
              />
            </div>

            {/* Location — manual + map pin */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                📍 Your Location
              </label>
              <input
                id="reg-address"
                type="text"
                placeholder="e.g. Kolkata, West Bengal"
                value={form.address || ""}
                onChange={update("address")}
                className={`${INPUT_CLS} mb-2`}
              />
              <button
                type="button"
                id="detect-location-btn"
                onClick={detectLocation}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/60 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-all mb-2"
              >
                📍 Detect My Location
              </button>
              <LocationPicker
                onLocationSelect={(latlng) => setPinnedLocation(latlng)}
              />
            </div>

            {/* NGO details */}
            {form.role === "NGO" && (
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                <p className="text-xs font-semibold text-indigo-300 mb-1">
                  🏢 NGO Details
                </p>
                <input
                  id="reg-ngo-name"
                  type="text"
                  placeholder="Organisation Name *"
                  onChange={update("ngoName")}
                  className={INPUT_CLS}
                />
                <input
                  id="reg-ngo-contact"
                  type="text"
                  placeholder="Public Contact / Website"
                  onChange={update("ngoContact")}
                  className={INPUT_CLS}
                />
              </div>
            )}

            {/* Multi-skill for Volunteer + Worker */}
            {needsSkills && (
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  form.role === "Volunteer"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-orange-500/20 bg-orange-500/5"
                }`}
              >
                <p
                  className={`text-xs font-semibold mb-1 ${
                    form.role === "Volunteer"
                      ? "text-emerald-300"
                      : "text-orange-300"
                  }`}
                >
                  {form.role === "Volunteer"
                    ? "🤝 Select your skills"
                    : "🔧 Select your skills"}
                </p>

                {/* Checkbox grid */}
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {SKILLS_LIST.map((skill) => (
                    <label
                      key={skill}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        value={skill}
                        checked={selectedSkills.includes(skill)}
                        onChange={(e) => toggleSkill(skill, e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                        {skill}
                      </span>
                    </label>
                  ))}
                </div>

                {/* "Other" free-text */}
                {selectedSkills.includes("Other") && (
                  <input
                    id="reg-other-skill"
                    type="text"
                    placeholder="Describe your skill…"
                    onChange={update("otherSkill")}
                    className={INPUT_CLS}
                  />
                )}

                {/* Worker NGO link */}
                {form.role === "Worker" && (
                  <input
                    id="reg-worker-ngo"
                    type="text"
                    placeholder="NGO / Organisation you work under"
                    onChange={update("ngoLink")}
                    className={INPUT_CLS}
                  />
                )}

                {/* Volunteer bio */}
                {form.role === "Volunteer" && (
                  <input
                    id="reg-volunteer-bio"
                    type="text"
                    placeholder="Short bio (optional)"
                    onChange={update("bio")}
                    className={INPUT_CLS}
                  />
                )}
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
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl text-white font-semibold text-sm mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create Account →"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
