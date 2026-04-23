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
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => setOffset(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Fetch stats
    axios.get(`${API_BASE}/api/stats`)
      .then(res => setStats(res.data))
      .catch(err => console.error("Stats fetch error:", err));

    // Fetch latest activity
    axios.get(`${API_BASE}/api/problems/latest`)
      .then(res => {
        setFeed(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Feed fetch error:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition duration-300">
      <Navbar />

      <PageWrapper>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 relative">
        {/* Floating Background Elements */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="absolute top-20 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ y: [0, 20, 0], opacity: [0.1, 0.15, 0.1] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
          className="absolute top-80 right-0 w-80 h-80 bg-purple-500 rounded-full blur-3xl pointer-events-none"
        />

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-bold uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Live Disaster Response Network
          </div>

          <h1 
            className="text-6xl sm:text-8xl font-extrabold mb-8 tracking-tighter gradient-text leading-[1.1] transition-transform duration-75"
            style={{ transform: `translateY(${offset * 0.15}px)` }}
          >
            Connecting Humanity <br /> 
            <span className="text-[var(--primary)]">Through Intelligence.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-12 leading-relaxed">
            SevaLink AI is a next-generation coordination layer for crisis management. 
            Real-time matching, live data streams, and instant emergency response.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20 relative z-10">
            <Link href="/register">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left - rect.width / 2) * 0.15;
                  const y = (e.clientY - rect.top - rect.height / 2) * 0.15;
                  e.currentTarget.style.transform = `translate(${x}px, ${y}px)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = `translate(0,0)`;
                }}
                className="btn-glow !px-10 !py-5 !text-xl shadow-[0_0_40px_var(--primary-glow)] transition-transform duration-200"
              >
                Get Started Free
              </motion.button>
            </Link>

            <Link href="/map">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left - rect.width / 2) * 0.15;
                  const y = (e.clientY - rect.top - rect.height / 2) * 0.15;
                  e.currentTarget.style.transform = `translate(${x}px, ${y}px)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = `translate(0,0)`;
                }}
                className="btn-secondary !px-10 !py-5 !text-xl transition-transform duration-200"
              >
                View Live Map
              </motion.button>
            </Link>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
            <motion.div whileHover={{ y: -5 }} className="card p-6 border-white/5">
              <div className="text-3xl font-bold text-white">{stats.users}+</div>
              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Active Users</div>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="card p-6 border-white/5">
              <div className="text-3xl font-bold text-red-500">{stats.problems}+</div>
              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Crises Managed</div>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} className="card p-6 border-white/5">
              <div className="text-3xl font-bold text-emerald-500">{stats.volunteers}+</div>
              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Volunteers</div>
            </motion.div>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="mt-40 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-10 px-4">
            <h2 className="text-2xl font-bold tracking-tight">Live Activity Feed</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              System Live
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [1,2,3].map(i => (
                <SkeletonCard key={i} />
              ))
            ) : (
              feed.map((item, idx) => (
                <motion.div 
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="card p-6 hover:border-[var(--primary)] group cursor-default"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`badge ${
                      item.urgency === "Critical" ? "badge-critical" : "badge-low"
                    } !text-[9px]`}>
                      {item.urgency}
                    </span>
                    <span className="text-[9px] text-[var(--text-secondary)] font-medium">{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <h3 className="font-bold text-sm mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-1">{item.title}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <svg className="w-3 h-3 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    <span className="truncate">{item.location?.address || "Region updated"}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-40 pb-20">
          {[
            { icon: "🤖", title: "AI Matching", desc: "Instantly match crises with the best available volunteers based on proximity, skills, and past response performance.", bg: "bg-indigo-500/10", border: "border-indigo-500/10" },
            { icon: "🗺️", title: "Live Network", desc: "Real-time visualization of all active reports, nearby NGOs, and field assets in a single, unified command interface.", bg: "bg-emerald-500/10", border: "border-emerald-500/10" },
            { icon: "🚨", title: "SOS Protocol", desc: "Broadcast emergency signals to every connected user instantly during critical events, ensuring no one is left behind.", bg: "bg-red-500/10", border: "border-red-500/10" }
          ].map((feature, i) => (
            <TiltCard 
              key={feature.title}
              className="!p-10 !rounded-[2rem] hover:shadow-[0_0_50px_rgba(99,102,241,0.05)]"
            >
              <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center text-2xl mb-8 shadow-inner border ${feature.border}`}>{feature.icon}</div>
              <h3 className="font-bold text-white mb-4 text-xl tracking-tight">{feature.title}</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed font-medium">{feature.desc}</p>
            </TiltCard>
          ))}
        </div>
      </main>
      </PageWrapper>
    </div>
    </div>
  );
}
