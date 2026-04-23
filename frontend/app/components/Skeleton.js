"use client";

export function SkeletonCard() {
  return (
    <div className="card !p-8 animate-pulse space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-2.5 bg-white/5 rounded-full w-24"></div>
        <div className="h-2.5 bg-white/5 rounded-full w-16"></div>
      </div>
      <div className="h-6 bg-white/5 rounded-xl w-3/4"></div>
      <div className="space-y-3">
        <div className="h-2.5 bg-white/5 rounded-full w-full"></div>
        <div className="h-2.5 bg-white/5 rounded-full w-5/6"></div>
      </div>
      <div className="pt-6 border-t border-white/5 flex justify-between items-center">
        <div className="h-2.5 bg-white/5 rounded-full w-20"></div>
        <div className="h-8 bg-white/5 rounded-xl w-24"></div>
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="card !p-6 animate-pulse flex flex-col gap-3">
      <div className="h-2.5 bg-white/5 rounded-full w-20"></div>
      <div className="h-10 bg-white/5 rounded-xl w-16"></div>
    </div>
  );
}

export function SkeletonMap() {
  return (
    <div className="w-full h-full bg-white/5 animate-pulse rounded-[2rem] flex items-center justify-center relative overflow-hidden border border-white/5">
      <div className="absolute inset-0 animate-shimmer"></div>
      <div className="text-white/20 text-sm font-bold uppercase tracking-[0.2em] flex flex-col items-center gap-4 z-10">
        <div className="text-4xl filter grayscale opacity-50">🗺️</div>
        <span>Initializing Satellite Link...</span>
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse text-center space-y-8 pt-20">
      <div className="h-24 bg-white/5 rounded-[2.5rem] w-3/4 mx-auto"></div>
      <div className="space-y-3">
        <div className="h-3 bg-white/5 rounded-full w-full mx-auto"></div>
        <div className="h-3 bg-white/5 rounded-full w-2/3 mx-auto"></div>
      </div>
      <div className="flex gap-4 justify-center pt-6">
        <div className="h-14 bg-white/5 rounded-2xl w-40"></div>
        <div className="h-14 bg-white/5 rounded-2xl w-40"></div>
      </div>
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="loader"></div>
      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.3em] animate-pulse">Syncing Data</p>
    </div>
  );
}
