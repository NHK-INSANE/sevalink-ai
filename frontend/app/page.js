"use client";
import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

import { getStats } from "./utils/api";

const FEATURES = [
  { title: "REPORT & LOCATE",       desc: "Submit crisis reports with precise GPS coordinates and photo evidence in seconds.",     color: "#6366f1" },
  { title: "AI CLASSIFICATION",     desc: "Neural engine instantly classifies urgency level and predicts required resources.",       color: "#a855f7" },
  { title: "SMART MATCHING",        desc: "Proprietary algorithm matches nearest volunteers with the right skills to each crisis.", color: "#3b82f6" },
  { title: "LIVE OPERATIONS MAP",  desc: "Real-time geospatial view of all active incidents, volunteers, and NGO assets.",         color: "#22c55e" },
  { title: "SOS BROADCAST",        desc: "One-tap emergency broadcast alerts all nearby responders simultaneously.",               color: "#ef4444" },
  { title: "NGO COORDINATION",     desc: "Seamless multi-organization collaboration with shared dashboards and assignments.",       color: "#f59e0b" },
];

const PROBLEMS = [
  { title: "COORDINATION LAG",  text: "Traditional disaster response loses critical hours to phone calls and paperwork.", accent: "#ef4444" },
  { title: "NO VISIBILITY",     text: "Field teams operate blind — no real-time view of who needs what, and where.",     accent: "#f97316" },
  { title: "SKILL MISMATCH",   text: "Aid reaches the wrong people. Medical teams at flood zones, engineers at medical camps.", accent: "#eab308" },
];

const STEPS = [
  { num: "01", title: "REPORT THE CRISIS", desc: "Any citizen submits a problem with location, photo, and description. Takes 30 seconds." },
  { num: "02", title: "AI ANALYZES",       desc: "Our model classifies urgency, category, and required resources automatically." },
  { num: "03", title: "MATCH & DEPLOY",   desc: "Nearest qualified volunteers and NGOs are notified and dispatched instantly." },
  { num: "04", title: "TRACK & RESOLVE",  desc: "All parties coordinate on a live map until the crisis is marked resolved." },
];

const WORDS = ["NGO Workers", "Responders", "Volunteers", "Field Staff"];

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
        <CountUp end={end || 0} duration={2.5} enableScrollSpy scrollSpyOnce />{suffix}
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
    const fetchStats = async () => {
      try {
        const d = await getStats();
        if (d) setStats(d);
      } catch (err) {
        console.error("Stats fetch failed:", err);
      }
    };
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen text-gray-200 bg-[#0b0f1a]">
      <Navbar />

      {/* ── HERO ── */}
      <section className="section-large !pb-0">
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
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            Live Intelligence Network
          </motion.div>

          <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.05]">
            Bridging the gap between <br />
            Crises and <TypingText />
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-2 leading-relaxed max-w-2xl mx-auto">
            The world's first AI-driven coordination layer for disaster response. 
            Real-time tracking, intelligent matching, and life-saving speed.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-12 px-4">
            <Link href="/submit" className="px-10 py-4 rounded-xl bg-purple-600 text-white font-bold text-[13px] shadow-xl shadow-purple-500/20 hover:bg-purple-500 transition-all">
              Get Started →
            </Link>
            <Link href="/dashboard" className="px-10 py-4 rounded-xl bg-white/5 text-gray-300 font-bold text-[13px] border border-white/10 hover:bg-white/10 transition-all">
              View Dashboard
            </Link>
          </div>

          </motion.div>

        {/* Quick Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="container mt-16 pt-10 border-t border-white/5 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <Stat end={stats.problems} label="Live Incidents" />
            <Stat end={stats.responders} label="Active Helpers" />
            <Stat end={stats.ngos} label="NGO Partners" />
            <Stat end={stats.citizens} label="Citizen Reporters" />
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
              <motion.div key={i} variants={fadeUp} className="glass-card hover-premium p-8 text-left">
                <div className="w-10 h-10 rounded-xl mb-6 flex items-center justify-center" style={{ backgroundColor: `${p.accent}20`, border: `1px solid ${p.accent}30` }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.accent }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 tracking-tight">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="section bg-white/[0.01] border-y border-white/5">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">The Neural Network for Good</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Advanced technology meet urgent humanitarian needs. A full operational stack for the next generation of crisis response.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-6 rounded-xl bg-[#0f172a] border border-white/10 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 tracking-tight">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-20 border-t border-white/5 bg-black/40">
        <div className="container text-center">
          <div className="text-2xl font-black text-white mb-8 tracking-tighter">
            SEVALINK<span className="text-purple-500">AI</span>
          </div>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-10 leading-relaxed">
            The mission is simple: Save lives through intelligence. 
            Join the network and help us build the future of humanitarian logistics.
          </p>
          <div className="flex justify-center gap-8 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
            <a href="#" className="hover:text-white transition">Platform</a>
            <a href="#" className="hover:text-white transition">Network</a>
            <a href="#" className="hover:text-white transition">Protocol</a>
            <a href="#" className="hover:text-white transition">Open Source</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
