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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition duration-300">
      <Navbar />
      <PageWrapper>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">🏢 Registered NGOs</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Active organizations coordinating response operations on SevaLink.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {ngos.length === 0 ? (
              <div className="text-center py-20 bg-[var(--card)] rounded-2xl border border-dashed border-[var(--border)] flex flex-col items-center">
                <p className="text-[var(--text)] font-bold text-lg">No NGOs registered yet</p>
                <p className="text-[var(--muted)] text-sm mt-1">Be the first to list an organization.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {ngos.map((ngo, i) => (
                  <div 
                    key={ngo._id || i}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-xl shrink-0">
                        🏢
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-[var(--text)] truncate tracking-tight">
                          {ngo.ngoName || ngo.name || "Unnamed NGO"}
                        </h2>
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Verified NGO</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span className="opacity-50">📧</span>
                        <span className="truncate">{ngo.email || "No email provided"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span className="opacity-50">📞</span>
                        <span>{ngo.phone || "No phone provided"}</span>
                      </div>
                      {ngo.ngoContact && (
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                          <span className="opacity-50">🌐</span>
                          <a href={ngo.ngoContact.startsWith("http") ? ngo.ngoContact : `https://${ngo.ngoContact}`} target="_blank" rel="noreferrer" className="truncate text-[var(--primary)] hover:underline">
                            {ngo.ngoContact}
                          </a>
                        </div>
                      )}
                      {ngo.address && (
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                          <span className="opacity-50">📍</span>
                          <span className="line-clamp-1">{ngo.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[var(--border)]">
                      <button className="w-full py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-sm">
                        Connect with NGO
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      </PageWrapper>
    </div>
  );
}
