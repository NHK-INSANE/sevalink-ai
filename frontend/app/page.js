"use client";
import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import { motion } from "framer-motion";
import axios from "axios";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export default function Landing() {
  const [stats, setStats] = useState({ users: 0, problems: 0, volunteers: 0 });
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Live Disaster Response Network
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold mb-8 tracking-tight bg-gradient-to-b from-[var(--text)] to-[var(--muted)] bg-clip-text text-transparent">
            Connecting Humanity <br /> 
            <span className="text-[var(--primary)]">Through Intelligence.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            SevaLink AI is a next-generation coordination layer for crisis management. 
            Real-time matching, live data streams, and instant emergency response.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link 
              href="/register" 
              className="w-full sm:w-auto bg-[var(--primary)] hover:scale-105 active:scale-95 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] transition-all text-center"
            >
              Get Started Free
            </Link>

            <Link 
              href="/map" 
              className="w-full sm:w-auto bg-[var(--card)] border border-[var(--border)] text-[var(--text)] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[var(--bg)] transition-all shadow-sm text-center"
            >
              View Live Map
            </Link>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <div className="text-2xl font-bold text-[var(--text)]">{stats.users}+</div>
              <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Active Users</div>
            </div>
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <div className="text-2xl font-bold text-red-500">{stats.problems}+</div>
              <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Crises Managed</div>
            </div>
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <div className="text-2xl font-bold text-emerald-500">{stats.volunteers}+</div>
              <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Volunteers</div>
            </div>
          </div>
        </motion.div>

        {/* Live Activity Feed */}
        <div className="mt-32 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8 px-4">
            <h2 className="text-xl font-bold tracking-tight">Live Activity Feed</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Real-time
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} className="h-32 bg-[var(--card)] animate-pulse rounded-2xl border border-[var(--border)]" />
              ))
            ) : (
              feed.map((item, idx) => (
                <motion.div 
                  key={item._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      item.urgency === "Critical" ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
                    }`}>
                      {item.urgency}
                    </span>
                    <span className="text-[9px] text-[var(--muted)]">{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <h3 className="font-bold text-sm mb-1 group-hover:text-[var(--primary)] transition-colors">{item.title}</h3>
                  <p className="text-[11px] text-[var(--muted)] line-clamp-1">{item.location?.address || "Location updated"}</p>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 pb-20">
          <div className="p-10 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-2xl mb-6">🤖</div>
            <h3 className="font-bold text-[var(--text)] mb-3 text-xl">AI Matching</h3>
            <p className="text-[var(--muted)] text-sm leading-relaxed">Instantly match crises with the best available volunteers based on proximity, skills, and past response performance.</p>
          </div>
          <div className="p-10 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl mb-6">🗺️</div>
            <h3 className="font-bold text-[var(--text)] mb-3 text-xl">Live Network</h3>
            <p className="text-[var(--muted)] text-sm leading-relaxed">Real-time visualization of all active reports, nearby NGOs, and field assets in a single, unified command interface.</p>
          </div>
          <div className="p-10 bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-2xl mb-6">🚨</div>
            <h3 className="font-bold text-[var(--text)] mb-3 text-xl">SOS Protocol</h3>
            <p className="text-[var(--muted)] text-sm leading-relaxed">Broadcast emergency signals to every connected user instantly during critical events, ensuring no one is left behind.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
