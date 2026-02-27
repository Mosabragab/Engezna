'use client';

/**
 * Provider Products/Menu Loading State
 */
export default function ProviderProductsLoading() {
  return (
    <div className="flex-1 bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="w-28 h-5 bg-slate-200 rounded animate-pulse" />
        <div className="w-24 h-9 bg-[#009DE0]/10 rounded-lg animate-pulse" />
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-slate-200 rounded-full animate-pulse shrink-0" />
          ))}
        </div>
      </div>

      {/* Product Cards */}
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 flex"
          >
            <div className="w-24 h-24 bg-slate-200 animate-pulse shrink-0" />
            <div className="flex-1 p-3 space-y-2">
              <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
              <div className="w-1/2 h-3 bg-slate-200 rounded animate-pulse" />
              <div className="flex items-center justify-between">
                <div className="w-16 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-10 h-6 bg-slate-200 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
