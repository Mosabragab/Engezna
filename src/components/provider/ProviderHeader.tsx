'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Menu,
  Bell,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  ShoppingBag,
  Star,
  Clock,
  X,
} from 'lucide-react'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import type { User } from '@supabase/supabase-js'

interface ProviderHeaderProps {
  user: User | null
  onMenuClick: () => void
  onSignOut: () => void
  pendingOrders?: number
  totalNotifications?: number
  providerId?: string
  pageTitle?: { ar: string; en: string }
  pageSubtitle?: { ar: string; en: string }
}

type PendingOrder = {
  id: string
  order_number: string
  total: number
  created_at: string
  status: string
}

type UnrespondedReview = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}

export function ProviderHeader({
  user,
  onMenuClick,
  onSignOut,
  pendingOrders = 0,
  totalNotifications,
  providerId,
  pageTitle,
  pageSubtitle,
}: ProviderHeaderProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [pendingOrdersList, setPendingOrdersList] = useState<PendingOrder[]>([])
  const [unrespondedReviews, setUnrespondedReviews] = useState<UnrespondedReview[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  // Load notifications when dropdown opens
  useEffect(() => {
    if (notificationsOpen && providerId) {
      loadNotifications()
    }
  }, [notificationsOpen, providerId])

  async function loadNotifications() {
    if (!providerId) return
    setLoadingNotifications(true)
    const supabase = createClient()

    // Load pending orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, order_number, total, created_at, status')
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)

    if (ordersData) {
      setPendingOrdersList(ordersData)
    }

    // Load unresponded reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        profiles:customer_id (full_name)
      `)
      .eq('provider_id', providerId)
      .is('provider_response', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (reviewsData) {
      setUnrespondedReviews(reviewsData as UnrespondedReview[])
    }

    setLoadingNotifications(false)
  }

  const totalNotifications = pendingOrders + unrespondedReviews.length

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

  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Right Side (RTL): Menu & Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-slate-500 hover:text-slate-700"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo - visible on mobile, hidden on desktop */}
          <Link href={`/${locale}/provider`} className="lg:hidden">
            <EngeznaLogo size="sm" static showPen={false} />
          </Link>
        </div>

        {/* Center: Page Title on Desktop */}
        {pageTitle && (
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-800">
                {locale === 'ar' ? pageTitle.ar : pageTitle.en}
              </h2>
              {pageSubtitle && (
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? pageSubtitle.ar : pageSubtitle.en}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Left Side (RTL): Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {(totalNotifications ?? pendingOrders) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {(totalNotifications ?? pendingOrders) > 9 ? '9+' : (totalNotifications ?? pendingOrders)}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {notificationsOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />

                {/* Dropdown */}
                <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden`}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">
                      {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
                    </h3>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="max-h-96 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                      </div>
                    ) : pendingOrdersList.length === 0 && unrespondedReviews.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد إشعارات جديدة' : 'No new notifications'}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Pending Orders Section */}
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
                                onClick={() => setNotificationsOpen(false)}
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

                        {/* Unresponded Reviews Section */}
                        {unrespondedReviews.length > 0 && (
                          <div>
                            <div className="px-4 py-2 bg-primary/5 border-b border-primary/10">
                              <p className="text-xs font-medium text-primary flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {locale === 'ar' ? 'تقييمات بانتظار الرد' : 'Reviews Awaiting Response'}
                              </p>
                            </div>
                            {unrespondedReviews.map((review) => (
                              <Link
                                key={review.id}
                                href={`/${locale}/provider/reviews`}
                                onClick={() => setNotificationsOpen(false)}
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
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <Link
                      href={`/${locale}/provider/orders`}
                      onClick={() => setNotificationsOpen(false)}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      {locale === 'ar' ? 'عرض كل الطلبات' : 'View All Orders'}
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Account Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setAccountMenuOpen(true)}
            onMouseLeave={() => setAccountMenuOpen(false)}
          >
            <button className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="font-semibold text-sm text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-700">
                {locale === 'ar' ? 'حسابي' : 'My Account'}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {accountMenuOpen && (
              <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                  {/* User Info */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.email?.split('@')[0]}
                    </p>
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
                        onSignOut()
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
  )
}
