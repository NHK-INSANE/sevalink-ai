"use client";

export function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div className="h-3 bg-gray-100 rounded-full w-20"></div>
        <div className="h-3 bg-gray-50 rounded-full w-24"></div>
      </div>
      <div className="h-5 bg-gray-100 rounded-lg w-3/4 mb-1"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-50 rounded-full w-full"></div>
        <div className="h-3 bg-gray-50 rounded-full w-5/6"></div>
      </div>
      <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
        <div className="h-3 bg-gray-50 rounded-full w-16"></div>
        <div className="h-6 bg-gray-100 rounded-lg w-20"></div>
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-pulse flex flex-col gap-2">
      <div className="h-3 bg-gray-100 rounded-full w-24"></div>
      <div className="h-8 bg-gray-100 rounded-lg w-16"></div>
    </div>
  );
}

export function SkeletonMap() {
  return (
    <div className="w-full h-full bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
      <div className="text-gray-300 text-sm font-medium flex flex-col items-center gap-2">
        <div className="text-3xl">🗺️</div>
        <span>Initializing Crisis Map...</span>
      </div>
    </div>
  );
}

export function SkeletonHero() {
    return (
        <div className="max-w-3xl mt-20 animate-pulse text-center mx-auto">
            <div className="h-16 bg-gray-100 rounded-2xl w-3/4 mx-auto mb-6"></div>
            <div className="h-4 bg-gray-50 rounded-full w-full mx-auto mb-2"></div>
            <div className="h-4 bg-gray-50 rounded-full w-2/3 mx-auto mb-10"></div>
            <div className="flex gap-4 justify-center">
                <div className="h-14 bg-gray-100 rounded-xl w-32"></div>
                <div className="h-14 bg-gray-100 rounded-xl w-32"></div>
            </div>
        </div>
    );
}
