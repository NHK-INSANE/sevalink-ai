"use client";
import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import PageWrapper from "../../components/PageWrapper";
import { socket } from "../../../lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function SimulationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [simEvents, setSimEvents] = useState([]);
  const [stats, setStats] = useState({
    missions: 0,
    responders: 0,
    aiDecisions: 0
  });

  useEffect(() => {
    socket.on("simulation_started", (data) => {
      setIsRunning(true);
      addEvent(`🚀 Simulation Started: ${data.crisis.title}`);
      setStats(prev => ({ ...prev, missions: prev.missions + 1 }));
    });

    socket.on("ops_event", (event) => {
      if (event.type === "AI") {
        addEvent(`🧠 AI Analysis: ${event.payload.message}`);
        setStats(prev => ({ ...prev, aiDecisions: prev.aiDecisions + 1 }));
      }
      if (event.type === "NEAREST") {
        addEvent(`📍 Smart Routing: Found ${event.payload.nearby.length} responders`);
        setStats(prev => ({ ...prev, responders: prev.responders + event.payload.nearby.length }));
      }
    });

    return () => {
      socket.off("simulation_started");
      socket.off("ops_event");
    };
  }, []);

  const addEvent = (msg) => {
    setSimEvents(prev => [{ text: msg, time: new Date() }, ...prev].slice(0, 20));
  };

  const startSim = (type) => {
    setIsRunning(true);
    setSimEvents([]);
    socket.emit("run_simulation", { 
      type, 
      location: { lat: 22.57 + (Math.random() * 0.1), lng: 88.36 + (Math.random() * 0.1) } 
    });
    toast.success(`${type} Simulation Launched`, {
      icon: '🧪',
      style: { background: '#1e293b', color: '#fff' }
    });
  };

  return (
    <div className="min-h-screen bg-[#0B1220]">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6 max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          
          {/* Left Panel: Controls */}
          <div className="w-full md:w-1/3 space-y-6">
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Sim-Control</h2>
              <p className="text-gray-500 text-xs font-medium mb-8">Test the autonomous response engine with simulated crisis parameters.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => startSim("FLOOD")}
                  disabled={isRunning}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  🌊 Simulate Flood
                </button>
                <button 
                  onClick={() => startSim("COLLAPSE")}
                  disabled={isRunning}
                  className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  🏢 Simulate Collapse
                </button>
              </div>

              <div className="mt-10 pt-10 border-t border-white/5 space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Missions</span>
                  <span className="text-lg font-black text-white">{stats.missions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Responders Engaged</span>
                  <span className="text-lg font-black text-indigo-400">{stats.responders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">AI Decisions</span>
                  <span className="text-lg font-black text-emerald-400">{stats.aiDecisions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Feed */}
          <div className="flex-1 w-full bg-[#0f172a]/50 border border-white/10 rounded-3xl p-8 min-h-[600px] flex flex-col shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-gray-700"}`} />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Simulation Telemetry</h3>
              </div>
              <button 
                onClick={() => { setSimEvents([]); setIsRunning(false); }}
                className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
              >
                Clear Log
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-4 custom-scrollbar">
              <AnimatePresence>
                {simEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                    <div className="w-16 h-16 border-2 border-dashed border-white/20 rounded-full mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Awaiting Simulation Start...</p>
                  </div>
                ) : (
                  simEvents.map((e, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 items-start"
                    >
                      <span className="text-[10px] font-mono text-gray-600 mt-0.5">[{e.time.toLocaleTimeString([], { hour12: false })}]</span>
                      <p className="text-[13px] font-medium text-gray-300 leading-relaxed">{e.text}</p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {isRunning && (
              <div className="mt-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">
                  System behavior within expected operational parameters
                </p>
              </div>
            )}
          </div>

        </div>

      </PageWrapper>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}
