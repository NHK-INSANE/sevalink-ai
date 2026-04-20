"use client";
import { useState } from "react";
import { login } from "../utils/auth";
import { registerUser } from "../utils/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("../components/MapPicker"), { ssr: false });



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
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
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
    if (form.role === "NGO") {
      if (!form.ngoName || !form.email || !form.password) {
        setError("NGO Name, email and password are required.");
        return;
      }
    } else {
      if (!form.name || !form.email || !form.password) {
        setError("Name, email and password are required.");
        return;
      }
    }

    const data = form.role === "NGO" 
      ? {
          role: "ngo",
          name: form.ngoName,
          ngoName: form.ngoName,
          email: form.email,
          phone: form.phone,
          ngoContact: form.ngoContact,
          address: address || form.address || "",
          password: form.password,
          location: location ? { lat: location.lat, lng: location.lng } : null,
        }
      : {
          ...form,
          role: form.role.toLowerCase(),
          skills: selectedSkills,
          skill: selectedSkills.includes("Other")
            ? form.otherSkill || "Other"
            : selectedSkills[0] || form.skill || "",
          address: address || form.address || "",
          location: location ? { lat: location.lat, lng: location.lng } : null,
        };

    setLoading(true);
    setError("");
    try {
      const user = await registerUser(data);
      login(user);
      router.push("/");
    } catch (err) {
      console.error("❌ Registration Error:", err);
      if (err.message === "Failed to fetch") {
        console.error("💡 Tip: Is the backend server running or is there a CORS issue?");
      }
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
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
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
          console.error("GPS Reverse geocoding error:", err);
        }
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

            {/* ===== CONDITIONAL FIELDS BASED ON ROLE ===== */}

            {/* User / Volunteer / Worker fields */}
            {form.role !== "NGO" && (
              <>
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
              </>
            )}

            {/* NGO-specific fields */}
            {form.role === "NGO" && (
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                <p className="text-xs font-semibold text-indigo-300 mb-1">
                  🏢 NGO Registration
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">NGO Name *</label>
                  <input
                    id="reg-ngo-name"
                    type="text"
                    placeholder="Organisation Name"
                    onChange={update("ngoName")}
                    className={INPUT_CLS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">NGO Email *</label>
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="ngo@example.com"
                      onChange={update("email")}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">NGO Phone</label>
                    <input
                      id="reg-ngo-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      onChange={update("phone")}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">NGO Address</label>
                  <input
                    id="reg-ngo-address"
                    type="text"
                    placeholder="City / Full Address"
                    onChange={update("address")}
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Website / Contact</label>
                  <input
                    id="reg-ngo-contact"
                    type="text"
                    placeholder="https://yourorganisation.org"
                    onChange={update("ngoContact")}
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Password *</label>
                  <input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    onChange={update("password")}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            )}

            {/* Location — manual + map pin */}
            <div className="pt-2">
              <div className="space-y-3">
                <input
                  placeholder="Enter your street address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={INPUT_CLS}
                />
                
                <button
                  type="button"
                  id="detect-location-btn"
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      setLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                      });
                    });
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold text-[10px]"
                >
                  Auto-Detect GPS
                </button>
              </div>
              
              {/* Show Selected Location */}
              {location && (
                <p className="text-sm text-indigo-400 mt-2 text-center font-medium">
                  📍 GPS Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              )}

              {/* Pin-to-map restoration */}
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-300 mb-1">Pin your location on map <span className="text-gray-500">(click on map)</span></p>
                <div style={{ height: "250px" }} className="rounded-xl overflow-hidden border border-white/10 shadow-lg bg-slate-900">
                  <MapPicker 
                    setLocation={setLocation} 
                    setAddress={setAddress} 
                    initialLocation={location}
                  />
                </div>
                {location && (
                  <p className="text-xs text-emerald-400 mt-2.5 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Verified Pin: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                )}
              </div>
            </div>



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
