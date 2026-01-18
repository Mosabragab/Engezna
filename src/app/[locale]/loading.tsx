'use client';

import { useLocale } from 'next-intl';

/**
 * Customer Loading State
 * Shows skeleton UI while customer pages are loading
 * Matches Engezna's design system
 *
 * Uses delayed fade-in (400ms) to avoid "flash" on fast loads
 */
export default function CustomerLoading() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="w-24 h-8 bg-slate-200 rounded-lg animate-pulse" />

            {/* Location */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 rounded-full animate-pulse" />
              <div className="w-32 h-4 bg-slate-200 rounded animate-pulse" />
            </div>

            {/* Actions */}
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
              <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Search Bar Skeleton */}
        <div className="h-12 bg-white rounded-2xl shadow-sm border border-slate-100 animate-pulse" />

        {/* Categories Skeleton */}
        <div className="flex gap-3 overflow-hidden py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl animate-pulse" />
              <div className="w-12 h-3 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Featured Section Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
            <div className="w-16 h-4 bg-slate-200 rounded animate-pulse" />
          </div>

          {/* Horizontal scroll cards */}
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-72 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100"
              >
                <div className="h-32 bg-slate-200 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
                  <div className="w-1/2 h-3 bg-slate-200 rounded animate-pulse" />
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-3 bg-slate-200 rounded animate-pulse" />
                    <div className="w-16 h-3 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Providers Grid Skeleton */}
        <div className="space-y-3">
          <div className="w-40 h-5 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100"
              >
                <div className="h-36 bg-slate-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
                      <div className="w-1/2 h-3 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
                    <div className="w-16 h-6 bg-[#009DE0]/10 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation Skeleton */}
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
