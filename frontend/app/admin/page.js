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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
      <Navbar />
      <PageWrapper>
        <main className="max-w-7xl mx-auto px-4 md:px-10 py-10">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold mb-2">
                🛡️ ADMIN PANEL
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Control Center</h1>
              <p className="text-gray-500 text-sm mt-1">
                Signed in as <span className="font-semibold text-blue-600">{currentUser?.name}</span>
              </p>
            </div>
            <button
              onClick={() => broadcastSOS()}
              disabled={sendingSOS}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold text-sm transition hover:scale-105 active:scale-95 shadow-lg"
            >
              <span className={sendingSOS ? "animate-spin" : "animate-pulse text-lg"}>🚨</span>
              {sendingSOS ? "Broadcasting..." : "Broadcast SOS Alert"}
            </button>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Problems",   value: problems.length,    icon: "📊", color: "text-indigo-600",  bg: "bg-indigo-50" },
              { label: "Critical",         value: criticalCount,       icon: "🔴", color: "text-red-600",     bg: "bg-red-50"    },
              { label: "Open",             value: openCount,           icon: "📂", color: "text-blue-600",    bg: "bg-blue-50"   },
              { label: "Helpers",          value: helpers.length,      icon: "🤝", color: "text-emerald-600", bg: "bg-emerald-50"},
              { label: "Active SOS",       value: sosList.length,      icon: "🚨", color: "text-red-700",     bg: "bg-red-50"    },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white shadow-sm`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div className="flex flex-wrap gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm mb-6 w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition duration-200 ${
                  activeTab === t.id
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Overview ── */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-4">📈 Problem Flow</h3>
                {[
                  { label: "Open",        val: openCount,     color: "bg-blue-500" },
                  { label: "In Progress", val: progressCount, color: "bg-yellow-500" },
                  { label: "Resolved",    val: resolvedCount, color: "bg-emerald-500" },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 mb-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                    <span className="text-sm text-gray-600 flex-1">{r.label}</span>
                    <span className="font-bold text-gray-800">{r.val}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-4">⚡ Urgency Breakdown</h3>
                {[
                  { label: "Critical", val: criticalCount, color: "text-red-600" },
                  { label: "High",     val: problems.filter(p => p.urgency?.toLowerCase() === "high").length, color: "text-orange-600" },
                  { label: "Medium",   val: problems.filter(p => p.urgency?.toLowerCase() === "medium").length, color: "text-yellow-600" },
                  { label: "Low",      val: problems.filter(p => p.urgency?.toLowerCase() === "low").length, color: "text-green-600" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">{r.label}</span>
                    <span className={`font-bold ${r.color}`}>{r.val}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-4">👥 Resources</h3>
                {[
                  { label: "Volunteers", val: helpers.filter(h => h.role?.toLowerCase() === "volunteer").length },
                  { label: "Workers",    val: helpers.filter(h => h.role?.toLowerCase() === "worker").length },
                  { label: "NGOs",       val: ngos.length },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">{r.label}</span>
                    <span className="font-bold text-gray-800">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: Problems ── */}
          {activeTab === "problems" && (
            <div className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
                ))
              ) : problems.length === 0 ? (
                <div className="text-center py-16 text-gray-400">No problems yet</div>
              ) : (
                problems.map((p) => (
                  <div key={p._id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${urgencyBadge(p.urgency)}`}>{p.urgency}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${
                          p.status === "Open" ? "bg-blue-50 text-blue-600 border-blue-100" :
                          p.status === "In Progress" ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                          "bg-green-50 text-green-600 border-green-100"
                        }`}>{p.status}</span>
                      </div>
                      <div className="font-semibold text-gray-800 text-sm truncate">{p.title}</div>
                      <div className="text-xs text-gray-400 truncate">{p.description}</div>
                    </div>
                    <button
                      onClick={() => { setAssignModal(p); setSelectedHelper(""); }}
                      className="shrink-0 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition hover:scale-105 active:scale-95"
                    >
                      🎯 Assign
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── TAB: Helpers ── */}
          {activeTab === "helpers" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {helpers.map(h => (
                <div key={h._id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
                      {h.role?.toLowerCase() === "volunteer" ? "🤝" : "🔧"}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm">{h.name}</div>
                      <div className="text-xs text-blue-600 font-semibold uppercase">{h.role}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {h.email && <div>📧 {h.email}</div>}
                    {h.phone && <div>📞 {h.phone}</div>}
                    <div>🛠 {(h.skills?.length > 0 ? h.skills.join(", ") : h.skill) || "General"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB: SOS ── */}
          {activeTab === "sos" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-700">Active SOS Broadcasts</h2>
                <button
                  onClick={() => broadcastSOS()}
                  disabled={sendingSOS}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-60"
                >
                  + New SOS Broadcast
                </button>
              </div>
              {sosList.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-gray-400">No active SOS alerts — all clear!</p>
                </div>
              ) : sosList.map((s, i) => (
                <div key={i} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-2xl animate-pulse">🚨</span>
                  <div>
                    <div className="font-bold text-red-700">{s.message}</div>
                    <div className="text-xs text-red-500 mt-1">
                      From: {s.senderName || "Anonymous"} · {new Date(s.time).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-red-400">
                      📍 {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB: Live Map ── */}
          {activeTab === "map" && (
            <div className="h-[600px] rounded-2xl overflow-hidden border border-gray-200 shadow-md">
              <MapView
                problems={problems}
                ngos={ngos}
                helpers={helpers}
                sosMarkers={sosList}
                type="all"
                height="100%"
                zoom={5}
                zoomToUser={false}
              />
            </div>
          )}

        </main>
      </PageWrapper>

      {/* ── Force-Assign Modal ── */}
      <AnimatePresence>
        {assignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setAssignModal(null); } }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-lg font-bold text-gray-800 mb-1">🎯 Force Assign Helper</h2>
              <p className="text-sm text-gray-500 mb-4 line-clamp-1">
                Problem: <span className="font-semibold text-gray-700">{assignModal.title}</span>
              </p>

              <label className="block text-sm font-medium text-gray-600 mb-2">
                Select Helper
              </label>
              <select
                value={selectedHelper}
                onChange={e => setSelectedHelper(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm"
              >
                <option value="">— Choose a helper —</option>
                {helpers.map(h => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.role}) {h.skills?.length > 0 ? `· ${h.skills.slice(0,2).join(", ")}` : ""}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <button
                  onClick={forceAssign}
                  disabled={!selectedHelper || assigning}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-sm transition"
                >
                  {assigning ? "Assigning..." : "✅ Confirm Assign"}
                </button>
                <button
                  onClick={() => setAssignModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
