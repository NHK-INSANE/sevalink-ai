"use client";

export function SkeletonCard() {
  return (
    <div className="card border-white/5 animate-pulse space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div className="h-3 bg-white/10 rounded-full w-20"></div>
        <div className="h-3 bg-white/5 rounded-full w-24"></div>
      </div>
      <div className="h-5 bg-white/10 rounded-lg w-3/4 mb-1"></div>
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded-full w-full"></div>
        <div className="h-3 bg-white/5 rounded-full w-5/6"></div>
      </div>
      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
        <div className="h-3 bg-white/5 rounded-full w-16"></div>
        <div className="h-6 bg-white/10 rounded-lg w-20"></div>
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="card border-white/5 animate-pulse flex flex-col gap-3">
      <div className="h-3 bg-white/10 rounded-full w-24"></div>
      <div className="h-10 bg-white/10 rounded-lg w-20"></div>
    </div>
  );
}

export function SkeletonMap() {
  return (
    <div className="w-full h-[400px] bg-white/5 animate-pulse rounded-[1.5rem] flex items-center justify-center relative overflow-hidden border border-white/5">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]"></div>
      <div className="text-[var(--text-secondary)] text-sm font-medium flex flex-col items-center gap-2">
        <div className="text-3xl opacity-50">🗺️</div>
        <span className="uppercase tracking-widest text-[10px] font-bold">Initializing Map Matrix...</span>
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="max-w-3xl mt-20 animate-pulse text-center mx-auto">
      <div className="h-16 bg-white/10 rounded-2xl w-3/4 mx-auto mb-6"></div>
      <div className="h-4 bg-white/5 rounded-full w-full mx-auto mb-2"></div>
      <div className="h-4 bg-white/5 rounded-full w-2/3 mx-auto mb-10"></div>
      <div className="flex gap-4 justify-center">
        <div className="h-14 bg-white/10 rounded-xl w-32"></div>
        <div className="h-14 bg-white/10 rounded-xl w-32"></div>
      </div>
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex flex-col justify-center items-center h-64 gap-4 animate-in fade-in duration-500">
      <div className="loader"></div>
      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em] animate-pulse">Syncing Network...</p>
    </div>
  );
}
