'use client';

/**
 * Provider Detail Loading State
 */
export default function ProviderDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Cover Image */}
      <div className="h-48 bg-slate-200 animate-pulse relative">
        <div className="absolute top-4 left-4 w-10 h-10 bg-white/50 rounded-full animate-pulse" />
      </div>

      {/* Provider Info */}
      <div className="bg-white px-4 pb-4 -mt-6 relative rounded-t-3xl">
        <div className="flex items-center gap-3 pt-4">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl animate-pulse -mt-8 border-4 border-white" />
          <div className="space-y-2 pt-1">
            <div className="w-40 h-5 bg-slate-200 rounded animate-pulse" />
            <div className="w-24 h-3 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="w-16 h-3 bg-slate-200 rounded animate-pulse" />
          <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
          <div className="w-14 h-3 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b px-4 py-2 mt-2">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-slate-200 rounded-full animate-pulse shrink-0" />
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex"
          >
            <div className="flex-1 p-3 space-y-2">
              <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
              <div className="w-full h-3 bg-slate-200 rounded animate-pulse" />
              <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="w-24 h-24 bg-slate-200 animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
