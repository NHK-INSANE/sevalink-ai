"use client";
import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const FEATURES = [
  { icon: "📍", title: "Report & Locate", desc: "Submit crisis reports with precise GPS coordinates and photo evidence in seconds.", color: "#6366f1" },
  { icon: "🤖", title: "AI Classification", desc: "Neural engine instantly classifies urgency level and predicts required resources.", color: "#a855f7" },
  { icon: "🚀", title: "Smart Matching", desc: "Proprietary algorithm matches nearest volunteers with the right skills to each crisis.", color: "#3b82f6" },
  { icon: "🗺️", title: "Live Operations Map", desc: "Real-time geospatial view of all active incidents, volunteers, and NGO assets.", color: "#22c55e" },
  { icon: "📡", title: "SOS Broadcast", desc: "One-tap emergency broadcast alerts all nearby responders simultaneously.", color: "#ef4444" },
  { icon: "🤝", title: "NGO Coordination", desc: "Seamless multi-organization collaboration with shared dashboards and assignments.", color: "#f59e0b" },
];

const PROBLEMS = [
  { icon: "⏱", title: "Coordination Lag", text: "Traditional disaster response loses critical hours to phone calls and paperwork.", accent: "#ef4444" },
  { icon: "🕳", title: "No Visibility", text: "Field teams operate blind — no real-time view of who needs what, and where.", accent: "#f97316" },
  { icon: "❌", title: "Skill Mismatch", text: "Aid reaches the wrong people. Medical teams at flood zones, engineers at medical camps.", accent: "#eab308" },
];

const STEPS = [
  { num: "01", title: "Report the Crisis", desc: "Any citizen submits a problem with location, photo, and description. Takes 30 seconds.", icon: "🚨" },
  { num: "02", title: "AI Analyzes", desc: "Our model classifies urgency, category, and required resources automatically.", icon: "🤖" },
  { num: "03", title: "Match & Deploy", desc: "Nearest qualified volunteers and NGOs are notified and dispatched instantly.", icon: "⚡" },
  { num: "04", title: "Track & Resolve", desc: "All parties coordinate on a live map until the crisis is marked resolved.", icon: "✅" },
];

const WORDS = ["NGOs", "Volunteers", "Workers", "Responders"];

// ── Animated typing word with fade transition ──
function TypingText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="inline-block text-purple-400"
      >
        {WORDS[index]}
      </motion.span>
    </AnimatePresence>
  );
}

// ── Stat card with animated count ──
function Stat({ end, suffix, label }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="flex flex-col items-center"
    >
      <div className="text-3xl md:text-5xl font-bold text-white mb-2 tabular-nums">
        <CountUp end={end} duration={2.5} enableScrollSpy scrollSpyOnce />{suffix}
      </div>
      <div className="text-xs text-gray-400 font-semibold uppercase tracking-widest text-center leading-relaxed">{label}</div>
    </motion.div>
  );
}

// ── Staggered container ──
const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function Landing() {
  const [stats, setStats] = useState({ users: 0, problems: 0, citizens: 0, responders: 0, ngos: 0 });

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen text-gray-200 bg-[#020617] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative text-center pt-36 pb-24 px-4">
        {/* Ambient glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-blue-600/8 blur-3xl rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative max-w-3xl mx-auto"
        >
          {/* Eyebrow label */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold uppercase tracking-widest mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            AI-Powered Crisis Response
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-bold leading-[1.15] text-white">
            Connecting{" "}
            <TypingText />
            <br />
            <span className="text-gray-300 font-semibold">Where It Matters Most</span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-5 text-gray-400 text-lg max-w-xl mx-auto leading-relaxed"
          >
            Real-time crisis coordination powered by AI — from reporting to response,
            all in one unified platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-10 flex justify-center gap-4 flex-wrap"
          >
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary px-7 py-3 text-base font-semibold shadow-lg shadow-purple-500/20"
              >
                Get Started →
              </motion.button>
            </Link>
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="btn-secondary px-7 py-3 text-base"
              >
                View Dashboard
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-white/10 bg-white/[0.015]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto px-6 py-14"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            <Stat end={stats.problems || 0} suffix="+" label="Active Crisis Reports" />
            <Stat end={stats.users || 0} suffix="" label="Registered Users" />
            <Stat end={stats.citizens || 0} suffix="" label="Citizens" />
            <Stat end={stats.responders || 0} suffix="" label="Volunteers & Workers" />
            <Stat end={stats.ngos || 0} suffix="" label="Partner NGOs" />
          </div>
        </motion.div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Emergency Response Needs Speed & Coordination
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Every year, delayed coordination costs lives. Traditional systems are too slow,
            too blind, and too fragmented.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={i}
              variants={cardVariant}
              whileHover={{ y: -6, borderColor: p.accent + "66" }}
              className="card cursor-default"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-5"
                style={{ background: p.accent + "18", border: `1px solid ${p.accent}33` }}
              >
                {p.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{p.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-white/[0.015] border-y border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to Respond
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              A complete AI-powered coordination platform — from crisis report to field deployment.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                variants={cardVariant}
                whileHover={{ y: -6 }}
                className="card group cursor-default"
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-xl mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: f.color + "18", border: `1px solid ${f.color}33` }}
                >
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How SevaLink Works
          </h2>
          <p className="text-gray-400">Four steps from crisis to resolution.</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              variants={cardVariant}
              whileHover={{ y: -6, borderColor: "rgba(99,102,241,0.4)" }}
              className="card text-center group cursor-default relative"
            >
              {/* Connector line (not on last) */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-white/10 z-10" />
              )}
              <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110">
                {s.icon}
              </div>
              <div className="text-xs font-bold text-purple-400/60 tracking-widest mb-2">{s.num}</div>
              <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-3">
          <span className="font-bold text-lg text-white">SevaLink<span className="text-purple-400"> AI</span></span>
          <p className="text-xs text-gray-500">© 2026 SevaLink AI · Built for impact</p>
        </div>
      </footer>
    </div>
  );
}
