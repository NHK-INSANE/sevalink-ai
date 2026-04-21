"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers, apiRequest } from "../utils/api";
import { getUser } from "../utils/auth";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400 text-sm">
      Loading map...
    </div>
  ),
});

export default function AdminPage() {
  const router = useRouter();
  const [problems, setProblems]     = useState([]);
  const [helpers, setHelpers]       = useState([]);
  const [ngos, setNgos]             = useState([]);
  const [sosList, setSosList]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [sendingSOS, setSendingSOS] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // { problem }
  const [selectedHelper, setSelectedHelper] = useState("");
  const [assigning, setAssigning]   = useState(false);
  const [activeTab, setActiveTab]   = useState("overview");

  // ── Auth guard: admin only ────────────────────────────────────────────────
  useEffect(() => {
    const user = getUser();
    if (!user) { router.push("/login"); return; }
    if (user.role?.toLowerCase() !== "admin") {
      return; // show access denied below
    }
  }, [router]);

  const currentUser = getUser();
  const isAdmin     = currentUser?.role?.toLowerCase() === "admin";

  // ── Fetch data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const [probs, users] = await Promise.all([getProblems(), getUsers()]);
        setProblems(probs);
        setHelpers(users.filter(u =>
          u.role?.toLowerCase() === "volunteer" || u.role?.toLowerCase() === "worker"
        ));
        setNgos(users.filter(u => u.role?.toLowerCase() === "ngo"));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Real-time updates
    const socket = io(API_BASE);
    socket.on("new-problem",    p  => setProblems(prev => prev.find(x => x._id === p._id) ? prev : [p, ...prev]));
    socket.on("sos-alert",      sos => setSosList(prev => [sos, ...prev]));
    socket.on("problem-updated", p  => setProblems(prev => prev.map(x => x._id === p._id ? p : x)));
    return () => socket.disconnect();
  }, [isAdmin]);

  // ── SOS broadcast ─────────────────────────────────────────────────────────
  const broadcastSOS = async (message = "Admin-issued emergency alert!") => {
    setSendingSOS(true);
    try {
      await apiRequest("/api/sos", {
        method: "POST",
        body: JSON.stringify({
          latitude:   22.57,
          longitude:  88.36,
          message,
          senderName: `Admin (${currentUser?.name || "SevaLink"})`,
        }),
      });
      toast.success("🚨 SOS broadcast sent to all users!");
    } catch {
      toast.error("SOS failed");
    } finally {
      setSendingSOS(false);
    }
  };

  // ── Force Assign ──────────────────────────────────────────────────────────
  const forceAssign = async () => {
    if (!selectedHelper || !assignModal) return;
    setAssigning(true);
    const helper = helpers.find(h => h._id === selectedHelper);
    try {
      await apiRequest("/api/problems/force-assign", {
        method: "POST",
        body: JSON.stringify({
          problemId:  assignModal._id,
          helperId:   selectedHelper,
          helperName: helper?.name || "Helper",
        }),
      });
      toast.success(`✅ Assigned ${helper?.name} to "${assignModal.title}"`);
      // Update local state
      setProblems(prev =>
        prev.map(p => p._id === assignModal._id
          ? { ...p, assignedTo: selectedHelper, status: "In Progress" }
          : p
        )
      );
      setAssignModal(null);
      setSelectedHelper("");
    } catch {
      toast.error("Force assign failed");
    } finally {
      setAssigning(false);
    }
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const openCount     = problems.filter(p => p.status?.toLowerCase() === "open").length;
  const progressCount = problems.filter(p => p.status?.toLowerCase() === "in progress").length;
  const resolvedCount = problems.filter(p => p.status?.toLowerCase() === "resolved").length;
  const criticalCount = problems.filter(p => p.urgency?.toLowerCase() === "critical").length;

  const urgencyBadge = u => {
    const m = { Critical: "bg-red-100 text-red-600", High: "bg-orange-100 text-orange-600", Medium: "bg-yellow-100 text-yellow-600", Low: "bg-green-100 text-green-600" };
    return m[u] || "bg-gray-100 text-gray-600";
  };

  // ── Access Denied ─────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold text-gray-700">Admin Access Only</h1>
          <p className="text-gray-400 text-sm">
            Your account role is <span className="font-semibold text-gray-600">{currentUser?.role || "unknown"}</span>.
            Contact a platform admin to get access.
          </p>
          <button onClick={() => router.push("/")} className="mt-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "overview",  label: "Overview",   icon: "📊" },
    { id: "problems",  label: "Problems",   icon: "📋" },
    { id: "helpers",   label: "Helpers",    icon: "🤝" },
    { id: "sos",       label: `SOS (${sosList.length})`, icon: "🚨" },
    { id: "map",       label: "Live Map",   icon: "🗺️" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-6">
          <div className="animate-in slide-in-from-left-4 duration-500">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 border border-red-500/20">
              🛡️ Admin System
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Control Center</h1>
            <p className="text-[var(--muted)] text-sm mt-1">
              Active session for <span className="text-[var(--primary)] font-bold">{currentUser?.name}</span>
            </p>
          </div>
          <button
            onClick={() => broadcastSOS()}
            disabled={sendingSOS}
            className="flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-red-500/20 hover:opacity-90 active:scale-95 transition disabled:opacity-50"
          >
            <span className={sendingSOS ? "animate-spin" : "animate-pulse"}>🚨</span>
            {sendingSOS ? "Broadcasting..." : "Broadcast Global SOS"}
          </button>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Problems", val: problems.length, color: "text-blue-500" },
            { label: "Critical", val: criticalCount, color: "text-red-500" },
            { label: "Open", val: openCount, color: "text-emerald-500" },
            { label: "Helpers", val: helpers.length, color: "text-purple-500" },
            { label: "Active SOS", val: sosList.length, color: "text-orange-500" },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto pb-2 mb-8 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 p-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl w-fit shrink-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition whitespace-nowrap ${
                  activeTab === t.id
                    ? "bg-[var(--primary)] text-white shadow-lg"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Status Breakdown */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-6">Status Flow</h3>
                <div className="space-y-4">
                  {[
                    { label: "Open", val: openCount, color: "bg-blue-500" },
                    { label: "In Progress", val: progressCount, color: "bg-yellow-500" },
                    { label: "Resolved", val: resolvedCount, color: "bg-emerald-500" },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
                        <div className={`w-2 h-2 rounded-full ${r.color}`} /> {r.label}
                      </div>
                      <div className="text-sm font-bold">{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Urgency Breakdown */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-6">Crisis Urgency</h3>
                <div className="space-y-4">
                  {[
                    { label: "Critical", val: criticalCount, color: "text-red-500" },
                    { label: "High", val: problems.filter(p => p.urgency?.toLowerCase() === "high").length, color: "text-orange-500" },
                    { label: "Medium", val: problems.filter(p => p.urgency?.toLowerCase() === "medium").length, color: "text-yellow-500" },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--muted)]">{r.label}</span>
                      <span className={`text-sm font-bold ${r.color}`}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Resource Breakdown */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-6">Available Resources</h3>
                <div className="space-y-4">
                  {[
                    { label: "Volunteers", val: helpers.filter(h => h.role?.toLowerCase() === "volunteer").length },
                    { label: "Workers", val: helpers.filter(h => h.role?.toLowerCase() === "worker").length },
                    { label: "NGOs", val: ngos.length },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--muted)]">{r.label}</span>
                      <span className="text-sm font-bold">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "problems" && (
            <div className="space-y-3">
              {problems.map((p) => (
                <div key={p._id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase ${urgencyBadge(p.urgency)}`}>{p.urgency}</span>
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded border uppercase text-blue-500 bg-blue-500/5 border-blue-500/10">{p.status}</span>
                    </div>
                    <div className="font-bold text-sm truncate">{p.title}</div>
                    <div className="text-[10px] text-[var(--muted)] truncate">{p.description}</div>
                  </div>
                  <button onClick={() => { setAssignModal(p); setSelectedHelper(""); }} className="w-full sm:w-auto px-4 py-2 bg-[var(--primary)] text-white text-[10px] font-bold rounded-xl hover:opacity-90 active:scale-95 transition">
                    Assign Helper
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "helpers" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {helpers.map(h => (
                <div key={h._id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-xl shrink-0">
                      {h.role?.toLowerCase() === "volunteer" ? "🤝" : "🔧"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{h.name}</div>
                      <div className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-widest">{h.role}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-[var(--muted)] truncate">📧 {h.email}</div>
                    <div className="text-[10px] text-[var(--muted)]">🛠 {(h.skills?.length > 0 ? h.skills.join(", ") : h.skill) || "General"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "sos" && (
            <div className="space-y-4">
              {sosList.length === 0 ? (
                <div className="text-center py-20 bg-[var(--card)] rounded-3xl border border-dashed border-[var(--border)]">
                  <p className="text-[var(--text)] font-bold">No active SOS alerts</p>
                  <p className="text-[var(--muted)] text-sm mt-1">All clear across the platform.</p>
                </div>
              ) : (
                sosList.map((s, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex items-start gap-4">
                    <span className="text-2xl animate-pulse">🚨</span>
                    <div className="min-w-0">
                      <div className="font-bold text-red-500 text-sm">{s.message}</div>
                      <div className="text-[10px] text-red-500/70 mt-1 uppercase font-bold tracking-widest">
                        By {s.senderName} · {new Date(s.time).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "map" && (
            <div className="h-[400px] sm:h-[600px] rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--card)]">
              <MapView problems={problems} ngos={ngos} helpers={helpers} sosMarkers={sosList} type="all" height="100%" zoom={5} zoomToUser={false} />
            </div>
          )}
        </div>
      </main>

      {/* Assign Modal */}
      <AnimatePresence>
        {assignModal && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold tracking-tight mb-2">🎯 Force Assign Helper</h2>
              <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mb-6 truncate">Problem: {assignModal.title}</p>
              
              <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Select Helper</label>
              <select value={selectedHelper} onChange={e => setSelectedHelper(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none mb-8">
                <option value="">— Choose a helper —</option>
                {helpers.map(h => (
                  <option key={h._id} value={h._id}>{h.name} ({h.role})</option>
                ))}
              </select>

              <div className="flex gap-3">
                <button onClick={forceAssign} disabled={!selectedHelper || assigning} className="flex-1 bg-[var(--primary)] text-white py-3 rounded-xl font-bold text-xs hover:opacity-90 active:scale-95 transition disabled:opacity-50">
                  {assigning ? "Assigning..." : "Confirm Assignment"}
                </button>
                <button onClick={() => setAssignModal(null)} className="px-6 py-3 rounded-xl border border-[var(--border)] text-xs font-bold hover:bg-[var(--bg)] transition">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
