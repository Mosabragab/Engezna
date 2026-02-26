'use client';

/**
 * Favorites Page Loading State
 */
export default function FavoritesLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center h-14 px-4 gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
          <div className="w-24 h-5 bg-slate-200 rounded animate-pulse" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100"
          >
            <div className="h-32 bg-slate-200 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-xl animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-2/3 h-4 bg-slate-200 rounded animate-pulse" />
                  <div className="w-1/3 h-3 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 bg-slate-200 rounded animate-pulse" />
              <div className="w-10 h-2 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
