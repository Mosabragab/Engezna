'use client'

import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  UtensilsCrossed,
  Coffee,
  ShoppingBasket,
  Apple,
  Cake,
  Pizza,
  IceCream,
  Sandwich,
} from 'lucide-react'
import type { ReactNode } from 'react'

interface Category {
  id: string
  name_ar: string
  name_en: string
  icon: ReactNode
  color: string
  bgColor: string
}

const defaultCategories: Category[] = [
  {
    id: 'restaurants',
    name_ar: 'مطاعم',
    name_en: 'Restaurants',
    icon: <UtensilsCrossed className="w-6 h-6" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    id: 'coffee',
    name_ar: 'مقاهي',
    name_en: 'Coffee',
    icon: <Coffee className="w-6 h-6" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  {
    id: 'groceries',
    name_ar: 'بقالة',
    name_en: 'Groceries',
    icon: <ShoppingBasket className="w-6 h-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'fruits',
    name_ar: 'خضار وفواكه',
    name_en: 'Fruits',
    icon: <Apple className="w-6 h-6" />,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
  },
  {
    id: 'bakery',
    name_ar: 'مخبوزات',
    name_en: 'Bakery',
    icon: <Cake className="w-6 h-6" />,
    color: 'text-pink-500',
    bgColor: 'bg-pink-100',
  },
  {
    id: 'pizza',
    name_ar: 'بيتزا',
    name_en: 'Pizza',
    icon: <Pizza className="w-6 h-6" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    id: 'desserts',
    name_ar: 'حلويات',
    name_en: 'Desserts',
    icon: <IceCream className="w-6 h-6" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'sandwiches',
    name_ar: 'سندويشات',
    name_en: 'Sandwiches',
    icon: <Sandwich className="w-6 h-6" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
]

interface CategoriesSectionProps {
  categories?: Category[]
  title?: string
  showViewAll?: boolean
  onViewAll?: () => void
  onCategoryClick?: (categoryId: string) => void
  className?: string
}

export function CategoriesSection({
  categories = defaultCategories,
  title,
  showViewAll = true,
  onViewAll,
  onCategoryClick,
  className = '',
}: CategoriesSectionProps) {
  const locale = useLocale()
  const t = useTranslations('home')

  const sectionTitle = title || (locale === 'ar' ? 'الأقسام' : 'Categories')

  return (
    <section className={`bg-slate-50 px-4 py-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">{sectionTitle}</h2>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary font-medium"
          >
            {locale === 'ar' ? 'عرض الكل' : 'View All'}
          </button>
        )}
      </div>

      {/* Categories Grid - Horizontal Scroll on Mobile */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        <div className="flex gap-3 md:grid md:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => {
            const content = (
              <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-full ${category.bgColor} ${category.color} flex items-center justify-center`}>
                  {category.icon}
                </div>
                <span className="text-xs font-medium text-slate-700 text-center line-clamp-1">
                  {locale === 'ar' ? category.name_ar : category.name_en}
                </span>
              </div>
            )

            if (onCategoryClick) {
              return (
                <button
                  key={category.id}
                  onClick={() => onCategoryClick(category.id)}
                  className="flex-shrink-0 w-20 md:w-auto text-start"
                >
                  {content}
                </button>
              )
            }

            return (
              <Link
                key={category.id}
                href={`/${locale}/providers?category=${category.id}`}
                className="flex-shrink-0 w-20 md:w-auto"
              >
                {content}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
