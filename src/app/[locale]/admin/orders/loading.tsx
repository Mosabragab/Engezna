'use client';

/**
 * Admin Orders Loading State
 * Shows skeleton table while orders data loads
 */
export default function AdminOrdersLoading() {
  return (
    <main className="flex-1 p-4 lg:p-6 overflow-auto bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-32 h-7 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="w-24 h-9 bg-slate-200 rounded-lg animate-pulse" />
          <div className="w-24 h-9 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="w-16 h-3 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="w-10 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-full h-4 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 p-4 border-b border-slate-50">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="w-full h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
