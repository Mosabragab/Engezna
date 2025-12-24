'use client'

import { useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  ShoppingBag,
  Package,
  RefreshCcw,
} from 'lucide-react'

interface ProviderBottomNavProps {
  pendingOrders?: number
  pendingRefunds?: number
}

export function ProviderBottomNav({ pendingOrders = 0, pendingRefunds = 0 }: ProviderBottomNavProps) {
  const locale = useLocale()
  const pathname = usePathname()

  // Check if current path is under a specific section
  const isHomePage = pathname === `/${locale}/provider`
  const isOrdersSection = pathname.startsWith(`/${locale}/provider/orders`)
  const isProductsSection = pathname.startsWith(`/${locale}/provider/products`)
  const isRefundsSection = pathname.startsWith(`/${locale}/provider/refunds`)

  const navItems: Array<{
    href: string
    icon: typeof Home
    label: { ar: string; en: string }
    isActive: boolean
    badge?: number
  }> = [
    {
      href: `/${locale}/provider`,
      icon: Home,
      label: { ar: 'الرئيسية', en: 'Home' },
      isActive: isHomePage,
    },
    {
      href: `/${locale}/provider/orders`,
      icon: ShoppingBag,
      label: { ar: 'الطلبات', en: 'Orders' },
      isActive: isOrdersSection,
      badge: pendingOrders > 0 ? pendingOrders : undefined,
    },
    {
      href: `/${locale}/provider/products`,
      icon: Package,
      label: { ar: 'المنتجات', en: 'Products' },
      isActive: isProductsSection,
    },
    {
      href: `/${locale}/provider/refunds`,
      icon: RefreshCcw,
      label: { ar: 'المرتجعات', en: 'Refunds' },
      isActive: isRefundsSection,
      badge: pendingRefunds > 0 ? pendingRefunds : undefined,
    },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-1" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">
                {locale === 'ar' ? item.label.ar : item.label.en}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
