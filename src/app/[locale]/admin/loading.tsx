'use client'

import { useLocale } from 'next-intl'
import { Loader2, Menu } from 'lucide-react'

/**
 * Admin Loading State
 * Shows a loading spinner while pages are loading
 * The sidebar is rendered at the layout level, so we only show content loading state
 */
export default function AdminLoading() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  return (
    <>
      {/* Header Skeleton - matches AdminHeader structure */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between h-10">
          {/* Left side - Menu button (mobile) */}
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button className="lg:hidden p-2 text-slate-400">
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Center - Title skeleton */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-40 h-5 bg-slate-200 rounded animate-pulse" />
          </div>

          {/* Right side - Action buttons skeleton */}
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      {/* Content Loading */}
      <main className="flex-1 p-4 lg:p-6 overflow-auto bg-slate-50">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-200 rounded-full" />
              <Loader2 className="w-16 h-16 text-[#009DE0] animate-spin absolute top-0 left-0" style={{ animationDuration: '1s' }} />
            </div>
            <p className="text-slate-500 mt-4 font-medium">
              {isRTL ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
