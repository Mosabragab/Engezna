'use client';

/**
 * Admin Providers Loading State
 * Shows skeleton grid while providers data loads
 */
export default function AdminProvidersLoading() {
  return (
    <main className="flex-1 p-4 lg:p-6 overflow-auto bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-36 h-7 bg-slate-200 rounded animate-pulse" />
        <div className="w-28 h-9 bg-slate-200 rounded-lg animate-pulse" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-1/2 h-3 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="w-16 h-5 bg-slate-200 rounded-full animate-pulse" />
              <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
