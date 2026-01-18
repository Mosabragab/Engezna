'use client';

import { useLocale } from 'next-intl';
import { Loader2, Menu, Bell, Settings } from 'lucide-react';

/**
 * Provider Dashboard Loading State
 * Shows skeleton UI while provider pages are loading
 * Matches Engezna's provider dashboard design
 */
export default function ProviderLoading() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Skeleton (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-e border-slate-200 p-4">
        {/* Logo */}
        <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse mb-8" />

        {/* Menu Items */}
        <nav className="space-y-2 flex-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                i === 0 ? 'bg-[#009DE0]/10' : ''
              }`}
            >
              <div
                className={`w-5 h-5 rounded animate-pulse ${
                  i === 0 ? 'bg-[#009DE0]/30' : 'bg-slate-200'
                }`}
              />
              <div
                className={`h-4 rounded animate-pulse flex-1 ${
                  i === 0 ? 'bg-[#009DE0]/30' : 'bg-slate-200'
                }`}
              />
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-3 p-3">
            <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 bg-slate-200 rounded animate-pulse flex-1" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between h-10">
            {/* Left side */}
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button className="lg:hidden p-2 text-slate-400">
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-40 h-5 bg-slate-200 rounded animate-pulse" />
            </div>

            {/* Right side */}
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="relative">
                <Bell className="w-5 h-5 text-slate-400" />
                <div className="absolute -top-1 -end-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              </div>
              <Settings className="w-5 h-5 text-slate-400" />
              <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>
        </header>

        {/* Content Loading */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
                  <div className="w-16 h-4 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="w-20 h-7 bg-slate-200 rounded animate-pulse mb-1" />
                <div className="w-24 h-3 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Main Content Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex gap-4 p-4 border-b border-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-8 rounded-lg animate-pulse ${
                    i === 0
                      ? 'w-24 bg-[#009DE0]/20'
                      : 'w-20 bg-slate-100'
                  }`}
                />
              ))}
            </div>

            {/* List Items */}
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
                      <div className="w-16 h-5 bg-amber-100 rounded-full animate-pulse" />
                    </div>
                    <div className="w-48 h-3 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="text-end space-y-1">
                    <div className="w-20 h-5 bg-slate-200 rounded animate-pulse" />
                    <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loading Indicator */}
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-12 h-12 border-4 border-slate-200 rounded-full" />
                <Loader2
                  className="w-12 h-12 text-[#009DE0] animate-spin absolute top-0 left-0"
                  style={{ animationDuration: '1s' }}
                />
              </div>
              <p className="text-slate-500 mt-3 text-sm font-medium">
                {isRTL ? 'جاري التحميل...' : 'Loading...'}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
