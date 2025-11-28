'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/shared/Header'
import { Card } from '@/components/ui/card'
import {
  User,
  MapPin,
  Mail,
  Lock,
  Globe,
  MapPinned,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Loader2,
} from 'lucide-react'

export default function SettingsPage() {
  const locale = useLocale()
  const t = useTranslations('settings')
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/profile`)
      return
    }

    setAuthLoading(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}/auth/login`)
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack backHref={`/${locale}`} />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  const menuItems = [
    {
      icon: User,
      label: t('menu.account'),
      href: `/${locale}/profile/account`,
      color: 'text-blue-600',
    },
    {
      icon: MapPin,
      label: t('menu.addresses'),
      href: `/${locale}/profile/addresses`,
      color: 'text-green-600',
    },
    {
      icon: Mail,
      label: t('menu.email'),
      href: `/${locale}/profile/email`,
      color: 'text-purple-600',
    },
    {
      icon: Lock,
      label: t('menu.password'),
      href: `/${locale}/profile/password`,
      color: 'text-red-600',
    },
    {
      icon: Globe,
      label: t('menu.language'),
      href: `/${locale}/profile/language`,
      color: 'text-indigo-600',
    },
    {
      icon: MapPinned,
      label: t('menu.governorate'),
      href: `/${locale}/profile/governorate`,
      color: 'text-cyan-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack backHref={`/${locale}`} />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t('title')}
        </h1>

        {/* Settings Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            const ChevronIcon = isRTL ? ChevronLeft : ChevronRight

            return (
              <Link key={item.href} href={item.href}>
                <Card className="p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gray-100 ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">
                        {item.label}
                      </span>
                    </div>
                    <ChevronIcon className="w-5 h-5 text-gray-400" />
                  </div>
                </Card>
              </Link>
            )
          })}

          {/* Logout Button */}
          <Card
            className="p-4 hover:bg-red-50 transition-colors cursor-pointer border-red-200"
            onClick={handleLogout}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-medium text-red-600">
                {t('menu.logout')}
              </span>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
