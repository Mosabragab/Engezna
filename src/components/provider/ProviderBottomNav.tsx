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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 shadow-elegant-lg z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200 ${
                isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-primary/10' : ''
              }`}>
                <Icon className="w-5 h-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium mt-0.5">
                {locale === 'ar' ? item.label.ar : item.label.en}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
