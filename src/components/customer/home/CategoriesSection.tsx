'use client'

import { useLocale } from 'next-intl'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  key: string
  nameAr: string
  nameEn: string
  emoji: string
  gradient: string
}

// Categories with gradient backgrounds and emojis
// Updated December 2024 - New design with 9 categories
const categories: Category[] = [
  {
    id: '1',
    key: 'restaurants',
    nameAr: 'مطاعم',
    nameEn: 'Restaurants',
    emoji: '🍔',
    gradient: 'linear-gradient(145deg, rgba(254,243,199,0.85) 0%, rgba(254,249,195,0.7) 100%)'
  },
  {
    id: '2',
    key: 'supermarket',
    nameAr: 'سوبر ماركت',
    nameEn: 'Supermarket',
    emoji: '🛒',
    gradient: 'linear-gradient(145deg, rgba(224,244,255,0.9) 0%, rgba(186,230,253,0.75) 100%)'
  },
  {
    id: '3',
    key: 'coffee-sweets',
    nameAr: 'البن والحلويات',
    nameEn: 'Coffee & Sweets',
    emoji: '☕',
    gradient: 'linear-gradient(145deg, rgba(245,235,220,0.9) 0%, rgba(237,224,205,0.75) 100%)'
  },
  {
    id: '4',
    key: 'vegetables-fruits',
    nameAr: 'خضروات وفواكه',
    nameEn: 'Vegetables & Fruits',
    emoji: '🍌',
    gradient: 'linear-gradient(145deg, rgba(209,250,229,0.85) 0%, rgba(167,243,208,0.7) 100%)'
  },
  {
    id: '5',
    key: 'pharmacy',
    nameAr: 'صيدليات',
    nameEn: 'Pharmacy',
    emoji: '💊',
    gradient: 'linear-gradient(145deg, rgba(255,228,230,0.85) 0%, rgba(254,205,211,0.7) 100%)'
  },
  {
    id: '6',
    key: 'drinks',
    nameAr: 'مشروبات',
    nameEn: 'Drinks',
    emoji: '🥤',
    gradient: 'linear-gradient(145deg, rgba(255,237,213,0.85) 0%, rgba(254,215,170,0.7) 100%)'
  },
  {
    id: '7',
    key: 'homefood',
    nameAr: 'أكل بيتي',
    nameEn: 'Home Food',
    emoji: '🍲',
    gradient: 'linear-gradient(145deg, rgba(255,237,213,0.9) 0%, rgba(254,215,170,0.75) 100%)'
  },
  {
    id: '8',
    key: 'gifts-flowers',
    nameAr: 'هدايا وورود',
    nameEn: 'Gifts & Flowers',
    emoji: '💐',
    gradient: 'linear-gradient(145deg, rgba(252,231,243,0.85) 0%, rgba(251,207,232,0.7) 100%)'
  },
  {
    id: '9',
    key: 'other',
    nameAr: 'أخرى',
    nameEn: 'Other',
    emoji: '🛍️',
    gradient: 'linear-gradient(145deg, rgba(237,233,254,0.85) 0%, rgba(221,214,254,0.7) 100%)'
  }
]

interface CategoriesSectionProps {
  selectedCategory?: string
  onCategoryClick?: (categoryKey: string) => void
  showViewAll?: boolean
  onViewAll?: () => void
  className?: string
}

export function CategoriesSection({
  selectedCategory,
  onCategoryClick,
  showViewAll = true,
  onViewAll,
  className = '',
}: CategoriesSectionProps) {
  const locale = useLocale()

  const sectionTitle = locale === 'ar' ? 'الأقسام' : 'Categories'

  return (
    <section className={cn('py-5 px-4 bg-slate-50', className)}>
      {/* Section Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-900">{sectionTitle}</h2>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-[#009DE0] hover:underline"
          >
            {locale === 'ar' ? 'عرض الكل' : 'View All'}
          </button>
        )}
      </div>

      {/* Categories Horizontal Scroll */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.key

          const cardContent = (
            <div
              className="flex flex-col items-center flex-shrink-0"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Card */}
              <div
                className={cn(
                  'w-[76px] h-[76px] rounded-[18px] flex items-center justify-center',
                  'transition-all duration-300 cursor-pointer',
                  'hover:scale-[1.08] hover:-translate-y-0.5',
                  isSelected && 'scale-[1.08]'
                )}
                style={{
                  background: category.gradient,
                  boxShadow: isSelected
                    ? '0 0 0 2.5px #009DE0, 0 8px 25px rgba(0,157,224,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                  }
                }}
              >
                <span
                  className="text-[34px] leading-none select-none"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                >
                  {category.emoji}
                </span>
              </div>

              {/* Label */}
              <span className="mt-2.5 text-xs font-medium text-slate-600 text-center max-w-[76px] leading-tight line-clamp-2">
                {locale === 'ar' ? category.nameAr : category.nameEn}
              </span>
            </div>
          )

          if (onCategoryClick) {
            return (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.key)}
                className="flex-shrink-0 focus:outline-none"
              >
                {cardContent}
              </button>
            )
          }

          return (
            <Link
              key={category.id}
              href={`/${locale}/providers?category=${category.key}`}
              className="flex-shrink-0"
            >
              {cardContent}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export { categories }
export type { Category }
