'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  LogOut,
  User as UserIcon,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'

type HeaderProps = {
  showBack?: boolean
  backHref?: string
  backLabel?: string
}

export function Header({ showBack = false, backHref, backLabel }: HeaderProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setAuthLoading(false)
    
    // If user is logged in, fetch active orders count
    if (user) {
      fetchActiveOrdersCount(user.id)
    }
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchActiveOrdersCount(session.user.id)
      } else {
        setActiveOrdersCount(0)
      }
    })
    
    return () => subscription.unsubscribe()
  }

  async function fetchActiveOrdersCount(userId: string) {
    const supabase = createClient()
    
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', userId)
      .not('status', 'in', '("delivered","cancelled","rejected")')

    if (!error && count !== null) {
      setActiveOrdersCount(count)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Back or Logo */}
          {showBack ? (
            <Link
              href={backHref || `/${locale}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{backLabel || (locale === 'ar' ? 'رجوع' : 'Back')}</span>
            </Link>
          ) : (
            <Link href={`/${locale}`} className="text-2xl font-bold text-primary">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </Link>
          )}
          
          {/* Center - Logo (when showing back) */}
          {showBack && (
            <Link href={`/${locale}`} className="text-xl font-bold text-primary">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </Link>
          )}
          
          {/* Right Side - Auth & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {authLoading ? (
              <div className="w-20 h-8 bg-muted animate-pulse rounded" />
            ) : user ? (
              <>
                {/* My Orders Link */}
                <Link href={`/${locale}/orders`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative flex items-center gap-1.5"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {locale === 'ar' ? 'طلباتي' : 'My Orders'}
                    </span>
                    {activeOrdersCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                        {activeOrdersCount}
                      </span>
                    )}
                  </Button>
                </Link>
                
                {/* User Info */}
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                  <UserIcon className="w-4 h-4" />
                  <span className="max-w-[100px] truncate">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                
                {/* Sign Out Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-900 dark:hover:border-red-800 dark:hover:bg-red-950"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {locale === 'ar' ? 'خروج' : 'Logout'}
                  </span>
                </Button>
              </>
            ) : (
              <Link href={`/${locale}/auth/login`}>
                <Button variant="default" size="sm">
                  {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
