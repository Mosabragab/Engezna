'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Bell, Package, Tag, Gift, Info, Check, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

interface Notification {
  id: string
  user_id: string
  type: 'order' | 'promotion' | 'system' | 'offer'
  title_ar: string
  title_en: string
  message_ar: string
  message_en: string
  is_read: boolean
  created_at: string
  data?: Record<string, unknown>
}

export default function NotificationsPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadNotifications()
  }, [locale, router])

  async function checkAuthAndLoadNotifications() {
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        console.error('Auth error:', error)
        setIsLoading(false)
        return
      }

      if (!user) {
        router.push(`/${locale}/auth/login?redirect=/notifications`)
        return
      }

      setUser(user)
      await loadNotifications(user.id)
    } catch (err) {
      console.error('Auth check failed:', err)
      setIsLoading(false)
    }
  }

  async function loadNotifications(userId: string) {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading notifications:', error)
        // If table doesn't exist, show empty state
        setNotifications([])
      } else {
        setNotifications(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  async function markAsRead(notificationId: string) {
    if (!user) return

    setMarkingRead(notificationId)
    const supabase = createClient()

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    } finally {
      setMarkingRead(null)
    }
  }

  async function markAllAsRead() {
    if (!user) return

    const supabase = createClient()

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  async function deleteNotification(notificationId: string) {
    if (!user) return

    const supabase = createClient()

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="w-5 h-5 text-primary" />
      case 'promotion':
        return <Tag className="w-5 h-5 text-red-500" />
      case 'offer':
        return <Gift className="w-5 h-5 text-green-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins} min ago`
    } else if (diffHours < 24) {
      return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours} hours ago`
    } else if (diffDays < 7) {
      return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays} days ago`
    } else {
      return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Loading state
  if (isLoading) {
    return (
      <CustomerLayout
        headerTitle={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
        showBackButton={false}
        showBottomNav={true}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    )
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <CustomerLayout
        headerTitle={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
        showBackButton={false}
        showBottomNav={true}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-12 h-12 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
          </h2>
          <p className="text-slate-500 text-center mb-6">
            {locale === 'ar'
              ? 'ستظهر هنا إشعارات الطلبات والعروض'
              : 'Order updates and offers will appear here'}
          </p>
          <Button onClick={() => router.push(`/${locale}/providers`)}>
            {locale === 'ar' ? 'تصفح المتاجر' : 'Browse Stores'}
          </Button>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout
      headerTitle={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
      showBackButton={false}
      showBottomNav={true}
    >
      <div className="px-4 py-4 pb-4">
        {/* Header with mark all as read */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500">
                {locale === 'ar'
                  ? `${unreadCount} إشعار غير مقروء`
                  : `${unreadCount} unread`}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary"
            >
              <Check className="w-4 h-4 me-1" />
              {locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl border p-4 transition-all ${
                notification.is_read
                  ? 'border-slate-100'
                  : 'border-primary/30 bg-primary/5'
              }`}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notification.is_read ? 'bg-slate-100' : 'bg-primary/10'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-slate-900 ${!notification.is_read && 'text-primary'}`}>
                    {locale === 'ar' ? notification.title_ar : notification.title_en}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {locale === 'ar' ? notification.message_ar : notification.message_en}
                  </p>
                  <span className="text-xs text-slate-400 mt-2 block">
                    {formatDate(notification.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-start gap-1">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      disabled={markingRead === notification.id}
                      className="p-2 text-slate-400 hover:text-primary rounded-full hover:bg-slate-100"
                      title={locale === 'ar' ? 'تحديد كمقروء' : 'Mark as read'}
                    >
                      {markingRead === notification.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50"
                    title={locale === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CustomerLayout>
  )
}
