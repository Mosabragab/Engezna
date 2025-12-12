'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useProviderOrderNotifications } from '@/hooks/customer'
import type { User } from '@supabase/supabase-js'
import {
  Package,
  ShoppingBag,
  BarChart3,
  Settings,
  ArrowRight,
  LogOut,
  Menu,
  X,
  Home,
  Clock,
  AlertCircle,
  TrendingUp,
  FileWarning,
  XCircle,
  Hourglass,
  Wallet,
  Tag,
  ChevronLeft,
  ChevronRight,
  Star,
  DollarSign,
  Bell,
  User as UserIcon,
  ChevronDown,
  Receipt,
  MessageCircle,
} from 'lucide-react'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import {
  getCommissionInfo,
  type CommissionInfo,
  COMMISSION_CONFIG
} from '@/lib/commission/utils'
import { Gift } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Provider type
interface Provider {
  id: string
  name_ar: string
  name_en: string
  logo_url: string | null
  status: 'incomplete' | 'pending_approval' | 'approved' | 'rejected' | 'open' | 'closed' | 'temporarily_paused' | 'on_vacation'
  category: string
  rejection_reason?: string | null
  grace_period_start?: string | null
  grace_period_end?: string | null
  commission_status?: 'in_grace_period' | 'active' | 'exempt'
  custom_commission_rate?: number | null
}

// Stats type
interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  pendingOrders: number
  activeProducts: number
  totalOrders: number
  totalCustomers: number
  unrespondedReviews: number
  unreadMessages: number
  // Today's payment breakdown
  todayCodOrders: number
  todayCodRevenue: number
  todayOnlineOrders: number
  todayOnlineRevenue: number
}

