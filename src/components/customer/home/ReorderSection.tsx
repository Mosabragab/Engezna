'use client'

import { useLocale } from 'next-intl'
import { RefreshCw, FileText, Clock, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LastOrder {
  id: string
  providerName: string
  providerNameAr: string
  providerLogo?: string
  items: string[]
  itemsAr: string[]
  total: number
  createdAt: Date
}

interface ReorderSectionProps {
  lastOrder?: LastOrder | null
  onReorder?: (orderId: string) => void
  onViewDetails?: (orderId: string) => void
  className?: string
}

/**
 * Reorder Section - Shows the last order with quick reorder action
 * Design: Card with provider info, items summary, and action buttons
 */
export function ReorderSection({
  lastOrder,
  onReorder,
  onViewDetails,
  className = '',
}: ReorderSectionProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  // Don't render if no last order
  if (!lastOrder) return null

  const providerName = isRTL ? lastOrder.providerNameAr : lastOrder.providerName
  const items = isRTL ? lastOrder.itemsAr : lastOrder.items

  // Format relative time
  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return isRTL ? 'اليوم' : 'Today'
    } else if (diffInDays === 1) {
      return isRTL ? 'أمس' : 'Yesterday'
    } else if (diffInDays < 7) {
      return isRTL ? `منذ ${diffInDays} أيام` : `${diffInDays} days ago`
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return isRTL ? `منذ ${weeks} أسبوع` : `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else {
      const months = Math.floor(diffInDays / 30)
      return isRTL ? `منذ ${months} شهر` : `${months} month${months > 1 ? 's' : ''} ago`
    }
  }

  return (
    <section className={cn('px-4 py-4', className)}>
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-slate-900">
          {isRTL ? 'اطلب تاني' : 'Reorder'}
        </h2>
      </div>

      {/* Last Order Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex gap-3">
          {/* Provider Logo */}
          <div className="w-14 h-14 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {lastOrder.providerLogo ? (
              <img
                src={lastOrder.providerLogo}
                alt={providerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Store className="w-6 h-6 text-slate-400" />
            )}
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 mb-1">
              {isRTL ? `آخر طلب من ${providerName}` : `Last order from ${providerName}`}
            </h3>
            <p className="text-sm text-slate-600 truncate mb-1">
              {items.slice(0, 3).join('، ')}
              {items.length > 3 && (isRTL ? ` +${items.length - 3} أخرى` : ` +${items.length - 3} more`)}
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-primary">
                {lastOrder.total} {isRTL ? 'ج.م' : 'EGP'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {getRelativeTime(lastOrder.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => onReorder?.(lastOrder.id)}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {isRTL ? 'اطلب تاني' : 'Reorder'}
          </button>
          <button
            onClick={() => onViewDetails?.(lastOrder.id)}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2.5 px-4 rounded-lg font-medium hover:bg-slate-200 transition-colors"
          >
            <FileText className="w-4 h-4" />
            {isRTL ? 'التفاصيل' : 'Details'}
          </button>
        </div>
      </div>
    </section>
  )
}
