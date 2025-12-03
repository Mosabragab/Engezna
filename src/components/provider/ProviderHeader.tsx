'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import {
  Store,
  Menu,
  Bell,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface ProviderHeaderProps {
  user: User | null
  onMenuClick: () => void
  onSignOut: () => void
  pendingOrders?: number
  pageTitle?: { ar: string; en: string }
  pageSubtitle?: { ar: string; en: string }
}

export function ProviderHeader({
  user,
  onMenuClick,
  onSignOut,
  pendingOrders = 0,
  pageTitle,
  pageSubtitle,
}: ProviderHeaderProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Right Side (RTL): Menu & Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-slate-500 hover:text-slate-700"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo - visible on mobile, hidden on desktop */}
          <Link href={`/${locale}/provider`} className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-primary">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </span>
          </Link>
        </div>

        {/* Center: Page Title on Desktop */}
        {pageTitle && (
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-800">
                {locale === 'ar' ? pageTitle.ar : pageTitle.en}
              </h2>
              {pageSubtitle && (
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? pageSubtitle.ar : pageSubtitle.en}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Left Side (RTL): Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <button className="relative p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            {pendingOrders > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingOrders > 9 ? '9+' : pendingOrders}
              </span>
            )}
          </button>

          {/* Account Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setAccountMenuOpen(true)}
            onMouseLeave={() => setAccountMenuOpen(false)}
          >
            <button className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="font-semibold text-sm text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-700">
                {locale === 'ar' ? 'حسابي' : 'My Account'}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {accountMenuOpen && (
              <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                  {/* User Info */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href={`/${locale}/provider/settings`}
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" />
                      {locale === 'ar' ? 'حسابي' : 'My Account'}
                    </Link>
                    <Link
                      href={`/${locale}`}
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      {locale === 'ar' ? 'العودة للموقع' : 'Back to Site'}
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false)
                        onSignOut()
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
