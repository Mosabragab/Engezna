'use client'

import { useLocale } from 'next-intl'
import { useState, useCallback, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Menu,
  Bell,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Globe,
  Settings,
  MessageSquare,
  CheckCheck,
  X,
  ShoppingBag,
  Wallet,
  Store,
  Star,
  AlertCircle,
} from 'lucide-react'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'

interface Notification {
  id: string
  admin_id: string
  type: string
  title: string
  body: string | null
  related_message_id: string | null
  related_provider_id: string | null
  related_order_id: string | null
  governorate_id: string | null
  is_read: boolean
  created_at: string
}

interface AdminUserData {
  id: string
  role: string
  assigned_regions: Array<{ governorate_id?: string; city_id?: string }>
}

interface AdminHeaderProps {
  user: User
  title: string
  subtitle?: string
  onMenuClick: () => void
  notificationCount?: number
}

export function AdminHeader({
  user,
  title,
  subtitle,
  onMenuClick,
  notificationCount = 0,
}: AdminHeaderProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const isRTL = locale === 'ar'
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [adminUserData, setAdminUserData] = useState<AdminUserData | null>(null)
  const [regionProviderIds, setRegionProviderIds] = useState<string[]>([])

  const loadNotifications = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return

    // Get admin_id and role from admin_users
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, role, assigned_regions')
      .eq('user_id', authUser.id)
      .single()

    if (!adminUser) return

    setAdminUserData(adminUser as AdminUserData)

    // Determine region filter (only for non-super_admin with assigned regions)
    const isSuperAdmin = adminUser.role === 'super_admin'
    const assignedGovernorateIds = !isSuperAdmin && adminUser.assigned_regions
      ? (adminUser.assigned_regions || [])
          .map((r: { governorate_id?: string }) => r.governorate_id)
          .filter(Boolean) as string[]
      : []
    const hasRegionFilter = assignedGovernorateIds.length > 0

    // Build notification query
    let notifQuery = supabase
      .from('admin_notifications')
      .select('*')
      .eq('admin_id', adminUser.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // For regional admins, also fetch notifications that match their region
    // New notifications will have governorate_id set; for backwards compatibility
    // with old notifications, we also do client-side filtering

    const { data: notifs, error } = await notifQuery

    if (error) {
      console.error('Error loading notifications:', error)
      return
    }

    // Filter notifications for regional admins
    let filteredNotifs = notifs || []

    if (hasRegionFilter) {
      // Get provider IDs for the region (for filtering old notifications without governorate_id)
      const { data: regionProviders } = await supabase
        .from('providers')
        .select('id')
        .in('governorate_id', assignedGovernorateIds)

      const providerIdsInRegion = (regionProviders || []).map(p => p.id)
      setRegionProviderIds(providerIdsInRegion)

      filteredNotifs = filteredNotifs.filter(notif => {
        // WHITELIST APPROACH: Only allow specific generic notification types
        // Everything else is assumed to be region-specific

        // Generic notifications that should be shown to all admins
        const genericTypes = ['message', 'announcement', 'system', 'task', 'approval', 'reminder', 'welcome', 'info']

        if (genericTypes.includes(notif.type)) {
          return true
        }

        // If notification has governorate_id, use it for filtering
        if (notif.governorate_id) {
          return assignedGovernorateIds.includes(notif.governorate_id)
        }

        // If notification has related_provider_id, check if provider is in region
        if (notif.related_provider_id) {
          if (providerIdsInRegion.length > 0) {
            return providerIdsInRegion.includes(notif.related_provider_id)
          }
          // Has provider_id but we have no providers in region - don't show
          return false
        }

        // For any other notification type without region info, don't show to regional admins
        // This catches: order, new_order, order_status, late_order, delayed_order,
        // refund, escalation, provider, new_provider, settlement, payment, review, etc.
        return false
      })
    }

    setNotifications(filteredNotifs)
    setUnreadCount(filteredNotifs.filter(n => !n.is_read).length)
  }, [])

  // Load notifications on mount
  useEffect(() => {
    loadNotifications()
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  async function markAsRead(notificationId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  async function markAllAsRead() {
    const supabase = createClient()
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)

    if (unreadIds.length === 0) return

    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds)

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  function getTimeSince(date: string): string {
    const now = new Date()
    const created = new Date(date)
    const diff = now.getTime() - created.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return locale === 'ar' ? `منذ ${days} يوم` : `${days}d ago`
    if (hours > 0) return locale === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`
    return locale === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'message':
        return { icon: MessageSquare, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' }
      case 'order':
      case 'new_order':
      case 'order_status':
        return { icon: ShoppingBag, bgColor: 'bg-amber-100', iconColor: 'text-amber-600' }
      case 'settlement':
      case 'payment':
        return { icon: Wallet, bgColor: 'bg-green-100', iconColor: 'text-green-600' }
      case 'provider':
      case 'new_provider':
        return { icon: Store, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' }
      case 'review':
        return { icon: Star, bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' }
      case 'refund':
      case 'new_refund_request':
      case 'refund_escalated':
      case 'escalation':
        return { icon: AlertCircle, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' }
      default:
        return { icon: AlertCircle, bgColor: 'bg-slate-100', iconColor: 'text-slate-600' }
    }
  }

  function handleNotificationClick(notification: Notification) {
    markAsRead(notification.id)

    // Navigate based on notification type
    if (notification.type === 'message' && notification.related_message_id) {
      router.push(`/${locale}/admin/messages`)
    } else if (notification.type === 'order' || notification.type === 'new_order' || notification.type === 'order_status') {
      router.push(`/${locale}/admin/orders`)
    } else if (notification.type === 'settlement' || notification.type === 'payment') {
      router.push(`/${locale}/admin/settlements`)
    } else if (notification.type === 'provider' || notification.type === 'new_provider') {
      router.push(`/${locale}/admin/providers`)
    } else if (notification.type === 'review') {
      router.push(`/${locale}/admin/approvals`)
    } else if (notification.type === 'refund' || notification.type === 'new_refund_request' || notification.type === 'refund_escalated' || notification.type === 'escalation') {
      router.push(`/${locale}/admin/refunds`)
    }
    // For other types, just close the dropdown without navigation
    setNotificationsOpen(false)
  }

  const switchLanguage = useCallback(() => {
    const newLocale = locale === 'ar' ? 'en' : 'ar'
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)

    // Add no-transition class to prevent flash
    document.documentElement.classList.add('no-transition')

    // Update HTML attributes before navigation
    document.documentElement.lang = newLocale
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr'

    // Use startTransition for smoother navigation
    startTransition(() => {
      router.push(newPathname)
    })

    // Remove no-transition class after a brief delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-transition')
      })
    })
  }, [locale, pathname, router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side - Menu button and mobile logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link href={`/${locale}/admin`} className="lg:hidden">
            <EngeznaLogo size="sm" static showPen={false} />
          </Link>
        </div>

        {/* Center - Page Title */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={switchLanguage}
            disabled={isPending}
            className="flex items-center gap-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100"
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">
              {isPending ? '...' : locale === 'ar' ? 'EN' : 'عربي'}
            </span>
          </Button>

          {/* Notifications */}
          <div
            className="relative"
            onMouseEnter={() => setNotificationsOpen(true)}
            onMouseLeave={() => setNotificationsOpen(false)}
          >
            <button
              className="relative p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {(unreadCount > 0 || notificationCount > 0) && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {(unreadCount || notificationCount) > 9 ? '9+' : (unreadCount || notificationCount)}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-80 z-50`}>
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">
                      {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" />
                        {locale === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => {
                        const { icon: NotifIcon, bgColor, iconColor } = getNotificationIcon(notification.type)
                        return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-start px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                              <NotifIcon className={`w-4 h-4 ${iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notification.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                {notification.title}
                              </p>
                              {notification.body && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {notification.body}
                                </p>
                              )}
                              <p className="text-xs text-slate-400 mt-1">
                                {getTimeSince(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                            )}
                          </div>
                        </button>
                      )})
                    ) : (
                      <div className="py-8 text-center">
                        <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm text-slate-500">
                          {locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-100 flex justify-between items-center">
                      <button
                        onClick={() => {
                          setNotificationsOpen(false)
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        {locale === 'ar' ? 'إغلاق' : 'Close'}
                      </button>
                      <Link
                        href={`/${locale}/admin/orders`}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        {locale === 'ar' ? 'عرض الطلبات' : 'View Orders'}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div
            className="relative"
            onMouseEnter={() => setAccountMenuOpen(true)}
            onMouseLeave={() => setAccountMenuOpen(false)}
          >
            <button className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="font-semibold text-sm text-red-600">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-700">
                {locale === 'ar' ? 'المسؤول' : 'Admin'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {accountMenuOpen && (
              <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                  {/* User info */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      href={`/${locale}/admin/settings`}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {locale === 'ar' ? 'الإعدادات' : 'Settings'}
                    </Link>
                    <Link
                      href={`/${locale}`}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      {locale === 'ar' ? 'العودة للموقع' : 'Back to Site'}
                    </Link>
                  </div>

                  {/* Sign out */}
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={handleSignOut}
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
