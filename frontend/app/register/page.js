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
  "Medical Aid", "Food Supply", "Shelter Support", "Rescue Ops", "Infrastructure", "Fire Safety", "Civil Safety", "Industrial", "Education", "Medicine Supply", "Technical Support", "Other"
];

const INPUT_CLS = "auth-input";

export default function RegisterPage() {
  const [form, setForm] = useState({ role: "Reporter" });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
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
          bio: form.bio || ""
        };

    setLoading(true);
    setError("");
    try {
      const user = await registerUser(data);
      login(user);
      router.push("/");
    } catch (err) {
      console.error("❌ Registration Error:", err);
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const needsSkills = form.role === "Volunteer" || form.role === "Worker";

  const detectLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          setAddress(data.display_name);
        } catch {
          setAddress("Detected location");
        }
      },
      () => alert("Please allow location access")
    );
  };

  return (
    <div className="min-h-screen bg-[#080B14] flex items-center justify-center p-6 font-inter">
      <PageWrapper>
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Create Account</h1>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Join SevaLink Tactical Grid</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleRegister} className="space-y-6">

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4">Tactical Role</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role} type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role }))}
                    className={`flex flex-col p-4 rounded-2xl border transition-all text-left ${form.role === role ? "border-purple-500/50 bg-purple-500/10" : "border-white/5 bg-white/[0.02] opacity-60"}`}
                  >
                    <span className="text-xs font-black text-white uppercase mb-1">{role}</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tight leading-tight">{ROLE_INFO[role].desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {form.role !== "NGO" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Full Name *" onChange={update("name")} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" required />
                <input placeholder="Username" onChange={update("username")} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" />
                <input type="tel" placeholder="Phone" onChange={update("phone")} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" />
                <input type="email" placeholder="Email *" onChange={update("email")} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" required />
                <div className="md:col-span-2 relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Password *" onChange={update("password")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase">{showPassword ? "Hide" : "Show"}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input placeholder="NGO Name *" onChange={update("ngoName")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="email" placeholder="NGO Email *" onChange={update("email")} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" required />
                  <input type="tel" placeholder="NGO Phone" onChange={update("phone")} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" />
                </div>
                <input placeholder="Website / Contact" onChange={update("ngoContact")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" />
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Password *" onChange={update("password")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase">{showPassword ? "Hide" : "Show"}</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Address & GPS</label>
                <button type="button" onClick={detectLocation} className="text-[9px] font-black text-purple-400 uppercase tracking-widest">📍 Auto-Detect</button>
              </div>
              <input placeholder="Full Address *" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white" required />
              <div className="h-40 rounded-2xl overflow-hidden border border-white/5">
                <MapPicker setLocation={setLocation} setAddress={setAddress} />
              </div>
            </div>

            {needsSkills && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Select Tactical Expertise</p>
                <div className="grid grid-cols-2 gap-3">
                  {SKILLS_LIST.map((skill) => (
                    <label key={skill} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" value={skill} checked={selectedSkills.includes(skill)} onChange={(e) => toggleSkill(skill, e.target.checked)} className="accent-purple-600" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase group-hover:text-white transition-colors">{skill}</span>
                    </label>
                  ))}
                </div>
                {(form.role === "Volunteer" || form.role === "Worker") && (
                  <textarea placeholder="Tell us about your mission experience..." onChange={update("bio")} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white h-24 resize-none" />
                )}
              </div>
            )}

            {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase text-center">{error}</div>}

            <div className="flex justify-center">
              <button 
                type="submit" disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white w-full py-4 text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-emerald-500/10 transition-all active:scale-95"
              >
                {loading ? "INITIALIZING..." : "CREATE ACCOUNT"}
              </button>
            </div>
          </form>
          <p className="text-center mt-6 text-[10px] text-gray-600 font-black uppercase tracking-widest">Already Registered? <Link href="/login" className="text-purple-400">Sign In</Link></p>
        </div>
      </div>
      </PageWrapper>
    </div>
  );
}
