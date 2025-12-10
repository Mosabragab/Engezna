'use client'

import { useLocale } from 'next-intl'
import { Loader2 } from 'lucide-react'

/**
 * Admin Loading State
 * Shows a loading spinner while pages are loading
 * The sidebar is rendered at the layout level, so we only show content loading state
 */
export default function AdminLoading() {
  const locale = useLocale()

  return (
    <>
      {/* Header Skeleton */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-6 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="w-32 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      {/* Content Loading */}
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-slate-500">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
