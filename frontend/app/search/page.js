"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { getProblems, getUsers } from "../utils/api";
import ProblemCard from "../components/ProblemCard";
import { motion, AnimatePresence } from "framer-motion";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const router = useRouter();

  const [results, setResults] = useState({ problems: [], people: [], ngos: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const performSearch = async () => {
      setLoading(true);
      try {
        const [probs, users] = await Promise.all([getProblems(), getUsers()]);
        
        const q = query.toLowerCase();
        
        const filteredProbs = probs.filter(p => 
          p.title?.toLowerCase().includes(q) || 
          p.description?.toLowerCase().includes(q) ||
          p.problemId?.toLowerCase().includes(q)
        );

        const filteredUsers = users.filter(u => 
          u.name?.toLowerCase().includes(q) || 
          u.role?.toLowerCase().includes(q) ||
          u.skills?.some(s => s.toLowerCase().includes(q))
        );

        setResults({
          problems: filteredProbs,
          people: filteredUsers.filter(u => ["volunteer", "worker"].includes(u.role?.toLowerCase())),
          ngos: filteredUsers.filter(u => u.role?.toLowerCase() === "ngo")
        });
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    };

    if (query) performSearch();
  }, [query]);

  return (
    <div className="min-h-screen bg-[#080B14] text-white">
      <Navbar />
      <PageWrapper className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="border-b border-white/5 pb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500 mb-2">Neural Search Results</p>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Searching: "{query}"</h1>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1,2,3].map(i => <div key={i} className="h-64 bg-white/5 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-16">
              {/* PROBLEMS */}
              {results.problems.length > 0 && (
                <section className="space-y-6">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Tactical Crises ({results.problems.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {results.problems.map(p => <ProblemCard key={p._id} problem={p} />)}
                  </div>
                </section>
              )}

              {/* PEOPLE */}
              {results.people.length > 0 && (
                <section className="space-y-6">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Active Responders ({results.people.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {results.people.map(u => (
                      <div key={u._id} onClick={() => router.push(`/volunteers?id=${u._id}`)} className="card !p-6 cursor-pointer hover:border-blue-500/30 transition-all">
                        <p className="text-xs font-black text-white uppercase">{u.name}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{u.role}</p>
                        <div className="flex flex-wrap gap-1 mt-4">
                          {u.skills?.slice(0, 2).map(s => <span key={s} className="text-[7px] font-black uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{s}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* NGOS */}
              {results.ngos.length > 0 && (
                <section className="space-y-6">
                  <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Partner NGOs ({results.ngos.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {results.ngos.map(u => (
                      <div key={u._id} onClick={() => router.push(`/ngo?id=${u._id}`)} className="card !p-6 cursor-pointer hover:border-emerald-500/30 transition-all">
                        <p className="text-xs font-black text-white uppercase">{u.name}</p>
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2">Verified Node</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {results.problems.length === 0 && results.people.length === 0 && results.ngos.length === 0 && (
                <div className="py-32 text-center card border-dashed border-white/10">
                  <p className="text-xs font-black text-gray-600 uppercase tracking-widest leading-relaxed">No tactical data found matching your query.<br/>Try searching by Crisis ID, Skill, or Sector Name.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </PageWrapper>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080B14] flex items-center justify-center text-white text-xs font-black uppercase animate-pulse">Initializing Search Engine...</div>}>
      <SearchContent />
    </Suspense>
  );
}
