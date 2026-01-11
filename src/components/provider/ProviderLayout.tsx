'use client'

import { ReactNode, useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { setAppBadge, clearAppBadge } from '@/hooks/useBadge'
import { Button } from '@/components/ui/button'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { ProviderSidebar } from './ProviderSidebar'
import { ProviderHeader } from './ProviderHeader'
import { ProviderBottomNav } from './ProviderBottomNav'
import type { User } from '@supabase/supabase-js'

interface Provider {
  id: string
  name_ar: string
  name_en: string
  logo_url: string | null
  status: string
  category: string
  operation_mode: 'standard' | 'custom' | 'hybrid'
}

// Staff permissions interface
interface StaffPermissions {
  isOwner: boolean
  canManageOrders: boolean
  canManageMenu: boolean
  canManageCustomers: boolean
  canViewAnalytics: boolean
  canManageOffers: boolean
  canManageTeam: boolean
}

const defaultPermissions: StaffPermissions = {
  isOwner: false,
  canManageOrders: false,
  canManageMenu: false,
  canManageCustomers: false,
  canViewAnalytics: false,
  canManageOffers: false,
  canManageTeam: false,
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
  const [pendingCustomOrders, setPendingCustomOrders] = useState(0) // الطلبات المفتوحة المعلقة
  const [pendingRefunds, setPendingRefunds] = useState(0)
  const [pendingComplaints, setPendingComplaints] = useState(0)
  const [onHoldOrders, setOnHoldOrders] = useState(0) // الطلبات المعلقة - on_hold في المحرك المالي
  const [permissions, setPermissions] = useState<StaffPermissions>(defaultPermissions)

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

    // Get pending refunds count (refunds awaiting provider response)
    const { count: refundsCount } = await supabase
      .from('refunds')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .eq('provider_action', 'pending')

    setPendingRefunds(refundsCount || 0)

    // Get pending complaints count (open or in_progress support tickets)
    const { count: complaintsCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .in('status', ['open', 'in_progress'])

    setPendingComplaints(complaintsCount || 0)

    // Get on_hold orders count (orders with settlement_status = 'on_hold')
    // مرتبط بالمحرك المالي - الطلبات المعلقة بسبب نزاعات أو استردادات
    const { count: onHoldCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('settlement_status', 'on_hold')

    setOnHoldOrders(onHoldCount || 0)

    // Get pending custom orders count (طلبات مفتوحة تحتاج تسعير)
    const { count: customOrdersCount } = await supabase
      .from('custom_order_requests')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('status', 'pending')

    setPendingCustomOrders(customOrdersCount || 0)
  }, [])

  const checkAuth = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      // First, check if user is a provider owner
      const { data: providerData } = await supabase
        .from('providers')
        .select('id, name_ar, name_en, logo_url, status, category, operation_mode')
        .eq('owner_id', user.id)
        .limit(1)

      if (providerData && providerData.length > 0) {
        // User is a provider owner - has all permissions
        setProvider(providerData[0])
        setPermissions({
          isOwner: true,
          canManageOrders: true,
          canManageMenu: true,
          canManageCustomers: true,
          canViewAnalytics: true,
          canManageOffers: true,
          canManageTeam: true,
        })
        await loadUnreadCount(providerData[0].id)
      } else {
        // Check if user is a staff member
        const { data: staffData } = await supabase
          .from('provider_staff')
          .select(`
            id,
            is_active,
            can_manage_orders,
            can_manage_menu,
            can_manage_customers,
            can_view_analytics,
            can_manage_offers,
            providers (
              id,
              name_ar,
              name_en,
              logo_url,
              status,
              category,
              operation_mode
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (staffData && staffData.providers) {
          // Type assertion for the joined provider data
          const providerInfo = staffData.providers as unknown as Provider
          setProvider(providerInfo)
          setPermissions({
            isOwner: false,
            canManageOrders: staffData.can_manage_orders ?? false,
            canManageMenu: staffData.can_manage_menu ?? false,
            canManageCustomers: staffData.can_manage_customers ?? false,
            canViewAnalytics: staffData.can_view_analytics ?? false,
            canManageOffers: staffData.can_manage_offers ?? false,
            canManageTeam: false, // Staff cannot manage team
          })
          await loadUnreadCount(providerInfo.id)
        }
      }
    }

    setLoading(false)
  }, [loadUnreadCount])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Listen for auth state changes to re-check authentication
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Re-check authentication when user signs in
        // This ensures provider data is loaded after login navigation
        checkAuth()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProvider(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [checkAuth])

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

    // Also subscribe to orders for pending count and on_hold count (sidebar badge)
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
        async (payload) => {
          const oldOrder = payload.old as { status: string; settlement_status?: string }
          const newOrder = payload.new as { status: string; settlement_status?: string }

          // Track pending orders count
          if (oldOrder.status === 'pending' && newOrder.status !== 'pending') {
            setPendingOrders(prev => Math.max(0, prev - 1))
          }
          if (oldOrder.status !== 'pending' && newOrder.status === 'pending') {
            setPendingOrders(prev => prev + 1)
          }

          // Track on_hold orders count (part of refunds badge)
          if (oldOrder.settlement_status !== newOrder.settlement_status) {
            const { count: onHoldCount } = await supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('provider_id', providerId)
              .eq('settlement_status', 'on_hold')
            setOnHoldOrders(onHoldCount || 0)
          }
        }
      )
      .subscribe()

    // Also subscribe to refunds for pending refunds count (sidebar badge)
    // Use simpler approach: reload count on any refund change
    const refundsChannel = supabase
      .channel(`layout-refunds-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'refunds',
          filter: `provider_id=eq.${providerId}`,
        },
        async () => {
          // Reload pending refunds count
          const { count } = await supabase
            .from('refunds')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .eq('status', 'pending')
            .eq('provider_action', 'pending')
          setPendingRefunds(count || 0)
        }
      )
      .subscribe()

    // Also subscribe to support_tickets for pending complaints count (sidebar badge)
    const complaintsChannel = supabase
      .channel(`layout-complaints-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const newTicket = payload.new as { status: string }
          if (newTicket.status === 'open' || newTicket.status === 'in_progress') {
            setPendingComplaints(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const oldTicket = payload.old as { status: string }
          const newTicket = payload.new as { status: string }
          const wasPending = oldTicket.status === 'open' || oldTicket.status === 'in_progress'
          const isPending = newTicket.status === 'open' || newTicket.status === 'in_progress'

          if (wasPending && !isPending) {
            setPendingComplaints(prev => Math.max(0, prev - 1))
          }
          if (!wasPending && isPending) {
            setPendingComplaints(prev => prev + 1)
          }
        }
      )
      .subscribe()

    // ═══════════════════════════════════════════════════════════════════════════
    // Realtime subscription for custom_order_requests (الطلبات المفتوحة)
    // عداد الإشعارات اللحظي - يظهر في القائمة الجانبية
    // ═══════════════════════════════════════════════════════════════════════════
    const customOrdersChannel = supabase
      .channel(`layout-custom-orders-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'custom_order_requests',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const newRequest = payload.new as { status: string }
          // New pending custom order arrives - increment badge
          if (newRequest.status === 'pending') {
            setPendingCustomOrders(prev => prev + 1)
            // Play DISTINCT notification sound for custom orders
            // صوت مختلف للطلبات الخاصة لتمييزها عن الطلبات العادية
            try {
              const audio = new Audio('/sounds/custom-order.mp3')
              audio.volume = 0.7 // Slightly louder for custom orders
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
          table: 'custom_order_requests',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const oldRequest = payload.old as { status: string }
          const newRequest = payload.new as { status: string }

          // Status changed from pending to something else (priced, expired, cancelled)
          // Decrement badge when merchant sends pricing or order expires
          if (oldRequest.status === 'pending' && newRequest.status !== 'pending') {
            setPendingCustomOrders(prev => Math.max(0, prev - 1))
          }
          // Handle edge case: status changed back to pending
          if (oldRequest.status !== 'pending' && newRequest.status === 'pending') {
            setPendingCustomOrders(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'custom_order_requests',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const deleted = payload.old as { status: string }
          // If a pending request was deleted, decrement badge
          if (deleted.status === 'pending') {
            setPendingCustomOrders(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notificationsChannel)
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(refundsChannel)
      supabase.removeChannel(complaintsChannel)
      supabase.removeChannel(customOrdersChannel)
    }
  }, [provider?.id])

  // Update app badge when notification counts change
  useEffect(() => {
    const totalBadge = unreadCount + pendingOrders + pendingCustomOrders + pendingRefunds + pendingComplaints + onHoldOrders
    if (totalBadge > 0) {
      setAppBadge(totalBadge)
    } else {
      clearAppBadge()
    }
  }, [unreadCount, pendingOrders, pendingCustomOrders, pendingRefunds, pendingComplaints, onHoldOrders])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearAppBadge() // Clear badge on sign out
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
        pendingCustomOrders={pendingCustomOrders}
        unreadNotifications={unreadCount}
        pendingRefunds={pendingRefunds}
        onHoldOrders={onHoldOrders}
        pendingComplaints={pendingComplaints}
        permissions={permissions}
        operationMode={provider?.operation_mode || 'standard'}
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

        {/* Page Content - with bottom padding for mobile nav */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-20 lg:pb-6">
          {children}
        </main>

        {/* Bottom Navigation - Mobile Only */}
        <ProviderBottomNav
          pendingOrders={pendingOrders}
          pendingRefunds={pendingRefunds}
        />
      </div>
    </div>
  )
}
