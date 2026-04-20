"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";

export default function NgoPage() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://sevalink-backend-bmre.onrender.com/api/users")
      .then(res => res.json())
      .then(data => {
        const onlyNgos = data.filter(
          u => u.role?.toLowerCase() === "ngo"
        );
        setNgos(onlyNgos);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <motion.main 
        className="max-w-7xl mx-auto px-6 py-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="mb-10 text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Registered NGOs
            </span>
          </h1>
          <p className="text-slate-400 text-lg">
            Active verified crisis response organizations on SevaLink AI
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-indigo-400">
             <span className="animate-spin text-4xl">🌀</span>
          </div>
        ) : ngos.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-5xl mb-4">🏢</div>
            <p className="text-lg">No NGOs registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ngos.map((ngo, i) => (
              <div key={i} className="glass p-5 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] relative overflow-hidden">
                {/* Accent stripe */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
                
                <h2 className="text-xl font-bold text-white mb-1 tracking-tight flex items-center gap-2">
                  <span>🏢</span> {ngo.name || ngo.ngoName || "Unnamed NGO"}
                </h2>
                
                <div className="space-y-2 mt-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="opacity-60 text-xs uppercase w-12">Email</span>
                    <span className="truncate flex-1 font-medium">{ngo.email}</span>
                  </div>
                  
                  {ngo.phone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="opacity-60 text-xs uppercase w-12">Phone</span>
                      <span className="font-medium">{ngo.phone}</span>
                    </div>
                  )}

                  {ngo.ngoContact && (
                    <div className="flex items-center gap-2 text-slate-300 border-t border-white/10 pt-2 mt-2">
                      <span className="opacity-60 text-xs uppercase w-12">Links</span>
                      <span className="font-medium truncate text-indigo-400">{ngo.ngoContact}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.main>
    </div>
  );
}
