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
  const [pendingOrders, setPendingOrders] = useState(0)
  const [unrespondedReviews, setUnrespondedReviews] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Refresh notification counts
  const refreshCounts = useCallback(async (providerId: string) => {
    const supabase = createClient()
    const [pendingResult, reviewsResult, messagesResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id')
        .eq('provider_id', providerId)
        .eq('status', 'pending'),
      supabase
        .from('reviews')
        .select('id')
        .eq('provider_id', providerId)
        .is('provider_response', null),
      supabase
        .from('order_messages')
        .select('id, orders!inner(provider_id)')
        .eq('sender_type', 'customer')
        .eq('is_read', false)
    ])
    setPendingOrders(pendingResult.data?.length || 0)
    setUnrespondedReviews(reviewsResult.data?.length || 0)
    const providerMessages = (messagesResult.data || []).filter((m: any) => m.orders?.provider_id === providerId)
    setUnreadMessages(providerMessages.length)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [])

  // Realtime subscriptions for notification updates
  useEffect(() => {
    if (!provider?.id) return

    const supabase = createClient()
    const providerId = provider.id

    // Subscribe to order changes (new orders, status updates)
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
            // Play notification sound
            try {
              const audio = new Audio('/sounds/new-order.mp3')
              audio.volume = 0.7
              audio.play().catch(() => {})
            } catch {}
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
          // Decrement if was pending and now something else
          if (oldOrder.status === 'pending' && newOrder.status !== 'pending') {
            setPendingOrders(prev => Math.max(0, prev - 1))
          }
          // Increment if became pending (unlikely but handle it)
          if (oldOrder.status !== 'pending' && newOrder.status === 'pending') {
            setPendingOrders(prev => prev + 1)
          }
        }
      )
      .subscribe()

    // Subscribe to message changes (new messages, read status)
    const messagesChannel = supabase
      .channel(`layout-messages-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `sender_type=eq.customer`,
        },
        async (payload) => {
          // Check if message is for this provider's order
          const newMessage = payload.new as { order_id: string }
          const { data: orderData } = await supabase
            .from('orders')
            .select('provider_id')
            .eq('id', newMessage.order_id)
            .single()

          if (orderData?.provider_id === providerId) {
            setUnreadMessages(prev => prev + 1)
            // Play notification sound
            try {
              const audio = new Audio('/sounds/notification.mp3')
              audio.volume = 0.5
              audio.play().catch(() => {})
            } catch {}
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_messages',
        },
        async (payload) => {
          const oldMsg = payload.old as { is_read: boolean; sender_type: string }
          const newMsg = payload.new as { is_read: boolean; sender_type: string; order_id: string }

          // Only care about customer messages being marked as read
          if (newMsg.sender_type === 'customer' && !oldMsg.is_read && newMsg.is_read) {
            // Check if message is for this provider's order
            const { data: orderData } = await supabase
              .from('orders')
              .select('provider_id')
              .eq('id', newMsg.order_id)
              .single()

            if (orderData?.provider_id === providerId) {
              setUnreadMessages(prev => Math.max(0, prev - 1))
            }
          }
        }
      )
      .subscribe()

    // Subscribe to review changes
    const reviewsChannel = supabase
      .channel(`layout-reviews-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
          filter: `provider_id=eq.${providerId}`,
        },
        () => {
          setUnrespondedReviews(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reviews',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const oldReview = payload.old as { provider_response: string | null }
          const newReview = payload.new as { provider_response: string | null }
          // Decrement if response was added
          if (!oldReview.provider_response && newReview.provider_response) {
            setUnrespondedReviews(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(reviewsChannel)
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
        await refreshCounts(providerData[0].id)
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
          totalNotifications={pendingOrders + unrespondedReviews + unreadMessages}
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
