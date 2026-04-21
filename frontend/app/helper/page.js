"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { SkeletonCard } from "../components/Skeleton";
import { motion } from "framer-motion";

export default function Helper() {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((data) => {
        const filtered = data.filter(
          (u) =>
            u.role?.toLowerCase() === "volunteer" ||
            u.role?.toLowerCase() === "worker"
        );
        setHelpers(filtered);
      })
      .catch((err) => console.error("Fetch helpers error:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredHelpers = helpers.filter((h) => {
    if (filter === "all") return true;
    return h.role?.toLowerCase() === filter;
  });

  const FILTERS = [
    { id: "all", label: "All", icon: "🌐" },
    { id: "volunteer", label: "Volunteers", icon: "🤝" },
    { id: "worker", label: "Workers", icon: "🔧" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 md:px-10 pt-24 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">🤝 Helpers & Volunteers</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Dedicated individuals and workers supporting the SevaLink network.
          </p>
        </div>

        {/* Filter Pills (Restored) */}
        <div className="flex gap-2 mb-8 p-1 bg-gray-50 border border-gray-100 rounded-2xl w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition duration-200 text-xs font-bold ${
                filter === f.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              <span>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {filteredHelpers.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center">
                <div className="text-5xl mb-4 opacity-50">🤝</div>
                <p className="text-gray-900 font-bold text-lg">No helpers registered yet</p>
                <p className="text-gray-500 text-sm mt-1">Invite volunteers and workers to join the SevaLink network.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHelpers.map((h) => (
                  <motion.div 
                    key={h._id || h.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 transition duration-200"
                  >
                    {/* Avatar + Name + Role */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                        {h.role?.toLowerCase() === "volunteer" ? "🤝" : "🔧"}
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-800 leading-tight">{h.name}</h2>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${
                          h.role?.toLowerCase() === "volunteer" ? "text-blue-600" : "text-orange-600"
                        }`}>
                          {h.role}
                        </span>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-2 text-sm mb-4">
                      {h.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span>📧</span>
                          <span className="truncate">{h.email}</span>
                        </div>
                      )}
                      {h.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span>📞</span>
                          <span>{h.phone}</span>
                        </div>
                      )}
                      {h.address && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span>📍</span>
                          <span className="line-clamp-1">{h.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {(h.skills?.length > 0 || h.skill) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(h.skills?.length > 0
                          ? h.skills
                          : [h.skill]
                        ).map((s, i) => (
                          <span
                            key={i}
                            className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* NGO for workers */}
                    {h.role?.toLowerCase() === "worker" && h.ngoName && (
                      <p className="text-xs text-gray-500 mb-3">
                        🏢 NGO: <span className="font-semibold text-gray-700">{h.ngoName}</span>
                      </p>
                    )}

                    <hr className="border-gray-100 mb-3" />

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        Available
                      </span>
                      <button className="ripple px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 hover:scale-105 active:scale-95 transition duration-200">
                        Contact
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
