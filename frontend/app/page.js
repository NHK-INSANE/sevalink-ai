"use client";
import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

import { MapPin, Brain, Zap, Map, Radio, Users, Clock, EyeOff, UserX, AlertCircle, CheckCircle2 } from "lucide-react";

const FEATURES = [
  { icon: <MapPin className="w-5 h-5" />, title: "Report & Locate",       desc: "Submit crisis reports with precise GPS coordinates and photo evidence in seconds.",     color: "#6366f1" },
  { icon: <Brain className="w-5 h-5" />, title: "AI Classification",     desc: "Neural engine instantly classifies urgency level and predicts required resources.",       color: "#a855f7" },
  { icon: <Zap className="w-5 h-5" />, title: "Smart Matching",        desc: "Proprietary algorithm matches nearest volunteers with the right skills to each crisis.", color: "#3b82f6" },
  { icon: <Map className="w-5 h-5" />, title: "Live Operations Map",  desc: "Real-time geospatial view of all active incidents, volunteers, and NGO assets.",         color: "#22c55e" },
  { icon: <Radio className="w-5 h-5" />, title: "SOS Broadcast",        desc: "One-tap emergency broadcast alerts all nearby responders simultaneously.",               color: "#ef4444" },
  { icon: <Users className="w-5 h-5" />, title: "NGO Coordination",     desc: "Seamless multi-organization collaboration with shared dashboards and assignments.",       color: "#f59e0b" },
];

const PROBLEMS = [
  { icon: <Clock className="w-5 h-5" />, title: "Coordination Lag",  text: "Traditional disaster response loses critical hours to phone calls and paperwork.", accent: "#ef4444" },
  { icon: <EyeOff className="w-5 h-5" />, title: "No Visibility",     text: "Field teams operate blind — no real-time view of who needs what, and where.",     accent: "#f97316" },
  { icon: <UserX className="w-5 h-5" />, title: "Skill Mismatch",   text: "Aid reaches the wrong people. Medical teams at flood zones, engineers at medical camps.", accent: "#eab308" },
];

const STEPS = [
  { num: "01", icon: <AlertCircle className="w-8 h-8" />, title: "Report the Crisis", desc: "Any citizen submits a problem with location, photo, and description. Takes 30 seconds." },
  { num: "02", icon: <Brain className="w-8 h-8" />, title: "AI Analyzes",       desc: "Our model classifies urgency, category, and required resources automatically." },
  { num: "03", icon: <Zap className="w-8 h-8" />, title: "Match & Deploy",   desc: "Nearest qualified volunteers and NGOs are notified and dispatched instantly." },
  { num: "04", icon: <CheckCircle2 className="w-8 h-8" />, title: "Track & Resolve",  desc: "All parties coordinate on a live map until the crisis is marked resolved." },
];

const WORDS = ["NGOs", "Volunteers", "Workers", "Responders"];

function TypingText() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex(p => (p + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.35 }}
        className="text-purple-400 inline-block"
      >
        {WORDS[index]}
      </motion.span>
    </AnimatePresence>
  );
}

function Stat({ end, suffix, label }) {
  return (
    <motion.div whileHover={{ scale: 1.06 }} transition={{ type: "spring", stiffness: 300 }} className="flex flex-col items-center gap-1">
      <div className="text-3xl md:text-5xl font-bold text-white tabular-nums">
        <CountUp end={end} duration={2.5} enableScrollSpy scrollSpyOnce />{suffix}
      </div>
      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest text-center leading-relaxed">{label}</div>
    </motion.div>
  );
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp  = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };

export default function Landing() {
  const [stats, setStats] = useState({ users: 0, problems: 0, citizens: 0, responders: 0, ngos: 0 });

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`).then(r => r.json()).then(d => setStats(d)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen text-gray-200 bg-[#020617]">
      <Navbar />

      {/* ── HERO ── */}
      <section className="section-large">
        {/* Ambient glow */}
        <div aria-hidden className="pointer-events-none fixed left-1/2 top-0 -translate-x-1/2 w-[600px] h-[360px] rounded-full bg-purple-700/10 blur-3xl z-0" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="container max-w-3xl mx-auto relative z-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[11px] font-semibold uppercase tracking-widest mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            AI-Powered Crisis Response
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-white mb-5">
            Connecting <TypingText /><br />
            <span className="text-gray-300 font-semibold">Where It Matters Most</span>
          </h1>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto text-center mb-9">
            Real-time crisis coordination powered by AI — from reporting to response,
            all in one unified platform.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/register">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="btn-primary px-7 py-3 text-sm font-semibold shadow-lg shadow-purple-500/20">
                Get Started →
              </motion.button>
            </Link>
            <Link href="/dashboard">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="btn-secondary px-7 py-3 text-sm">
                View Dashboard
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="section border-y border-white/10 bg-white/[0.015]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="container"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            <Stat end={stats.problems  || 0} suffix="+" label="Active Crisis Reports" />
            <Stat end={stats.users     || 0} suffix=""  label="Registered Users" />
            <Stat end={stats.citizens  || 0} suffix=""  label="Citizens" />
            <Stat end={stats.responders|| 0} suffix=""  label="Volunteers & Workers" />
            <Stat end={stats.ngos      || 0} suffix=""  label="Partner NGOs" />
          </div>
        </motion.div>
      </section>

      {/* ── PROBLEMS ── */}
      <section className="section">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Emergency Response Needs Speed & Coordination
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Every year, delayed coordination costs lives. Traditional systems are too slow, too blind, and too fragmented.
            </p>
          </div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROBLEMS.map((p, i) => (
              <motion.div
                key={i} variants={fadeUp}
                whileHover={{ y: -5 }}
                className="card"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-5"
                  style={{ background: p.accent + "18", border: `1px solid ${p.accent}33` }}>
                  {p.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section bg-white/[0.015] border-y border-white/10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything You Need to Respond</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              A complete AI-powered coordination platform — from crisis report to field deployment.
            </p>
          </div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -5 }} className="card group cursor-default">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: f.color + "18", border: `1px solid ${f.color}33` }}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How SevaLink Works</h2>
            <p className="text-gray-400">Four steps from crisis to resolution.</p>
          </div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {STEPS.map((s, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -5 }} className="card group cursor-default">
                <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110">{s.icon}</div>
                <div className="text-[10px] font-bold text-purple-400/70 tracking-widest mb-2">{s.num}</div>
                <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 py-10">
        <div className="container flex flex-col items-center gap-2">
          <span className="font-bold text-base text-white">SevaLink<span className="text-purple-400"> AI</span></span>
          <p className="text-xs text-gray-500">© 2026 SevaLink AI · Built for impact</p>
        </div>
      </footer>
    </div>
  );
}
