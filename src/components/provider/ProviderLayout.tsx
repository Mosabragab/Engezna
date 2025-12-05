'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { ProviderSidebar } from './ProviderSidebar'
import { ProviderHeader } from './ProviderHeader'
import type { User } from '@supabase/supabase-js'

interface Provider {
  id: string
  name_ar: string
  name_en: string
  logo_url: string | null
  status: string
  category: string
}

interface ProviderLayoutProps {
  children: ReactNode
  pageTitle?: { ar: string; en: string }
  pageSubtitle?: { ar: string; en: string }
}

export function ProviderLayout({ children, pageTitle, pageSubtitle }: ProviderLayoutProps) {
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [unrespondedReviews, setUnrespondedReviews] = useState(0)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: providerData } = await supabase
        .from('providers')
        .select('id, name_ar, name_en, logo_url, status, category')
        .eq('owner_id', user.id)
        .limit(1)

      if (providerData && providerData.length > 0) {
        setProvider(providerData[0])
        // Load pending orders count and unresponded reviews count in parallel
        const [pendingResult, reviewsResult] = await Promise.all([
          supabase
            .from('orders')
            .select('id')
            .eq('provider_id', providerData[0].id)
            .eq('status', 'pending'),
          supabase
            .from('reviews')
            .select('id')
            .eq('provider_id', providerData[0].id)
            .is('provider_response', null)
        ])
        setPendingOrders(pendingResult.data?.length || 0)
        setUnrespondedReviews(reviewsResult.data?.length || 0)
      }
    }

    setLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <div className="flex justify-center mb-4">
            <EngeznaLogo size="lg" static showPen={false} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'لوحة مقدم الخدمة' : 'Provider Dashboard'}
          </h1>
          <p className="text-slate-600 mb-6">
            {locale === 'ar'
              ? 'يجب تسجيل الدخول للوصول إلى لوحة التحكم'
              : 'Please login to access your dashboard'}
          </p>
          <Link href={`/${locale}/auth/login`}>
            <Button size="lg">
              {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <ProviderSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        provider={provider}
        pendingOrders={pendingOrders}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <ProviderHeader
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          onSignOut={handleSignOut}
          pendingOrders={pendingOrders}
          totalNotifications={pendingOrders + unrespondedReviews}
          providerId={provider?.id}
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
