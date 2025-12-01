'use client'

import { useLocale } from 'next-intl'
import { Mic, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeroSectionProps {
  onVoiceClick?: () => void
  onSearch?: (query: string) => void
  onSearchClick?: () => void
  className?: string
}

/**
 * Hero Section for the homepage with voice ordering CTA
 * Design: Gradient background from #E0F4FF to white with large mic button
 */
export function HeroSection({
  onVoiceClick,
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
        {/* Voice Order CTA */}
        <div className="text-center mb-6">
          {/* Large Mic Button */}
          <button
            onClick={onVoiceClick}
            className="relative w-20 h-20 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
            aria-label={isRTL ? 'اطلب بصوتك' : 'Order with voice'}
          >
            <Mic className="w-8 h-8 text-white" />
            {/* Pulse Animation */}
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
          </button>

          {/* CTA Text */}
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            {isRTL ? 'عايز تطلب إيه؟' : 'What do you want to order?'}
          </h2>
          <p className="text-primary font-medium">
            {isRTL ? 'اضغط واتكلم!' : 'Tap and speak!'}
          </p>
        </div>

        {/* Search Bar with Mic Icon */}
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
            <button
              onClick={(e) => {
                e.stopPropagation()
                onVoiceClick?.()
              }}
              className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
              aria-label={isRTL ? 'بحث صوتي' : 'Voice search'}
            >
              <Mic className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
