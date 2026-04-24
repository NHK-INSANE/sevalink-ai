"use client";
import { useState } from "react";
import { login } from "../utils/auth";
import { loginUser } from "../utils/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [mode, setMode] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await loginUser(form);
      login(user);
      router.push("/");
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
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
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">SEVALINK AI</h2>
          </div>
          <h1
            style={{
              fontSize: 28, fontWeight: 800,
              background: "linear-gradient(135deg,#fff 30%,#a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 6,
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Sign in to SevaLink AI to continue
          </p>
        </div>

        {/* Card */}
        <div className="auth-card" style={{ padding: 28 }}>

          {/* Mode Tabs */}
          <div
            style={{
              display: "flex",
              gap: 6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--glass-border)",
              borderRadius: 12,
              padding: 4,
              marginBottom: 24,
            }}
          >
            {[
              { key: "user", label: "User / Volunteer" },
              { key: "ngo",  label: "NGO Login" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                style={{
                  flex: 1, padding: "9px 12px",
                  borderRadius: 9,
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.2s ease",
                  background: mode === tab.key
                    ? "var(--primary-gradient)"
                    : "transparent",
                  color: mode === tab.key ? "white" : "var(--text-secondary)",
                  boxShadow: mode === tab.key
                    ? "0 4px 12px rgba(99,102,241,0.3)"
                    : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Identifier */}
            <div>
              <label
                style={{
                  display: "block", fontSize: 12, fontWeight: 600,
                  color: "var(--text-secondary)", marginBottom: 7,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}
              >
                {mode === "ngo" ? "NGO Name or Email" : "Email / Username / Phone"}
              </label>
              <input
                id="login-identifier"
                type="text"
                placeholder={mode === "ngo" ? "org@example.com" : "you@example.com"}
                value={form.identifier}
                onChange={update("identifier")}
                className="auth-input"
                style={{ width: "100%", padding: "12px 16px" }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: "block", fontSize: 12, fontWeight: 600,
                  color: "var(--text-secondary)", marginBottom: 7,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update("password")}
                  className="auth-input"
                  style={{ width: "100%", padding: "12px 44px 12px 16px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)", background: "none",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center",
                    transition: "color 0.2s ease",
                  }}
                  className="hover:text-white"
                >
                  <span className="text-[10px] font-black uppercase">{showPassword ? "HIDE" : "SHOW"}</span>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 10,
                  color: "#f87171",
                  fontSize: 13,
                }}
              >
                <span className="text-[10px] font-black uppercase mr-2">Error:</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: "100%", padding: "13px",
                fontSize: 14, marginTop: 4,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <span className="loader-small" />
                  Signing in…
                </>
              ) : (
                "SIGN IN"
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
            No account?{" "}
            <Link href="/register" style={{ color: "var(--primary-light)", fontWeight: 600, transition: "color 0.2s" }}>
              CREATE ONE
            </Link>
          </p>
        </div>

        {/* Subtle tagline */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Connecting communities to crisis response<br />through AI-powered coordination.
        </p>
      </div>
    </div>
  );
}
