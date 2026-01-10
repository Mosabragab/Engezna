'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Bell, Package, Tag, Gift, Info, Check, Trash2, Loader2, CreditCard, MessageCircle, RefreshCw, DollarSign, FileText } from 'lucide-react'
import Link from 'next/link'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/customer'
import { createClient } from '@/lib/supabase/client'

export default function NotificationsPage() {
  const locale = useLocale()
  const router = useRouter()
  const [markingRead, setMarkingRead] = useState<string | null>(null)
  const [confirmingRefund, setConfirmingRefund] = useState<string | null>(null)

  // Use real-time notifications hook
  const {
    notifications,
    unreadCount,
    isLoading,
    isAuthenticated,
    markAsRead: markAsReadHook,
    markAllAsRead: markAllAsReadHook,
    deleteNotification: deleteNotificationHook,
  } = useNotifications()

  // Handle refund confirmation
  const handleConfirmRefund = async (orderId: string, notificationId: string) => {
    setConfirmingRefund(notificationId)
    const supabase = createClient()

    try {
      // Get refund ID from order
      // Note: customer_confirmed can be false or NULL, so we need to check both
      const { data: refund } = await supabase
        .from('refunds')
        .select('id')
        .eq('order_id', orderId)
        .eq('provider_action', 'cash_refund')
        .or('customer_confirmed.eq.false,customer_confirmed.is.null')
        .single()

      if (refund) {
        // Call the confirm RPC
        const { error } = await supabase.rpc('customer_confirm_refund', {
          p_refund_id: refund.id,
          p_received: true,
          p_notes: null
        })

        if (!error) {
          // Mark notification as read and delete it
          await markAsReadHook(notificationId)
          await deleteNotificationHook(notificationId)
          // Show success (optional: could add toast)
        }
      }
    } catch (err) {
      console.error('Error confirming refund:', err)
    } finally {
      setConfirmingRefund(null)
    }
  }

  // Wrapper functions to handle loading state
  const handleMarkAsRead = async (id: string) => {
    setMarkingRead(id)
    await markAsReadHook(id)
    setMarkingRead(null)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsReadHook()
  }

  const handleDeleteNotification = async (id: string) => {
    await deleteNotificationHook(id)
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${locale}/auth/login?redirect=/notifications`)
    }
  }, [isLoading, isAuthenticated, locale, router])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      // Standard order notifications
      case 'order':
      case 'order_update':
      case 'order_accepted':
      case 'order_preparing':
      case 'order_ready':
      case 'order_out_for_delivery':
      case 'order_delivered':
        return <Package className="w-5 h-5 text-primary" />
      case 'order_cancelled':
      case 'order_rejected':
        return <Package className="w-5 h-5 text-red-500" />
      case 'order_message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'refund_cash_confirmed':
      case 'refund_update':
        return <RefreshCw className="w-5 h-5 text-green-500" />
      case 'payment_confirmed':
        return <CreditCard className="w-5 h-5 text-green-500" />
      case 'promotion':
      case 'promo':
        return <Tag className="w-5 h-5 text-red-500" />
      case 'offer':
        return <Gift className="w-5 h-5 text-green-500" />

      // Custom order notifications (lowercase from DB triggers)
      case 'custom_order_priced':
        return <DollarSign className="w-5 h-5 text-emerald-600" />

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
              onClick={handleMarkAllAsRead}
              className="text-primary"
            >
              <Check className="w-4 h-4 me-1" />
              {locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification) => {
            // Check if notification is order-related for navigation (includes order_message)
            const isOrderNotification = (notification.type.startsWith('order_') || notification.type === 'order_message') && notification.related_order_id

            // Check if it's a custom order notification (lowercase from DB trigger)
            const isCustomOrderNotification = notification.type === 'custom_order_priced'
            // Get broadcast_id from data field (set by DB trigger)
            const customOrderData = notification.data as { broadcast_id?: string; request_id?: string } | null

            const handleNotificationClick = () => {
              // Mark as read if not already
              if (!notification.is_read) {
                handleMarkAsRead(notification.id)
              }

              // Handle custom order notifications - navigate to review page
              if (isCustomOrderNotification && customOrderData?.broadcast_id) {
                router.push(`/${locale}/orders/custom-review/${customOrderData.broadcast_id}`)
                return
              }

              // Handle standard order notifications
              if (isOrderNotification && notification.related_order_id) {
                router.push(`/${locale}/orders/${notification.related_order_id}`)
              }
            }

            return (
              <div
                key={notification.id}
                onClick={handleNotificationClick}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  notification.is_read
                    ? 'border-slate-100'
                    : notification.type === 'custom_order_priced'
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-primary/30 bg-primary/5'
                } ${(isOrderNotification || isCustomOrderNotification) ? 'cursor-pointer hover:shadow-md' : ''}`}
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
                      {locale === 'ar' ? notification.body_ar : notification.body_en}
                    </p>
                    <span className="text-xs text-slate-400 mt-2 block">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* Confirm refund button for cash refund notifications */}
                    {notification.body_ar?.includes('يرجى تأكيد استلام') && notification.related_order_id && (
                      <button
                        onClick={() => handleConfirmRefund(notification.related_order_id!, notification.id)}
                        disabled={confirmingRefund === notification.id}
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {confirmingRefund === notification.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        {locale === 'ar' ? 'تأكيد الاستلام' : 'Confirm'}
                      </button>
                    )}
                    {/* Reply button for message notifications */}
                    {notification.type === 'order_message' && notification.related_order_id && (
                      <Link
                        href={`/${locale}/orders/${notification.related_order_id}?openChat=true`}
                        onClick={() => {
                          if (!notification.is_read) {
                            handleMarkAsRead(notification.id)
                          }
                        }}
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        {locale === 'ar' ? 'رد' : 'Reply'}
                      </Link>
                    )}
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
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
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50"
                      title={locale === 'ar' ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </CustomerLayout>
  )
}
