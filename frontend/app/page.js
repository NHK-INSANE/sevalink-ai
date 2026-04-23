"use client";
import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Link from "next/link";
import { motion } from "framer-motion";
import CountUp from "react-countup";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const FEATURES = [
  { icon: "📍", title: "Report & Locate", desc: "Submit crisis reports with precise GPS coordinates and photo evidence in seconds." },
  { icon: "🤖", title: "AI Classification", desc: "Neural engine instantly classifies urgency level and predicts required resources." },
  { icon: "🚀", title: "Smart Matching", desc: "Proprietary algorithm matches nearest volunteers with the right skills to each crisis." },
  { icon: "🗺️", title: "Live Operations Map", desc: "Real-time geospatial view of all active incidents, volunteers, and NGO assets." },
  { icon: "📡", title: "SOS Broadcast", desc: "One-tap emergency broadcast alerts all nearby responders simultaneously." },
  { icon: "🤝", title: "NGO Coordination", desc: "Seamless multi-organization collaboration with shared dashboards and assignments." },
];

const PROBLEMS = [
  { icon: "⏱", title: "Coordination Lag", text: "Traditional disaster response loses critical hours to phone calls and paperwork." },
  { icon: "🕳", title: "No Visibility", text: "Field teams operate blind — no real-time view of who needs what, and where." },
  { icon: "❌", title: "Skill Mismatch", text: "Aid reaches the wrong people. Medical teams at flood zones, engineers at medical camps." },
];

const STEPS = [
  { num: "01", title: "Report the Crisis", desc: "Any citizen submits a problem with location, photo, and description. Takes 30 seconds." },
  { num: "02", title: "AI Analyzes", desc: "Our model classifies urgency, category, and required resources automatically." },
  { num: "03", title: "Match & Deploy", desc: "Nearest qualified volunteers and NGOs are notified and dispatched instantly." },
  { num: "04", title: "Track & Resolve", desc: "All parties coordinate on a live map until the crisis is marked resolved." },
];

const words = ["NGOs", "Volunteers", "Workers", "Responders"];

function TypingText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-purple-400 transition-opacity duration-500">
      {words[index]}
    </span>
  );
}

function Stat({ end, suffix, label }) {
  return (
    <div>
      <div className="text-3xl md:text-5xl font-bold text-white mb-2">
        <CountUp end={end} duration={2} />{suffix}
      </div>
      <div className="text-xs text-gray-400 font-semibold uppercase tracking-widest">{label}</div>
    </div>
  );
}

export default function Landing() {
  const [stats, setStats] = useState({ users: 0, problems: 0 });

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen text-gray-200 bg-[#020617]">
      <Navbar />

      {/* ── HERO ── */}
      <section className="section-large text-center pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="container max-w-3xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-white">
            Connecting <TypingText />
            <br />
            Where It Matters Most
          </h1>
          <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
            Real-time crisis coordination powered by AI — from reporting to response,
            all in one unified platform.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register">
              <button className="btn-primary">Get Started</button>
            </Link>
            <Link href="/dashboard">
              <button className="btn-secondary">View Dashboard</button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="section border-y border-white/10 bg-white/[0.01]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="container"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            <Stat end={stats.problems || 0} suffix="+" label="Active Crisis Reports" />
            <Stat end={stats.users || 0} suffix="" label="Registered Users" />
            <Stat end={stats.citizens || 0} suffix="" label="Citizens Reporting Issues" />
            <Stat end={stats.responders || 0} suffix="" label="Responders (Volunteers + Workers)" />
            <Stat end={stats.ngos || 0} suffix="" label="Partner NGOs" />
          </div>
        </motion.div>
      </section>

      {/* ── PROBLEM SECTION ── */}
      <section className="section">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="container"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Emergency Response Needs Speed & Coordination
            </h2>
            <p className="text-gray-400">
              Every year, delayed coordination costs lives. Traditional systems are too slow, too blind, and too fragmented.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROBLEMS.map((p, i) => (
              <div key={i} className="card">
                <div className="text-3xl mb-4">{p.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{p.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── SOLUTION: FEATURES ── */}
      <section className="section bg-white/[0.01] border-y border-white/10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="container"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to Respond
            </h2>
            <p className="text-gray-400">
              A complete AI-powered coordination platform — from crisis report to field deployment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="card">
                <div className="w-12 h-12 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-xl mb-6">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="container"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How SevaLink Works
            </h2>
            <p className="text-gray-400">Four steps from crisis to resolution.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {STEPS.map((s, i) => (
              <div key={i} className="card">
                <div className="text-4xl font-bold text-white/10 mb-4">{s.num}</div>
                <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 py-12">
        <div className="container flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">SevaLink<span className="text-purple-400"> AI</span></span>
          </div>
          <p className="text-xs text-gray-500">
            © 2026 SevaLink AI · Built for impact
          </p>
        </div>
      </footer>
    </div>
  );
}