export default function ProviderDashboard() {
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === 'ar'
  const [user, setUser] = useState<User | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [pendingOrdersList, setPendingOrdersList] = useState<Array<{id: string, order_number: string, total: number, created_at: string}>>([])
  const [unrespondedReviewsList, setUnrespondedReviewsList] = useState<Array<{id: string, rating: number, comment: string | null, created_at: string}>>([])
  const [unreadMessagesList, setUnreadMessagesList] = useState<Array<{id: string, order_id: string, order_number: string, message: string, created_at: string}>>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    unrespondedReviews: 0,
    unreadMessages: 0,
    todayCodOrders: 0,
    todayCodRevenue: 0,
    todayOnlineOrders: 0,
    todayOnlineRevenue: 0,
  })
  const [commissionInfo, setCommissionInfo] = useState<CommissionInfo | null>(null)

  // Real-time order notifications
  const { newOrderCount, hasNewOrder } = useProviderOrderNotifications(provider?.id || null)

  // Update stats when real-time count changes
  useEffect(() => {
    if (newOrderCount !== stats.pendingOrders && provider) {
      setStats(prev => ({ ...prev, pendingOrders: newOrderCount }))
    }
  }, [newOrderCount, provider, stats.pendingOrders])

  // Realtime subscription for new chat messages
  useEffect(() => {
    if (!provider) return

    const supabase = createClient()

    const channel = supabase
      .channel(`provider-messages-${provider.id}`)
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
          const newMessage = payload.new as { order_id: string; message: string }
          const { data: orderData } = await supabase
            .from('orders')
            .select('provider_id, order_number')
            .eq('id', newMessage.order_id)
            .single()

          if (orderData?.provider_id === provider.id) {
            console.log('New message from customer:', newMessage)
            // Increment unread messages count
            setStats(prev => ({ ...prev, unreadMessages: prev.unreadMessages + 1 }))
            // Play notification sound using shared audio instance
            try {
              // Create shared audio element if it doesn't exist
              const audioId = 'engezna-notification-audio'
              let audio = document.getElementById(audioId) as HTMLAudioElement | null
              if (!audio) {
                audio = document.createElement('audio')
                audio.id = audioId
                audio.src = '/sounds/notification.mp3'
                audio.volume = 0.5
                document.body.appendChild(audio)
              }
              audio.currentTime = 0
              audio.play().catch(() => {})
            } catch {
              // Sound not available
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Provider messages subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [provider])

  useEffect(() => {
    checkAuth()
  }, [])

  // Load notifications when dropdown opens
  useEffect(() => {
    if (notificationsOpen && provider) {
      loadNotifications()
    }
  }, [notificationsOpen, provider])

  async function loadNotifications() {
    if (!provider) return
    setLoadingNotifications(true)
    const supabase = createClient()

    const [ordersResult, reviewsResult, messagesResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, total, created_at')
        .eq('provider_id', provider.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('provider_id', provider.id)
        .is('provider_response', null)
        .order('created_at', { ascending: false })
        .limit(5),
      // Get unread messages from customers
      supabase
        .from('order_messages')
        .select('id, order_id, message, created_at, orders!inner(order_number, provider_id)')
        .eq('sender_type', 'customer')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    setPendingOrdersList(ordersResult.data || [])
    setUnrespondedReviewsList(reviewsResult.data || [])

    // Filter messages for this provider and format
    const providerMessages = (messagesResult.data || [])
      .filter((m: any) => m.orders?.provider_id === provider.id)
      .map((m: any) => ({
        id: m.id,
        order_id: m.order_id,
        order_number: m.orders?.order_number || '',
        message: m.message,
        created_at: m.created_at
      }))
    setUnreadMessagesList(providerMessages)

    setLoadingNotifications(false)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Just now'
    if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`
    if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`
    return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`
  }

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      // Load provider owned by current user
      // Order by created_at to always get the first registered provider
      const { data: providerData } = await supabase
        .from('providers')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (providerData && providerData.length > 0) {
        const providerRecord = providerData[0]
        setProvider(providerRecord)
        // Calculate commission info
        const info = getCommissionInfo(providerRecord)
        setCommissionInfo(info)
        await loadStats(providerRecord.id, supabase)
      }
    }

    setLoading(false)
  }

  async function loadStats(providerId: string, supabase: ReturnType<typeof createClient>) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Run all queries in parallel for faster loading
    const [
      { data: todayOrdersData },
      { data: pendingData },
      { data: productsData },
      { data: allOrdersData },
      { data: unrespondedReviewsData },
      { data: unreadMessagesData }
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, status, payment_status, payment_method')
        .eq('provider_id', providerId)
        .gte('created_at', today.toISOString()),
      supabase
        .from('orders')
        .select('id')
        .eq('provider_id', providerId)
        .eq('status', 'pending'),
      supabase
        .from('menu_items')
        .select('id')
        .eq('provider_id', providerId)
        .eq('is_available', true),
      supabase
        .from('orders')
        .select('id, customer_id')
        .eq('provider_id', providerId),
      supabase
        .from('reviews')
        .select('id')
        .eq('provider_id', providerId)
        .is('provider_response', null),
      // Count unread messages from customers
      supabase
        .from('order_messages')
        .select('id, orders!inner(provider_id)')
        .eq('sender_type', 'customer')
        .eq('is_read', false)
    ])

    const uniqueCustomers = new Set(allOrdersData?.map(o => o.customer_id) || [])
    // Only count confirmed payments for today's revenue
    const confirmedOrders = todayOrdersData?.filter(o => o.status === 'delivered' && o.payment_status === 'completed') || []

    // COD vs Online breakdown for today
    const todayCodOrders = todayOrdersData?.filter(o => o.payment_method === 'cash') || []
    const todayOnlineOrders = todayOrdersData?.filter(o => o.payment_method !== 'cash') || []
    const todayCodConfirmed = todayCodOrders.filter(o => o.status === 'delivered' && o.payment_status === 'completed')
    const todayOnlineConfirmed = todayOnlineOrders.filter(o => o.status === 'delivered' && o.payment_status === 'completed')

    // Filter unread messages for this provider
    const providerUnreadMessages = (unreadMessagesData || []).filter((m: any) => m.orders?.provider_id === providerId)

    setStats({
      todayOrders: todayOrdersData?.length || 0,
      todayRevenue: confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      pendingOrders: pendingData?.length || 0,
      activeProducts: productsData?.length || 0,
      totalOrders: allOrdersData?.length || 0,
      totalCustomers: uniqueCustomers.size,
      unrespondedReviews: unrespondedReviewsData?.length || 0,
      unreadMessages: providerUnreadMessages.length,
      todayCodOrders: todayCodOrders.length,
      todayCodRevenue: todayCodConfirmed.reduce((sum, o) => sum + (o.total || 0), 0),
      todayOnlineOrders: todayOnlineOrders.length,
      todayOnlineRevenue: todayOnlineConfirmed.reduce((sum, o) => sum + (o.total || 0), 0),
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  const navItems = [
    {
      icon: Home,
      label: locale === 'ar' ? 'الرئيسية' : 'Dashboard',
      path: `/${locale}/provider`,
      active: pathname === `/${locale}/provider`
    },
    {
      icon: ShoppingBag,
      label: locale === 'ar' ? 'الطلبات' : 'Orders',
      path: `/${locale}/provider/orders`,
      badge: stats.pendingOrders > 0 ? stats.pendingOrders.toString() : undefined
    },
    {
      icon: Package,
      label: locale === 'ar' ? 'المنتجات' : 'Products',
      path: `/${locale}/provider/products`
    },
    {
      icon: BarChart3,
      label: locale === 'ar' ? 'التقارير' : 'Reports',
      path: `/${locale}/provider/reports`
    },
    {
      icon: Star,
      label: locale === 'ar' ? 'التقييمات' : 'Reviews',
      path: `/${locale}/provider/reviews`
    },
    {
      icon: Tag,
      label: locale === 'ar' ? 'العروض' : 'Promotions',
      path: `/${locale}/provider/promotions`
    },
    {
      icon: Wallet,
      label: locale === 'ar' ? 'المالية' : 'Finance',
      path: `/${locale}/provider/finance`
    },
    {
      icon: Receipt,
      label: locale === 'ar' ? 'التسويات' : 'Settlements',
      path: `/${locale}/provider/settlements`
    },
    {
      icon: Clock,
      label: locale === 'ar' ? 'ساعات العمل' : 'Store Hours',
      path: `/${locale}/provider/store-hours`
    },
    {
      icon: Settings,
      label: locale === 'ar' ? 'الإعدادات' : 'Settings',
      path: `/${locale}/provider/settings`
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
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
            {locale === 'ar' ? 'يجب تسجيل الدخول للوصول إلى لوحة التحكم' : 'Please login to access your dashboard'}
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
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Light Theme with Engezna Blue accent */}
      <aside className={`
        fixed lg:static inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50
        w-64 bg-white border-${isRTL ? 'l' : 'r'} border-slate-200 shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/provider`} className="flex flex-col">
              <EngeznaLogo size="md" static showPen={false} />
              <p className="text-xs text-slate-500 mt-1">{locale === 'ar' ? 'لوحة الشريك' : 'Partner Portal'}</p>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Store Info */}
        {provider && (
          <div className="p-4 border-b border-slate-200">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-sm font-medium text-slate-900 truncate">
                {locale === 'ar' ? provider.name_ar : provider.name_en}
              </p>
              <p className="text-xs text-slate-500 capitalize">{provider.category.replace('_', ' ')}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${
                  provider.status === 'open' ? 'bg-green-500' :
                  provider.status === 'closed' ? 'bg-red-500' : 'bg-amber-500'
                }`}></span>
                <span className="text-xs text-slate-600">
                  {provider.status === 'open' ? (locale === 'ar' ? 'مفتوح' : 'Open') :
                   provider.status === 'closed' ? (locale === 'ar' ? 'مغلق' : 'Closed') :
                   (locale === 'ar' ? 'متوقف مؤقتاً' : 'Paused')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.active || pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-xs px-2 py-0.5 rounded-full`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header - Engezna Brand Identity */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Right Side (RTL): Logo & Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-500 hover:text-slate-700"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Logo - visible on mobile, hidden on desktop (sidebar has it) */}
              <Link href={`/${locale}/provider`} className="lg:hidden">
                <EngeznaLogo size="sm" static showPen={false} />
              </Link>

            </div>

            {/* Center: Page Title on Desktop - Single clear title */}
            <div className="hidden md:flex items-center justify-center flex-1">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  {locale === 'ar' ? 'لوحة تحكم المتجر' : 'Store Dashboard'}
                </h2>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'نظرة عامة على متجرك' : 'Overview of your store'}
                </p>
              </div>
            </div>

            {/* Left Side (RTL): Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setNotificationsOpen(true)}
                onMouseLeave={() => setNotificationsOpen(false)}
              >
                <button
                  className="relative p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {(stats.pendingOrders + stats.unrespondedReviews + stats.unreadMessages) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {(stats.pendingOrders + stats.unrespondedReviews + stats.unreadMessages) > 9 ? '9+' : (stats.pendingOrders + stats.unrespondedReviews + stats.unreadMessages)}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {notificationsOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-80 sm:w-96 z-50`}>
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-900">
                          {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
                        </h3>
                      </div>

                      {/* Content */}
                      <div className="max-h-96 overflow-y-auto">
                        {loadingNotifications ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                          </div>
                        ) : pendingOrdersList.length === 0 && unrespondedReviewsList.length === 0 && unreadMessagesList.length === 0 ? (
                          <div className="text-center py-8">
                            <Bell className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-500">
                              {locale === 'ar' ? 'لا توجد إشعارات جديدة' : 'No new notifications'}
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Pending Orders */}
                            {pendingOrdersList.length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100">
                                  <p className="text-xs font-medium text-yellow-700 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {locale === 'ar' ? 'طلبات بانتظار القبول' : 'Orders Pending Acceptance'}
                                  </p>
                                </div>
                                {pendingOrdersList.map((order) => (
                                  <Link
                                    key={order.id}
                                    href={`/${locale}/provider/orders/${order.id}`}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors"
                                  >
                                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <ShoppingBag className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900">
                                        {locale === 'ar' ? 'طلب جديد' : 'New Order'} #{order.order_number || order.id.slice(0, 8)}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {order.total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'} • {formatTimeAgo(order.created_at)}
                                      </p>
                                    </div>
                                    <ChevronLeft className={`w-4 h-4 text-slate-400 ${isRTL ? '' : 'rotate-180'}`} />
                                  </Link>
                                ))}
                              </div>
                            )}

                            {/* Unresponded Reviews */}
                            {unrespondedReviewsList.length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-primary/5 border-b border-primary/10">
                                  <p className="text-xs font-medium text-primary flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    {locale === 'ar' ? 'تقييمات بانتظار الرد' : 'Reviews Awaiting Response'}
                                  </p>
                                </div>
                                {unrespondedReviewsList.map((review) => (
                                  <Link
                                    key={review.id}
                                    href={`/${locale}/provider/reviews`}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors"
                                  >
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                      <Star className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={`w-3 h-3 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`}
                                          />
                                        ))}
                                      </div>
                                      <p className="text-xs text-slate-500 truncate">
                                        {review.comment || (locale === 'ar' ? 'بدون تعليق' : 'No comment')}
                                      </p>
                                    </div>
                                    <ChevronLeft className={`w-4 h-4 text-slate-400 ${isRTL ? '' : 'rotate-180'}`} />
                                  </Link>
                                ))}
                              </div>
                            )}

                            {/* Unread Messages */}
                            {unreadMessagesList.length > 0 && (
                              <div>
                                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                                  <p className="text-xs font-medium text-blue-700 flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    {locale === 'ar' ? 'رسائل جديدة من العملاء' : 'New Messages from Customers'}
                                  </p>
                                </div>
                                {unreadMessagesList.map((msg) => (
                                  <Link
                                    key={msg.id}
                                    href={`/${locale}/provider/orders/${msg.order_id}`}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors"
                                  >
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <MessageCircle className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900">
                                        {locale === 'ar' ? 'رسالة جديدة' : 'New Message'} #{msg.order_number || msg.order_id.slice(0, 8)}
                                      </p>
                                      <p className="text-xs text-slate-500 truncate">
                                        {msg.message.length > 50 ? msg.message.slice(0, 50) + '...' : msg.message}
                                      </p>
                                    </div>
                                    <ChevronLeft className={`w-4 h-4 text-slate-400 ${isRTL ? '' : 'rotate-180'}`} />
                                  </Link>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                        <Link
                          href={`/${locale}/provider/orders`}
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          {locale === 'ar' ? 'عرض كل الطلبات' : 'View All Orders'}
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setAccountMenuOpen(true)}
                onMouseLeave={() => setAccountMenuOpen(false)}
              >
                <button
                  className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-sm text-primary">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-slate-700">
                    {locale === 'ar' ? 'حسابي' : 'My Account'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {accountMenuOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                      {/* User Info */}
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
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
                            handleSignOut()
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

        {/* Dashboard Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Status Messages */}
          {provider?.status === 'incomplete' && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileWarning className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-amber-800">
                    {locale === 'ar' ? 'أكمل ملفك الشخصي' : 'Complete Your Profile'}
                  </h3>
                  <p className="text-slate-700 mb-4 text-sm">
                    {locale === 'ar'
                      ? 'معلومات متجرك غير مكتملة. أكمل المعلومات التالية للحصول على الموافقة والبدء في استقبال الطلبات:'
                      : 'Your store information is incomplete. Complete the following to get approved and start receiving orders:'}
                  </p>
                  <Link href={`/${locale}/provider/complete-profile`}>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                      {locale === 'ar' ? 'إكمال الملف' : 'Complete Profile'}
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {provider?.status === 'pending_approval' && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <Hourglass className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-primary">
                    {locale === 'ar' ? 'قيد المراجعة' : 'Under Review'}
                  </h3>
                  <p className="text-slate-700 text-sm">
                    {locale === 'ar'
                      ? 'تم إرسال طلبك وهو قيد المراجعة من فريقنا. سنقوم بإخطارك عند الموافقة على متجرك.'
                      : 'Your application has been submitted and is being reviewed by our team. We will notify you once your store is approved.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {provider?.status === 'rejected' && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border border-red-200 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-red-700">
                    {locale === 'ar' ? 'تم رفض الطلب' : 'Application Rejected'}
                  </h3>
                  <p className="text-slate-700 mb-2 text-sm">
                    {locale === 'ar' ? 'سبب الرفض:' : 'Reason:'} {provider.rejection_reason || (locale === 'ar' ? 'لم يتم تحديد سبب' : 'No reason provided')}
                  </p>
                  <Link href={`/${locale}/provider/complete-profile`}>
                    <Button className="bg-red-500 hover:bg-red-600 text-white">
                      {locale === 'ar' ? 'تعديل وإعادة الإرسال' : 'Edit & Resubmit'}
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* No Provider - Show registration prompt */}
          {!provider && user && (
            <div className="bg-gradient-to-br from-primary/5 to-cyan-50 rounded-2xl p-6 border border-primary/20 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-primary">
                    {locale === 'ar' ? 'لم يتم إكمال التسجيل' : 'Registration Incomplete'}
                  </h3>
                  <p className="text-slate-700 mb-4 text-sm">
                    {locale === 'ar'
                      ? 'يبدو أنك لم تكمل تسجيلك كشريك. هل تريد التسجيل الآن؟'
                      : 'It seems you haven\'t completed your partner registration. Would you like to register now?'}
                  </p>
                  <Link href={`/${locale}/partner/register`}>
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                      {locale === 'ar' ? 'سجل كشريك' : 'Register as Partner'}
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Stats - Only for approved/open providers */}
          {(provider?.status === 'approved' || provider?.status === 'open' || provider?.status === 'closed' || provider?.status === 'temporarily_paused') && (
            <>
              {/* Stats Grid - Using brand color system */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Today's Orders - Primary Blue Card */}
                <div className="bg-[hsl(var(--card-bg-primary))] rounded-xl p-4 border border-primary/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-primary" strokeWidth={1.8} />
                    </div>
                    <span className="text-success text-xs flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +0%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{stats.todayOrders}</p>
                  <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'طلبات اليوم' : "Today's Orders"}</p>
                </div>

                {/* Today's Revenue - Success Green Card */}
                <div className="bg-[hsl(var(--card-bg-success))] rounded-xl p-4 border border-success/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-success/15 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-success" strokeWidth={1.8} />
                    </div>
                    <span className="text-success text-xs flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +0%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{stats.todayRevenue} <span className="text-sm text-[hsl(var(--text-muted))]">EGP</span></p>
                  <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'إيرادات اليوم' : "Today's Revenue"}</p>
                </div>

                {/* Pending Orders - Warning Yellow Card */}
                <div className="bg-[hsl(var(--card-bg-warning))] rounded-xl p-4 border border-warning/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-warning/15 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-[hsl(42_100%_40%)]" strokeWidth={1.8} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{stats.pendingOrders}</p>
                  <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'طلبات قيد الانتظار' : 'Pending Orders'}</p>
                </div>

                {/* Active Products - Info Cyan Card */}
                <div className="bg-[hsl(var(--card-bg-info))] rounded-xl p-4 border border-info/20 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-info/15 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" strokeWidth={1.8} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-primary))]">{stats.activeProducts}</p>
                  <p className="text-xs text-[hsl(var(--text-secondary))]">{locale === 'ar' ? 'المنتجات النشطة' : 'Active Products'}</p>
                </div>
              </div>

              {/* Grace Period / Commission Status Card */}
              {commissionInfo && (
                <div className={`rounded-xl p-4 border shadow-sm mb-6 ${
                  commissionInfo.isInGracePeriod
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
                    : 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      commissionInfo.isInGracePeriod ? 'bg-emerald-500' : 'bg-slate-500'
                    }`}>
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-grow">
                      <h3 className={`text-lg font-bold mb-1 ${
                        commissionInfo.isInGracePeriod ? 'text-emerald-700' : 'text-slate-700'
                      }`}>
                        {commissionInfo.isInGracePeriod
                          ? (locale === 'ar' ? '🎉 فترة السماح المجانية' : '🎉 Free Grace Period')
                          : (locale === 'ar' ? 'نسبة العمولة' : 'Commission Rate')
                        }
                      </h3>
                      {commissionInfo.isInGracePeriod ? (
                        <div>
                          <p className="text-emerald-600 text-sm mb-2">
                            {locale === 'ar'
                              ? `متبقي ${commissionInfo.daysRemaining} يوم من فترة السماح المجانية (6 أشهر)`
                              : `${commissionInfo.daysRemaining} days remaining in your free grace period (6 months)`
                            }
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              {locale === 'ar' ? 'العمولة الحالية:' : 'Current rate:'} <strong className="text-emerald-600">0%</strong>
                            </span>
                            {commissionInfo.gracePeriodEndDate && (
                              <span>
                                {locale === 'ar' ? 'تنتهي:' : 'Ends:'} {commissionInfo.gracePeriodEndDate.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            {locale === 'ar'
                              ? `بعد انتهاء فترة السماح، ستكون العمولة ${COMMISSION_CONFIG.MAX_RATE}% كحد أقصى`
                              : `After grace period ends, commission will be up to ${COMMISSION_CONFIG.MAX_RATE}%`
                            }
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-2xl font-bold text-slate-900">
                            {locale === 'ar' ? `حتى ${commissionInfo.rate}%` : `Up to ${commissionInfo.rate}%`}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {locale === 'ar'
                              ? 'على قيمة الطلبات (بدون رسوم توصيل)'
                              : 'On order value (excluding delivery)'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Today's Payment Breakdown */}
              {stats.todayOrders > 0 && (
                <div className="bg-white rounded-xl p-4 border border-[hsl(var(--border))] shadow-sm mb-6">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))] mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    {locale === 'ar' ? 'طلبات اليوم حسب طريقة الدفع' : "Today's Orders by Payment Method"}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* COD */}
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-xs font-medium text-amber-700">
                          {locale === 'ar' ? 'كاش' : 'COD'}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{stats.todayCodOrders} {locale === 'ar' ? 'طلب' : 'orders'}</p>
                      <p className="text-xs text-slate-500">{stats.todayCodRevenue} EGP {locale === 'ar' ? 'مؤكد' : 'confirmed'}</p>
                    </div>
                    {/* Online */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-blue-700">
                          {locale === 'ar' ? 'إلكتروني' : 'Online'}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{stats.todayOnlineOrders} {locale === 'ar' ? 'طلب' : 'orders'}</p>
                      <p className="text-xs text-slate-500">{stats.todayOnlineRevenue} EGP {locale === 'ar' ? 'مؤكد' : 'confirmed'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Indicators - Using text hierarchy */}
              <div className="bg-white rounded-xl p-6 border border-[hsl(var(--border))] shadow-sm mb-6">
                <h3 className="text-lg font-bold text-[hsl(var(--text-primary))] mb-4">{locale === 'ar' ? 'مؤشرات الأداء' : 'Performance Indicators'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-[hsl(var(--text-secondary))] mb-1">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                    <p className="text-3xl font-bold text-[hsl(var(--text-primary))]">{stats.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--text-secondary))] mb-1">{locale === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}</p>
                    <p className="text-3xl font-bold text-[hsl(var(--text-primary))]">{stats.totalCustomers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--text-secondary))] mb-1">{locale === 'ar' ? 'المنتجات النشطة' : 'Active Products'}</p>
                    <p className="text-3xl font-bold text-[hsl(var(--text-primary))]">{stats.activeProducts}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions - Using unified icon styling */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href={`/${locale}/provider/orders`} className="bg-white rounded-xl p-4 border border-[hsl(var(--border))] shadow-sm hover:border-primary hover:shadow-md transition-all group">
                  <ShoppingBag className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                  <p className="font-medium text-[hsl(var(--text-primary))]">{locale === 'ar' ? 'الطلبات' : 'Orders'}</p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{locale === 'ar' ? 'إدارة الطلبات' : 'Manage orders'}</p>
                </Link>

                <Link href={`/${locale}/provider/products`} className="bg-white rounded-xl p-4 border border-[hsl(var(--border))] shadow-sm hover:border-primary hover:shadow-md transition-all group">
                  <Package className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                  <p className="font-medium text-[hsl(var(--text-primary))]">{locale === 'ar' ? 'المنتجات' : 'Products'}</p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{locale === 'ar' ? 'إدارة القائمة' : 'Manage menu'}</p>
                </Link>

                <Link href={`/${locale}/provider/reports`} className="bg-white rounded-xl p-4 border border-[hsl(var(--border))] shadow-sm hover:border-primary hover:shadow-md transition-all group">
                  <BarChart3 className="w-8 h-8 text-success mb-3 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                  <p className="font-medium text-[hsl(var(--text-primary))]">{locale === 'ar' ? 'التقارير' : 'Reports'}</p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{locale === 'ar' ? 'عرض الإحصائيات' : 'View analytics'}</p>
                </Link>

                <Link href={`/${locale}/provider/settings`} className="bg-white rounded-xl p-4 border border-[hsl(var(--border))] shadow-sm hover:border-primary hover:shadow-md transition-all group">
                  <Settings className="w-8 h-8 text-[hsl(var(--text-secondary))] mb-3 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                  <p className="font-medium text-[hsl(var(--text-primary))]">{locale === 'ar' ? 'الإعدادات' : 'Settings'}</p>
                  <p className="text-xs text-[hsl(var(--text-muted))]">{locale === 'ar' ? 'إعدادات المتجر' : 'Store settings'}</p>
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
