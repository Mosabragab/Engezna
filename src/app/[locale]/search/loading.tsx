'use client';

/**
 * Search Page Loading State
 */
export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center h-14 px-4 gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
          <div className="flex-1 h-10 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Filter Chips */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-slate-200 rounded-full animate-pulse shrink-0" />
          ))}
        </div>

        {/* Results */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100"
            >
              <div className="w-16 h-16 bg-slate-200 rounded-xl animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-1/2 h-3 bg-slate-200 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="w-12 h-3 bg-slate-200 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
