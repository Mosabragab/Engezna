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
      <div className="min-h-screen bg-muted">
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
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: MapPin,
      label: t('menu.addresses'),
      href: `/${locale}/profile/addresses`,
      color: 'text-[#22C55E]',
      bgColor: 'bg-[#DCFCE7]',
    },
    {
      icon: Mail,
      label: t('menu.email'),
      href: `/${locale}/profile/email`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Lock,
      label: t('menu.password'),
      href: `/${locale}/profile/password`,
      color: 'text-[#EF4444]',
      bgColor: 'bg-[#FEF2F2]',
    },
    {
      icon: Globe,
      label: t('menu.language'),
      href: `/${locale}/profile/language`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: MapPinned,
      label: t('menu.governorate'),
      href: `/${locale}/profile/governorate`,
      color: 'text-[#3B82F6]',
      bgColor: 'bg-[#dbeafe]',
    },
  ]

  return (
    <div className="min-h-screen bg-muted">
      <Header showBack backHref={`/${locale}`} />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          {t('title')}
        </h1>

        {/* Settings Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            const ChevronIcon = isRTL ? ChevronLeft : ChevronRight

            return (
              <Link key={item.href} href={item.href}>
                <Card className="p-4 hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.bgColor} ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-foreground">
                        {item.label}
                      </span>
                    </div>
                    <ChevronIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            )
          })}

          {/* Logout Button */}
          <Card
            className="p-4 hover:bg-[#FEF2F2] transition-colors cursor-pointer border-[#EF4444]/30"
            onClick={handleLogout}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#FEF2F2] text-[#EF4444]">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-medium text-[#EF4444]">
                {t('menu.logout')}
              </span>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
