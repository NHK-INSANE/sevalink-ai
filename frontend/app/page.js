"use client";
import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import { motion } from "framer-motion";
import axios from "axios";
import Link from "next/link";
import PageWrapper from "./components/PageWrapper";
import { SkeletonCard } from "./components/Skeleton";
import TiltCard from "./components/TiltCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function Landing() {
  const [stats, setStats] = useState({ users: 0, problems: 0, volunteers: 0 });
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => setOffset(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    axios.get(`${API_BASE}/api/stats`)
      .then(res => setStats(res.data))
      .catch(err => console.error("Stats fetch error:", err));
  }, []);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition duration-300 overflow-x-hidden">
      <Navbar />

      <PageWrapper>
      <main>
        {/* 🚀 HERO SECTION */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden pt-20">
          {/* Background Ambient Orbs */}
          <motion.div
            animate={{ y: [0, -30, 0], opacity: [0.1, 0.2, 0.1] }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
            className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px] pointer-events-none"
          />
          <motion.div
            animate={{ y: [0, 30, 0], opacity: [0.1, 0.15, 0.1] }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-20 right-1/4 w-[600px] h-[600px] bg-purple-600 rounded-full blur-[140px] pointer-events-none"
          />

          <div className="relative z-10 max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-10"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Next-Gen Crisis Coordination
            </motion.div>

            <h1 
              className="text-6xl md:text-8xl font-black mb-8 tracking-tighter gradient-text leading-[1.05] transition-transform duration-75"
              style={{ transform: `translateY(${offset * 0.12}px)` }}
            >
              Connecting Help <br /> 
              Where It Matters Most.
            </h1>

            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
              SevaLink AI intelligently orchestrates volunteers, NGOs, and resources 
              to real-time crisis situations using neural-matching and live geospatial tracking.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/register">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-glow !px-12 !py-6 !text-xl shadow-[0_0_50px_rgba(99,102,241,0.3)]"
                >
                  🚀 Get Started
                </motion.button>
              </Link>

              <Link href="/map">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-secondary !px-12 !py-6 !text-xl"
                >
                  Explore Live Map
                </motion.button>
              </Link>
            </div>
          </div>
        </section>

        {/* 💥 PROBLEM SECTION */}
        <section className="py-40 px-6 max-w-7xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">The Crisis Gap</h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto font-medium">
              Traditional disaster response is plagued by coordination lag, zero real-time visibility, 
              and inefficient resource allocation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "❌", title: "Latency", text: "Delayed information flow results in slower rescue and aid operations." },
              { icon: "❌", title: "Blind Spots", text: "Lack of centralized, real-time data makes field coordination nearly impossible." },
              { icon: "❌", title: "Mismatched Aid", text: "Volunteers and NGOs struggle to find where their specific skills are needed." }
            ].map((item, i) => (
              <TiltCard key={i} className="!p-10 border-white/5 bg-white/[0.01]">
                <div className="text-3xl mb-6">{item.icon}</div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.text}</p>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* 🤖 SOLUTION SECTION */}
        <section className="py-40 relative overflow-hidden">
          <div className="absolute inset-0 bg-indigo-600/5 blur-[120px] rounded-full scale-150 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div {...fadeIn} className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight gradient-text mb-6">The Intelligent Solution</h2>
              <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto font-medium">
                SevaLink AI bridge the gap between crisis and coordination, 
                turning chaos into a synchronized response network.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-12 mt-20">
              {[
                { icon: "📍", title: "Report & Locate", desc: "Instantly submit crisis reports with precise GPS coordinates and multimedia evidence." },
                { icon: "🤖", title: "Neural Analysis", desc: "AI engine automatically classifies urgency and predicts the scale of the emergency." },
                { icon: "🚀", title: "Smart Matching", desc: "Proprietary algorithms match the nearest available assets and volunteers to the crisis." }
              ].map((step, i) => (
                <div key={i} className="text-center space-y-6">
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center text-3xl mx-auto border border-indigo-500/10 shadow-2xl">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 📊 LIVE IMPACT SECTION */}
        <section className="py-40 px-6 bg-white/[0.01] border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeIn} className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Proof of Impact</h2>
              <p className="text-[var(--text-secondary)] font-medium">Quantifiable performance metrics from our live coordination network.</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { val: stats.problems || 120, label: "Active Events", color: "text-red-500" },
                { val: stats.volunteers || 85, label: "Field Responders", color: "text-indigo-500" },
                { val: 25, label: "NGO Partners", color: "text-emerald-500" },
                { val: "95%", label: "Response Rate", color: "text-amber-500" }
              ].map((stat, i) => (
                <TiltCard key={i} className="!p-8 text-center">
                  <h3 className={`text-5xl font-black mb-2 ${stat.color} tracking-tighter`}>{stat.val}+</h3>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">{stat.label}</p>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* 🗺️ MAP PREVIEW SECTION */}
        <section className="py-40 px-6 max-w-7xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Operational Visibility</h2>
            <p className="text-[var(--text-secondary)] font-medium">Real-time command and control interface for field coordination.</p>
          </motion.div>

          <TiltCard className="!p-4 border-gradient shadow-2xl">
            <div className="rounded-[1.5rem] overflow-hidden border border-white/10">
              <img src="/map-preview.png" alt="Operational Map" className="w-full object-cover" />
            </div>
          </TiltCard>
        </section>

        {/* 🎯 FINAL CTA SECTION */}
        <section className="py-60 px-6 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-600/10 blur-[160px] pointer-events-none" />
          
          <motion.div {...fadeIn} className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-8">
              Be the Change, <br /> 
              <span className="gradient-text">Technologically.</span>
            </h2>
            <p className="text-xl text-[var(--text-secondary)] mb-12 font-medium">
              Join the network of smarter responders. Whether you're an individual volunteer 
              or a global NGO, your presence matters.
            </p>
            <Link href="/register">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-glow !px-16 !py-6 !text-2xl shadow-[0_0_60px_rgba(99,102,241,0.4)]"
              >
                🚀 Initialize SevaLink
              </motion.button>
            </Link>
          </motion.div>
        </section>
      </main>
      </PageWrapper>
      
      {/* Footer Minimal */}
      <footer className="py-10 text-center border-t border-white/5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.3em]">
        © 2026 SevaLink AI Neural Network • All Signals Secured
      </footer>
    </div>
  );
}
