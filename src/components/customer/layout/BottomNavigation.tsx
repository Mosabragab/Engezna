'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Home, Search, ShoppingCart, Heart, User } from 'lucide-react'
import { useCart } from '@/lib/store/cart'

interface NavItem {
  id: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  labelKey: string
}

export function BottomNavigation() {
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('bottomNav')
  const { cart } = useCart()

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const navItems: NavItem[] = [
    { id: 'home', href: `/${locale}`, icon: Home, labelKey: 'home' },
    { id: 'browse', href: `/${locale}/providers`, icon: Search, labelKey: 'browse' },
    { id: 'cart', href: `/${locale}/cart`, icon: ShoppingCart, labelKey: 'cart' },
    { id: 'favorites', href: `/${locale}/favorites`, icon: Heart, labelKey: 'favorites' },
    { id: 'profile', href: `/${locale}/profile`, icon: User, labelKey: 'profile' },
  ]

  const isActive = (href: string) => {
    if (href === `/${locale}`) {
      return pathname === href || pathname === `/${locale}/`
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:hidden">
      {/* Safe area padding for iOS - bottom, left, and right */}
      <div className="pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const isCart = item.id === 'cart'

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  active ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                  {/* Cart Badge - Red color for visibility */}
                  {isCart && cartItemsCount > 0 && (
                    <span className="absolute -top-2 -end-2 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                      {cartItemsCount > 9 ? '9+' : cartItemsCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 ${active ? 'font-semibold' : 'font-normal'}`}>
                  {t(item.labelKey)}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
