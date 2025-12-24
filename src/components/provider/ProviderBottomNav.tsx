'use client'

import { useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  ShoppingBag,
  Wallet,
  MoreHorizontal,
} from 'lucide-react'

interface ProviderBottomNavProps {
  pendingOrders?: number
  pendingRefunds?: number
}

export function ProviderBottomNav({ pendingOrders = 0, pendingRefunds = 0 }: ProviderBottomNavProps) {
  const locale = useLocale()
  const pathname = usePathname()

  const navItems = [
    {
      href: `/${locale}/provider`,
      icon: Home,
      label: { ar: 'الرئيسية', en: 'Home' },
      isActive: pathname === `/${locale}/provider`,
    },
    {
      href: `/${locale}/provider/orders`,
      icon: ShoppingBag,
      label: { ar: 'الطلبات', en: 'Orders' },
      isActive: pathname.startsWith(`/${locale}/provider/orders`),
      badge: pendingOrders > 0 ? pendingOrders : undefined,
    },
    {
      href: `/${locale}/provider/finance`,
      icon: Wallet,
      label: { ar: 'المالية', en: 'Finance' },
      isActive: pathname.startsWith(`/${locale}/provider/finance`) || pathname.startsWith(`/${locale}/provider/settlements`),
    },
    {
      href: `/${locale}/provider/menu`,
      icon: MoreHorizontal,
      label: { ar: 'المزيد', en: 'More' },
      isActive: false, // "More" opens the sidebar instead
      isMoreButton: true,
    },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive

          if (item.isMoreButton) {
            // "More" button - just a placeholder that indicates there's more
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                  isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">
                  {locale === 'ar' ? item.label.ar : item.label.en}
                </span>
              </Link>
            )
          }

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
