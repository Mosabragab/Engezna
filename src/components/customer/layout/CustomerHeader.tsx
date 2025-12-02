'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, Bell, User, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface CustomerHeaderProps {
  showBackButton?: boolean
  title?: string
  transparent?: boolean
}

export function CustomerHeader({ showBackButton = false, title, transparent = false }: CustomerHeaderProps) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('header')

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [currentLocation, setCurrentLocation] = useState(locale === 'ar' ? 'بني سويف' : 'Beni Suef')

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) return

      // Get notification count - wrap in try-catch in case table doesn't exist
      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)

        setNotificationCount(count || 0)
      } catch (error) {
        console.log('Notifications table may not exist yet')
        setNotificationCount(0)
      }

      // Get user's current location from profile
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select(`
            governorate_id,
            city_id,
            governorates:governorate_id (name_ar, name_en),
            cities:city_id (name_ar, name_en)
          `)
          .eq('id', user.id)
          .single()

        if (error) {
          console.log('Error fetching profile location:', error.message)
          return
        }

        if (profile) {
          // Supabase returns joined data as the object directly
          const govData = profile.governorates as unknown as { name_ar: string; name_en: string } | null
          const cityData = profile.cities as unknown as { name_ar: string; name_en: string } | null

          if (cityData && cityData.name_ar) {
            setCurrentLocation(locale === 'ar' ? cityData.name_ar : cityData.name_en)
          } else if (govData && govData.name_ar) {
            setCurrentLocation(locale === 'ar' ? govData.name_ar : govData.name_en)
          }
        }
      } catch (error) {
        console.log('Error fetching location:', error)
      }
    } catch (error) {
      console.error('Error checking auth:', error)
    }
  }

  return (
    <header className={`sticky top-0 z-40 ${transparent ? 'bg-transparent' : 'bg-white border-b border-slate-100 shadow-sm'}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left Section - Back button or Location */}
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-slate-500 hover:text-primary"
              >
                {locale === 'ar' ? 'رجوع' : 'Back'}
              </Button>
            ) : (
              <button
                onClick={() => router.push(`/${locale}/profile/governorate`)}
                className="flex items-center gap-2 text-sm hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors"
              >
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium text-slate-900 max-w-[150px] truncate">
                  {currentLocation}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            )}

            {/* Title if provided */}
            {title && showBackButton && (
              <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            )}
          </div>

          {/* Center - Logo (only on home without back button) */}
          {!showBackButton && !title && (
            <Link href={`/${locale}`} className="absolute left-1/2 -translate-x-1/2">
              <span className="text-xl font-bold text-primary">
                {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
              </span>
            </Link>
          )}

          {/* Right Section - Notifications & Profile */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link href={`/${locale}/notifications`}>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="h-5 w-5 text-slate-600" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Profile */}
            <Link href={user ? `/${locale}/profile` : `/${locale}/auth/login`}>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <User className="h-5 w-5 text-slate-600" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
