'use client'

import { useLocale, useTranslations } from 'next-intl'
import { MapPin, ChevronDown } from 'lucide-react'
import { SearchBar } from '../shared/SearchBar'

interface HeroSectionProps {
  location?: string
  onLocationClick?: () => void
  onSearch?: (query: string) => void
  className?: string
}

export function HeroSection({
  location,
  onLocationClick,
  onSearch,
  className = '',
}: HeroSectionProps) {
  const locale = useLocale()
  const t = useTranslations('home')

  const defaultLocation = locale === 'ar' ? 'اختر موقعك' : 'Select your location'

  return (
    <section className={`bg-gradient-to-br from-primary to-primary/80 text-white ${className}`}>
      <div className="px-4 py-6 pb-8">
        {/* Greeting */}
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">
            {locale === 'ar' ? 'مرحباً بك!' : 'Hello!'}
          </h1>
          <p className="text-white/80 text-sm">
            {locale === 'ar' ? 'ماذا تريد أن تطلب اليوم؟' : 'What would you like to order today?'}
          </p>
        </div>

        {/* Location Selector */}
        <button
          onClick={onLocationClick}
          className="flex items-center gap-2 mb-4 bg-white/10 rounded-lg px-3 py-2 w-full hover:bg-white/20 transition-colors"
        >
          <MapPin className="w-4 h-4 text-white/80 flex-shrink-0" />
          <span className="text-sm truncate flex-1 text-start">
            {location || defaultLocation}
          </span>
          <ChevronDown className="w-4 h-4 text-white/80 flex-shrink-0" />
        </button>

        {/* Search Bar */}
        <SearchBar
          onSearch={onSearch}
          placeholder={locale === 'ar' ? 'ابحث عن متجر أو منتج...' : 'Search for store or product...'}
          className="[&_input]:bg-white [&_input]:rounded-xl"
        />
      </div>

      {/* Wave decoration */}
      <div className="h-4 bg-slate-50 rounded-t-3xl" />
    </section>
  )
}
