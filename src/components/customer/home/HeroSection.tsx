'use client'

import { useLocale } from 'next-intl'
import { Search, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeroSectionProps {
  onChatClick?: () => void
  onSearch?: (query: string) => void
  onSearchClick?: () => void
  className?: string
}

/**
 * Hero Section for the homepage with chat ordering CTA
 * Design: Gradient background from #E0F4FF to white with chat button
 */
export function HeroSection({
  onChatClick,
  onSearch,
  onSearchClick,
  className = '',
}: HeroSectionProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  return (
    <section
      className={cn(
        'bg-gradient-to-b from-[#E0F4FF] to-white',
        className
      )}
    >
      <div className="px-4 pt-6 pb-8">
        {/* Chat Order CTA */}
        <div className="text-center mb-6">
          {/* CTA Text */}
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            {isRTL ? 'عايز تطلب إيه؟' : 'What do you want to order?'}
          </h2>
          <p className="text-slate-500 text-sm mb-4">
            {isRTL ? 'ابحث أو دردش مع مساعدنا الذكي' : 'Search or chat with our smart assistant'}
          </p>
        </div>

        {/* Search Bar */}
        <div
          onClick={onSearchClick}
          className="relative bg-white rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center px-4 py-3">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              readOnly
              placeholder={isRTL ? 'ابحث عن مطعم أو أكلة...' : 'Search for restaurant or food...'}
              className="flex-1 mx-3 bg-transparent text-slate-900 placeholder:text-slate-400 outline-none cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onSearchClick?.()
              }}
            />
            {onChatClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onChatClick?.()
                }}
                className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
                aria-label={isRTL ? 'دردش واطلب' : 'Chat & Order'}
              >
                <MessageCircle className="w-4 h-4 text-primary" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
