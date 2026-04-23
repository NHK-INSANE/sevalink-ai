"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { SkeletonCard } from "../components/Skeleton";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function NGOPage() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedNgo, setSelectedNgo] = useState(null);
  const [connectReason, setConnectReason] = useState("");

  const handleLocate = async () => {
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortBy("nearest");
      toast.success("Location acquired. Sorting by proximity.");
    } catch (err) {
      toast.error("Could not get location");
    }
  };

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((data) => {
        const onlyNgos = data.filter((u) => u.role?.toLowerCase() === "ngo" || u.role === "NGO");
        setNgos(onlyNgos);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const sortedNgos = [...ngos].sort((a, b) => {
    if (sortBy === "nearest" && userLoc) {
      const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
      const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
      return d1 - d2;
    }
    const nameA = (a.ngoName || a.name || "").toLowerCase();
    const nameB = (b.ngoName || b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const handleConnect = (ngo) => {
    setSelectedNgo(ngo);
    setShowConnectModal(true);
  };

  const submitConnectRequest = () => {
    if (!connectReason.trim()) return toast.error("Please provide a reason");
    // Mocking request sending
    toast.success(`Request sent to ${selectedNgo.ngoName || selectedNgo.name}`);
    setShowConnectModal(false);
    setConnectReason("");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Navbar />
      <PageWrapper>
        <main className="max-w-[var(--content-max)] mx-auto px-6 lg:px-12 py-12 flex flex-col gap-[28px]">
          
          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Registered NGOs</h1>
              <p className="text-[var(--text-secondary)] text-sm font-medium">Active organizations coordinating response on SevaLink.</p>
            </div>

            <div className="flex items-center gap-3">
              <select 
                value={sortBy} 
                onChange={(e) => {
                  if (e.target.value === "nearest" && !userLoc) handleLocate();
                  else setSortBy(e.target.value);
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-300 outline-none hover:border-purple-500/50 transition cursor-pointer"
              >
                <option value="name" className="bg-[#0f172a]">Sort by Name</option>
                <option value="nearest" className="bg-[#0f172a]">Sort by Nearest</option>
              </select>
            </div>
          </div>

          {/* ── Grid ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : sortedNgos.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
              <p className="text-white font-semibold">No NGOs found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedNgos.map((ngo) => (
                <div key={ngo._id} className="card card-hover-effect !p-6 flex flex-col gap-0">
                  <div className="flex justify-between items-start pb-4 mb-4 border-b border-white/5">
                    <h3 className="text-base font-bold text-white line-clamp-1">{ngo.ngoName || ngo.name || "Unnamed NGO"}</h3>
                    <span className="text-[9px] font-bold text-emerald-400 border border-emerald-400/30 px-2 py-0.5 rounded-md uppercase tracking-wider">Verified</span>
                  </div>

                  <div className="flex flex-col gap-2.5 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Email</span>
                      <span className="text-gray-300 truncate max-w-[160px]">{ngo.email}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Phone</span>
                      <span className="text-gray-300">{ngo.phone || "Not listed"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">Website</span>
                      {ngo.website || ngo.ngoContact ? (
                        <a href={(ngo.website || ngo.ngoContact).startsWith("http") ? (ngo.website || ngo.ngoContact) : `https://${ngo.website || ngo.ngoContact}`} target="_blank" className="text-indigo-400 hover:underline">Visit Website</a>
                      ) : (
                        <span className="text-gray-600 italic">Not available</span>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleConnect(ngo)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-indigo-500/20 mt-auto"
                    style={{ background: "linear-gradient(to right, #7c3aed, #6366f1)" }}
                  >
                    Connect with NGO
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </PageWrapper>

      {/* ── Connect Modal ── */}
      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowConnectModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl p-8 shadow-2xl"
            >
              <h2 className="text-xl font-extrabold text-white mb-2">Connect with {selectedNgo?.ngoName || selectedNgo?.name}</h2>
              <p className="text-gray-400 text-sm mb-6">Briefly explain why you want to coordinate with this organization.</p>
              
              <textarea 
                placeholder="Reason for connection..."
                value={connectReason}
                onChange={(e) => setConnectReason(e.target.value)}
                className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500 transition-all mb-6 resize-none"
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitConnectRequest}
                  className="flex-[2] py-3 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20"
                  style={{ background: "linear-gradient(to right, #7c3aed, #6366f1)" }}
                >
                  Send Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
