"use client";
import { useState } from "react";
import { login } from "../utils/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleLogin = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    // Frontend-only: store whatever is entered as the logged-in user
    login({ ...form, name: form.email.split("@")[0], role: "User" });
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
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
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in to continue helping your community</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-white/8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update("email")}
                className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={update("password")}
                className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                ⚠️ {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="w-full btn-primary py-3 rounded-xl text-white font-semibold text-sm mt-2"
            >
              Sign In →
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Register here
            </Link>
          </div>
        </div>

        {/* Demo note */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Demo mode — any email & password works
        </p>
      </div>
    </div>
  );
}
