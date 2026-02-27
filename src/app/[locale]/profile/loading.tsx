'use client';

/**
 * Profile Page Loading State
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center h-14 px-4 gap-3">
          <div className="w-24 h-5 bg-slate-200 rounded animate-pulse" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4 max-w-lg">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-200 rounded-full animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="w-2/3 h-5 bg-slate-200 rounded animate-pulse" />
            <div className="w-1/2 h-3 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
              <div className="flex-1 h-4 bg-slate-200 rounded animate-pulse" />
              <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
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
