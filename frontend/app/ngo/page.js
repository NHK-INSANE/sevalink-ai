"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getUsers } from "../utils/api";
import { SkeletonCard } from "../components/Skeleton";
import { motion } from "framer-motion";

export default function NGOPage() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getUsers()
      .then((data) => {
        const onlyNgos = data.filter(
          (u) => u.role?.toLowerCase() === "ngo" || u.role === "NGO"
        );
        setNgos(onlyNgos);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 md:px-10 pt-24 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">🏢 Registered NGOs</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Active organizations coordinating response operations on SevaLink.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {ngos.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center">
                <div className="text-5xl mb-4 opacity-50">🏢</div>
                <p className="text-gray-900 font-bold text-lg">No NGOs registered yet</p>
                <p className="text-gray-500 text-sm mt-1">Be the first to list an organization and coordinate response.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ngos.map((ngo, i) => (
                  <motion.div
                    key={ngo._id || i}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 transition duration-200"
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl">
                        🏢
                      </div>
                      <div>
                        <h2 className="text-gray-800 font-bold text-base leading-tight">
                          {ngo.ngoName || ngo.name || "Unnamed NGO"}
                        </h2>
                        <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">NGO Partner</span>
                      </div>
                    </div>

                    {/* Details — always show all available fields */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-gray-400 shrink-0">📧</span>
                        <span className="truncate">{ngo.email || <span className="text-gray-300 italic">Not provided</span>}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-gray-400 shrink-0">📞</span>
                        <span>{ngo.phone || <span className="text-gray-300 italic">Not provided</span>}</span>
                      </div>
                      {ngo.ngoContact && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="text-gray-400 shrink-0">🌐</span>
                          <a
                            href={ngo.ngoContact.startsWith("http") ? ngo.ngoContact : `https://${ngo.ngoContact}`}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-blue-600 hover:underline"
                          >
                            {ngo.ngoContact}
                          </a>
                        </div>
                      )}
                      {ngo.address && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="text-gray-400 shrink-0">📍</span>
                          <span className="line-clamp-2">{ngo.address}</span>
                        </div>
                      )}
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
