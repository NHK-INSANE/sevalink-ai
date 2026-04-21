"use client";
import React from "react";
import Navbar from "./components/Navbar";
import PageWrapper from "./components/PageWrapper";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center text-center px-6 transition duration-300">
      <Navbar />

      <motion_div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mt-20"
      >
        <h1 className="text-5xl md:text-6xl font-bold text-blue-600 mb-6 tracking-tight">
          SevaLink AI
        </h1>

        <p className="text-gray-600 md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          AI-powered disaster response platform connecting people, volunteers, and NGOs in real-time. Smart matching, live monitoring, and emergency broadcasting.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <a 
            href="/register" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition duration-200 hover:scale-105 active:scale-95"
          >
            Get Started
          </a>

          <a 
            href="/map" 
            className="bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition duration-200 hover:border-gray-300 shadow-sm"
          >
            View Live Map
          </a>
        </div>
      </motion_div>

      {/* Feature grid */}
      <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl w-full">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 text-left">
          <div className="text-3xl mb-4">🤖</div>
          <h3 className="font-bold text-gray-800 mb-2 text-lg">AI Matching</h3>
          <p className="text-gray-500 text-sm">Instantly match crises with the best available volunteers based on proximity and skills.</p>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 text-left">
          <div className="text-3xl mb-4">🗺️</div>
          <h3 className="font-bold text-gray-800 mb-2 text-lg">Live Map</h3>
          <p className="text-gray-500 text-sm">Real-time visualization of all active reports, nearby NGOs, and field assets.</p>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 text-left">
          <div className="text-3xl mb-4">🚨</div>
          <h3 className="font-bold text-gray-800 mb-2 text-lg">SOS Broadcast</h3>
          <p className="text-gray-500 text-sm">Broadcast emergency signals to every connected user instantly during critical events.</p>
        </div>
      </div>

    </div>
  );
}

// Simple motion wrapper since Landing snippet uses motion
import { motion as motion_div } from "framer-motion";
