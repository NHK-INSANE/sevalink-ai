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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 transition duration-200">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-bold text-3xl text-blue-600 mb-2">SevaLink AI</h1>
          <h2 className="text-2xl font-bold text-gray-800">Welcome back</h2>
          <p className="text-gray-500 mt-1 text-sm">Login to continue helping your community</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 transition duration-200">

          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-50 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setMode("user")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition duration-200 ${
                mode === "user"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              👤 User / Volunteer
            </button>
            <button
              type="button"
              onClick={() => setMode("ngo")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition duration-200 ${
                mode === "ngo"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🏢 NGO Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                {mode === "ngo" ? "NGO Name or Email" : "Email / Username / Phone"}
              </label>
              <input
                id="login-identifier"
                type="text"
                placeholder={mode === "ngo" ? "Enter NGO Name or Email" : "Enter Email / Username / Phone"}
                value={form.identifier}
                onChange={update("identifier")}
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update("password")}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                ⚠️ {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition duration-200 shadow-sm font-semibold text-sm mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in…
                </>
              ) : (
                "Login →"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-600 hover:text-blue-500 font-medium transition duration-200">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
