'use client'

import { ReactNode, useState, useEffect, useCallback } from 'react'
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
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)

  // Load unread notifications count from provider_notifications table
  const loadUnreadCount = useCallback(async (providerId: string) => {
    const supabase = createClient()

    // Get unread notifications count
    const { count } = await supabase
      .from('provider_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('is_read', false)

    setUnreadCount(count || 0)

    // Also get pending orders for sidebar badge
    const { count: pendingCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('status', 'pending')

    setPendingOrders(pendingCount || 0)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [])

  // Realtime subscription for provider_notifications
  useEffect(() => {
    if (!provider?.id) return

    const supabase = createClient()
    const providerId = provider.id

    // Subscribe to provider_notifications changes
    const notificationsChannel = supabase
      .channel(`provider-notifications-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'provider_notifications',
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          setUnreadCount(prev => prev + 1)
          // Play notification sound
          try {
            const audio = new Audio('/sounds/notification.mp3')
            audio.volume = 0.5
            audio.play().catch(() => {})
          } catch {}
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'provider_notifications',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const oldNotif = payload.old as { is_read: boolean }
          const newNotif = payload.new as { is_read: boolean }
          // Decrement if was unread and now read
          if (!oldNotif.is_read && newNotif.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
          // Increment if was read and now unread (unlikely but handle it)
          if (oldNotif.is_read && !newNotif.is_read) {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'provider_notifications',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const deleted = payload.old as { is_read: boolean }
          // Decrement if deleted notification was unread
          if (!deleted.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    // Also subscribe to orders for pending count (sidebar badge)
    const ordersChannel = supabase
      .channel(`layout-orders-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const newOrder = payload.new as { status: string }
          if (newOrder.status === 'pending') {
            setPendingOrders(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const oldOrder = payload.old as { status: string }
          const newOrder = payload.new as { status: string }
          if (oldOrder.status === 'pending' && newOrder.status !== 'pending') {
            setPendingOrders(prev => Math.max(0, prev - 1))
          }
          if (oldOrder.status !== 'pending' && newOrder.status === 'pending') {
            setPendingOrders(prev => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notificationsChannel)
      supabase.removeChannel(ordersChannel)
    }
  }, [provider?.id])

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
        await loadUnreadCount(providerData[0].id)
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
        unreadNotifications={unreadCount}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <ProviderHeader
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          onSignOut={handleSignOut}
          pendingOrders={pendingOrders}
          totalNotifications={unreadCount}
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
