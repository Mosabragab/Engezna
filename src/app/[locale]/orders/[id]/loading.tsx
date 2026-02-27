'use client';

/**
 * Order Detail Loading State
 */
export default function OrderDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center h-14 px-4 gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
          <div className="w-28 h-5 bg-slate-200 rounded animate-pulse" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-center py-3">
          <div className="w-32 h-8 bg-slate-200 rounded-full animate-pulse" />
        </div>

        {/* Provider Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="w-32 h-4 bg-slate-200 rounded animate-pulse" />
              <div className="w-24 h-3 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0"
            >
              <div className="w-14 h-14 bg-slate-200 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-1/3 h-3 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="w-16 h-4 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center">
            <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />
            <div className="w-24 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
