"use client";
import { useState } from "react";
import { login } from "../utils/auth";
import { registerUser } from "../utils/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import PageWrapper from "../components/PageWrapper";

const MapPicker = dynamic(() => import("../components/MapPicker"), { ssr: false });



const ROLES = ["Reporter", "Volunteer", "NGO", "Worker"];

const ROLE_INFO = {
  Reporter: { icon: "", desc: "Report civic problems in your area" },
  Volunteer: { icon: "", desc: "Help solve problems with your skills" },
  NGO: { icon: "", desc: "Coordinate large-scale relief efforts" },
  Worker: { icon: "", desc: "On-ground support under an NGO" },
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

const INPUT_CLS = "auth-input";

export default function RegisterPage() {
  const [form, setForm] = useState({ role: "Reporter" });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

    // Strong Password Validation
    const passRegex = /^(?=.*[!@#$%^&*])(?=.*\d{4,}).{6,}$/;
    if (!passRegex.test(form.password)) {
      setError("Password must be 6+ chars with 4+ numbers and 1 special char.");
      return;
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
          role: form.role === "Reporter" ? "user" : form.role.toLowerCase(),
          name: form.name,
          username: form.username,
          email: form.email,
          phone: form.phone,
          password: form.password,
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
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setLocation({ lat, lng });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          setAddress(data.display_name);
        } catch {
          setAddress("Detected location");
        }
      },
      () => {
        alert("Please allow location access");
      }
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.12), transparent 45%)," +
          "radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.10), transparent 45%)," +
          "var(--bg-main)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <PageWrapper>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 26, fontWeight: 800,
              background: "linear-gradient(135deg,#fff 30%,#a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 6,
            }}
          >
            Create your account
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Join SevaLink — pick your role to get started
          </p>
        </div>

        <div className="auth-card" style={{ padding: 28 }}>
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Role selector */}
            <div>
              <label className="section-label" style={{ display: "block", marginBottom: 10 }}>
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
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: form.role === role
                        ? "1px solid rgba(99,102,241,0.5)"
                        : "1px solid var(--glass-border)",
                      background: form.role === role
                        ? "rgba(99,102,241,0.15)"
                        : "rgba(255,255,255,0.03)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                      boxShadow: form.role === role
                        ? "0 4px 12px rgba(99,102,241,0.2)"
                        : "none",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{ROLE_INFO[role].icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: form.role === role ? "white" : "var(--text-primary)" }}>{role}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
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
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      onChange={update("password")}
                      className={INPUT_CLS}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, fontWeight: 500 }}
                      className="hover:text-white transition-colors"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* NGO-specific fields */}
            {form.role === "NGO" && (
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                <p className="text-xs font-semibold text-indigo-300 mb-1">
                  NGO Registration
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
                  <div className="relative">
                    <input
                      id="reg-ngo-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      onChange={update("password")}
                      className={INPUT_CLS}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, fontWeight: 500 }}
                      className="hover:text-white transition-colors"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Location — manual + map pin */}
            <div className="pt-2">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Address *</label>
                  <input
                    placeholder="Enter your street address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={INPUT_CLS}
                    required
                  />
                </div>
                
                <button
                  type="button"
                  id="detect-location-btn"
                  onClick={detectLocation}
                  style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--primary-light)", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer", transition: "color 0.2s ease" }}
                  className="hover:text-white"
                >
                  Auto Detect GPS
                </button>
              </div>
              
              {/* Show Selected Location */}
              {location && (
                <p style={{ fontSize: 12, color: "var(--primary-light)", marginTop: 8, textAlign: "center", fontWeight: 500 }}>
                  GPS Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              )}

              {/* Pin-to-map restoration */}
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Pin your location on map <span style={{ color: "var(--text-muted)" }}>(click on map)</span></p>
                <div style={{ height: 220, borderRadius: 12, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                  <MapPicker 
                    setLocation={setLocation} 
                    setAddress={setAddress} 
                  />
                </div>
                {location && (
                  <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#4ade80", marginTop: 8, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
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
                    ? "Select your skills"
                    : "Select your skills"}
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

                {/* Volunteer/Worker bio */}
                {(form.role === "Volunteer" || form.role === "Worker") && (
                  <textarea
                    id={`reg-${form.role.toLowerCase()}-bio`}
                    placeholder="Describe your experience, background or special skills..."
                    onChange={update("bio")}
                    className={`${INPUT_CLS} h-24 resize-none`}
                  />
                )}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", padding: "13px", fontSize: 14, marginTop: 4, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <span className="loader-small" />
                  Creating account…
                </>
              ) : (
                "CREATE ACCOUNT"
              )}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--primary-light)", fontWeight: 600 }}>SIGN IN</Link>
          </p>
        </div>
      </div>
      </PageWrapper>
    </div>
  );
}
