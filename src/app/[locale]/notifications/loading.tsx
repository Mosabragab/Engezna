'use client';

/**
 * Notifications Page Loading State
 */
export default function NotificationsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center h-14 px-4 gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
          <div className="w-24 h-5 bg-slate-200 rounded animate-pulse" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex gap-3"
          >
            <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
              <div className="w-full h-3 bg-slate-200 rounded animate-pulse" />
              <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
