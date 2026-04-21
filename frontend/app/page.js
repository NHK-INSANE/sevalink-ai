"use client";
import React from "react";
import Navbar from "./components/Navbar";
import PageWrapper from "./components/PageWrapper";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300 pt-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion_div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto text-center mt-12"
        >
          <h1 className="text-4xl sm:text-6xl font-extrabold text-[var(--primary)] mb-6 tracking-tight">
            SevaLink AI
          </h1>

          <p className="text-base sm:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered disaster response platform connecting people, volunteers, and NGOs in real-time. Smart matching, live monitoring, and emergency broadcasting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/register" 
              className="w-full sm:w-auto bg-[var(--primary)] hover:opacity-90 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20 transition-all text-center"
            >
              Get Started
            </a>

            <a 
              href="/map" 
              className="w-full sm:w-auto bg-[var(--card)] border border-[var(--border)] text-[var(--text)] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[var(--bg)] transition shadow-sm text-center"
            >
              View Live Map
            </a>
          </div>
        </motion_div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-24 max-w-5xl mx-auto pb-20">
          <div className="p-8 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="font-bold text-[var(--text)] mb-2 text-lg">AI Matching</h3>
            <p className="text-[var(--muted)] text-sm">Instantly match crises with the best available volunteers based on proximity and skills.</p>
          </div>
          <div className="p-8 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm">
            <div className="text-3xl mb-4">🗺️</div>
            <h3 className="font-bold text-[var(--text)] mb-2 text-lg">Live Map</h3>
            <p className="text-[var(--muted)] text-sm">Real-time visualization of all active reports, nearby NGOs, and field assets.</p>
          </div>
          <div className="p-8 bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm">
            <div className="text-3xl mb-4">🚨</div>
            <h3 className="font-bold text-[var(--text)] mb-2 text-lg">SOS Broadcast</h3>
            <p className="text-[var(--muted)] text-sm">Broadcast emergency signals to every connected user instantly during critical events.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Simple motion wrapper since Landing snippet uses motion
import { motion as motion_div } from "framer-motion";
