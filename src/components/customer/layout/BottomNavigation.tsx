'use client'

import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Home, Search, ShoppingCart, ClipboardList, Heart } from 'lucide-react'
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
    { id: 'orders', href: `/${locale}/orders`, icon: ClipboardList, labelKey: 'orders' },
    { id: 'favorites', href: `/${locale}/favorites`, icon: Heart, labelKey: 'favorites' },
  ]

  const isActive = (href: string) => {
    if (href === `/${locale}`) {
      return pathname === href || pathname === `/${locale}/`
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-100 shadow-elegant-lg md:hidden">
      {/* Safe area padding for iOS - bottom, left, and right */}
      <div className="pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="flex items-center justify-around h-[68px] px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const isCart = item.id === 'cart'

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 rounded-xl mx-0.5 active:scale-95 ${
                  active
                    ? 'text-primary'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                  active ? 'bg-primary/10' : ''
                }`}>
                  <Icon className={`w-5 h-5 transition-all duration-200 ${
                    active ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'
                  }`} />
                  {/* Cart Badge - Elegant */}
                  {isCart && cartItemsCount > 0 && (
                    <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] flex items-center justify-center bg-gradient-to-r from-primary to-primary/90 text-white text-[10px] font-bold rounded-full px-1 shadow-sm shadow-primary/30">
                      {cartItemsCount > 9 ? '9+' : cartItemsCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 transition-all duration-200 ${
                  active ? 'font-bold text-primary' : 'font-medium'
                }`}>
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
