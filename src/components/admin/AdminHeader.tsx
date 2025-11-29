'use client'

import { useLocale } from 'next-intl'
import { useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Shield,
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Globe,
  Settings,
} from 'lucide-react'

interface AdminHeaderProps {
  user: User
  title: string
  subtitle?: string
  onMenuClick: () => void
  notificationCount?: number
}

export function AdminHeader({
  user,
  title,
  subtitle,
  onMenuClick,
  notificationCount = 0,
}: AdminHeaderProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const isRTL = locale === 'ar'
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const switchLanguage = useCallback(() => {
    const newLocale = locale === 'ar' ? 'en' : 'ar'
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)

    // Add no-transition class to prevent flash
    document.documentElement.classList.add('no-transition')

    // Update HTML attributes before navigation
    document.documentElement.lang = newLocale
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr'

    // Use startTransition for smoother navigation
    startTransition(() => {
      router.push(newPathname)
    })

    // Remove no-transition class after a brief delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-transition')
      })
    })
  }, [locale, pathname, router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button and mobile logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link href={`/${locale}/admin`} className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-red-600">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </span>
          </Link>
        </div>

        {/* Center - Page Title */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={switchLanguage}
            disabled={isPending}
            className="flex items-center gap-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100"
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">
              {isPending ? '...' : locale === 'ar' ? 'EN' : 'عربي'}
            </span>
          </Button>

          {/* Notifications */}
          <button className="relative p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div
            className="relative"
            onMouseEnter={() => setAccountMenuOpen(true)}
            onMouseLeave={() => setAccountMenuOpen(false)}
          >
            <button className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="font-semibold text-sm text-red-600">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-700">
                {locale === 'ar' ? 'المسؤول' : 'Admin'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {accountMenuOpen && (
              <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                  {/* User info */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      href={`/${locale}/admin/settings`}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {locale === 'ar' ? 'الإعدادات' : 'Settings'}
                    </Link>
                    <Link
                      href={`/${locale}`}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      {locale === 'ar' ? 'العودة للموقع' : 'Back to Site'}
                    </Link>
                  </div>

                  {/* Sign out */}
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={handleSignOut}
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
