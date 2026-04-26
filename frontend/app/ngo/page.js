"use client";
import { useEffect, useState, Suspense } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUserLocation } from "../utils/location";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

function NGOContent() {
  const router = useRouter();
  const [ngos, setNgos] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [currentUser, setCurrentUser] = useState(null);
  const [ngoQuery, setNgoQuery] = useState("");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState("assign"); // "assign" or "lead"
  const [selectedProbId, setSelectedProbId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNgo, setSelectedNgo] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUser(JSON.parse(localStorage.getItem("seva_user") || "null"));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, pRes] = await Promise.all([
        axios.get(`${API_BASE}/api/users`),
        axios.get(`${API_BASE}/api/problems`)
      ]);
      const onlyNgos = uRes.data.filter(u => u.role?.toLowerCase() === "ngo");
      setNgos(onlyNgos);
      setProblems(pRes.data.data || []);
    } catch (err) {
      toast.error("Failed to sync partners.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (ngo) => {
    if (!currentUser) return toast.error("Authentication required.");
    router.push(`/chat?id=${ngo._id}`);
  };

  const handleOpenRequest = (ngo) => {
    if (!currentUser) return toast.error("Authentication required.");
    setSelectedNgo(ngo);
    setShowRequestModal(true);
  };

  const submitRequest = async () => {
    if (!selectedProbId) return toast.error("Select a target mission.");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      // Using the Request model via requestRoutes
      await axios.post(`${API_BASE}/api/requests`, {
        ngoId: selectedNgo._id,
        problemId: selectedProbId,
        type: requestType
      }, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      toast.success("Deployment request transmitted to partner.");
      setShowRequestModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Transmission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocate = async () => {
    try {
      const loc = await getUserLocation();
      setUserLoc(loc);
      setSortBy("nearest");
      toast.success("GPS Lock: Proximity sorting active.");
    } catch (err) {
      toast.error("Location services unavailable.");
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

  const filteredNgos = ngos.filter(n => {
    if (ngoQuery) {
      const q = ngoQuery.toLowerCase();
      const code = (n.displayId || n.customId || n._id).toLowerCase();
      const name = (n.ngoName || n.name || "").toLowerCase();
      if (!code.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  const sortedNgos = [...filteredNgos].sort((a, b) => {
    if (sortBy === "nearest" && userLoc) {
      const d1 = getDistance(userLoc.lat, userLoc.lng, a.location?.lat, a.location?.lng);
      const d2 = getDistance(userLoc.lat, userLoc.lng, b.location?.lat, b.location?.lng);
      return d1 - d2;
    }
    const nameA = (a.ngoName || a.name || "").toLowerCase();
    const nameB = (b.ngoName || b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">NGO Partners</h1>
              <p className="text-sm text-gray-500 font-medium">Coordinate with mission-control authorized organizations.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
               <input
                 placeholder="Search by ID or Name..."
                 value={ngoQuery}
                 onChange={(e) => setNgoQuery(e.target.value)}
                 className="!w-64 !rounded-xl !py-3 !px-5"
               />
               <select 
                value={sortBy} 
                onChange={(e) => e.target.value === "nearest" ? handleLocate() : setSortBy(e.target.value)}
                className="!bg-white/5 !border-none !rounded-xl !py-3 !px-4 !text-xs !font-bold uppercase tracking-widest text-gray-400 cursor-pointer"
               >
                  <option value="name">Sort: Name</option>
                  <option value="nearest">Sort: Nearest</option>
               </select>
            </div>
          </div>

          {/* GRID */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => <div key={i} className="card h-64 animate-pulse" />)}
            </div>
          ) : sortedNgos.length === 0 ? (
            <div className="py-32 text-center card border-dashed border-white/10">
              <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">No partners found in this sector</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedNgos.map((ngo) => {
                return (
                  <motion.div 
                    layout key={ngo._id} 
                    className="card !p-8 flex flex-col gap-6 group relative overflow-hidden"
                  >
                    <div className="space-y-1">
                       <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors truncate">{ngo.ngoName || ngo.name || "Partner NGO"}</h3>
                       <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">ID: {ngo.customId || ngo.displayId || ngo._id.slice(-6).toUpperCase()}</p>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                          <span className="text-purple-400">📍</span>
                          <span className="truncate">{ngo.address || ngo.location?.address || "Region Office"}</span>
                       </div>
                       <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                          <span className="text-purple-400">📧</span>
                          <span className="truncate">{ngo.email || "Contact Pending"}</span>
                       </div>
                       <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                          <span className="text-purple-400">🌐</span>
                          <span className="truncate">{ngo.website || "No digital portal"}</span>
                       </div>
                    </div>

                    <div className="mt-auto pt-4 flex gap-2">
                       <button 
                        onClick={() => handleConnect(ngo)}
                        className="flex-1 btn-secondary !py-2.5 !text-[10px] !font-black uppercase tracking-widest"
                       >
                          Contact
                       </button>
                       <button 
                        onClick={() => handleOpenRequest(ngo)}
                        className="flex-1 btn-primary !py-2.5 !text-[10px] !font-black uppercase tracking-widest"
                       >
                          Request Help
                       </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </PageWrapper>

      {/* REQUEST MODAL */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRequestModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
              className="relative w-full max-w-md card !p-10 space-y-8 shadow-2xl"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-1">Deployment Request</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Transmitting request to {selectedNgo?.ngoName || selectedNgo?.name}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 ml-2">Target Mission</label>
                  <select 
                    value={selectedProbId}
                    onChange={(e) => setSelectedProbId(e.target.value)}
                    className="w-full !rounded-2xl !p-4 !text-sm"
                  >
                    <option value="">-- Active Mission List --</option>
                    {problems.map(p => (
                      <option key={p._id} value={p._id}>{p.title} ({p.problemId})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 ml-2">Request Type</label>
                  <select 
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full !rounded-2xl !p-4 !text-sm"
                  >
                    <option value="assign">Assign Me to Mission</option>
                    <option value="lead">Request Leadership Authority</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                 <button 
                  onClick={submitRequest} 
                  disabled={isSubmitting || !selectedProbId}
                  className="btn-primary !py-4 !text-[10px] !font-black uppercase tracking-[0.2em]"
                 >
                   {isSubmitting ? "Transmitting..." : "Send Request"}
                 </button>
                 <button onClick={() => setShowRequestModal(false)} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Abort</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NGOPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-white font-black uppercase tracking-[0.3em] animate-pulse">Syncing Command Grid...</div>}>
      <NGOContent />
    </Suspense>
  );
}
