'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Menu,
  Bell,
  LogOut,
  User as UserIcon,
  ShoppingBag,
  Star,
  MessageCircle,
  Check,
  Trash2,
  AlertTriangle,
  Mic,
  Image as ImageIcon,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import type { User } from '@supabase/supabase-js';

interface ProviderHeaderProps {
  user: User | null;
  onMenuClick: () => void;
  onSignOut: () => void;
  pendingOrders?: number;
  totalNotifications?: number;
  providerId?: string;
  pageTitle?: { ar: string; en: string };
  pageSubtitle?: { ar: string; en: string };
}

type ProviderNotification = {
  id: string;
  provider_id: string;
  type: string;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  related_order_id: string | null;
  related_customer_id: string | null;
  related_review_id: string | null;
  related_message_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

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
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ProviderNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!providerId) return;
    setLoadingNotifications(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('provider_notifications')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }

    setLoadingNotifications(false);
  }, [providerId]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (notificationsOpen && providerId) {
      loadNotifications();
    }
  }, [notificationsOpen, providerId, loadNotifications]);

  async function markAsRead(notificationId: string) {
    const supabase = createClient();

    await supabase
      .from('provider_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    // Update local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  }

  async function markAllAsRead() {
    if (!providerId) return;
    const supabase = createClient();

    await supabase
      .from('provider_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('provider_id', providerId)
      .eq('is_read', false);

    // Update local state
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function deleteNotification(notificationId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const supabase = createClient();

    await supabase.from('provider_notifications').delete().eq('id', notificationId);

    // Update local state
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }

  function getNotificationIcon(type: string, bodyAr?: string | null) {
    switch (type) {
      // Standard orders
      case 'new_order':
        return <ShoppingBag className="w-5 h-5 text-yellow-600" />;
      case 'new_message':
        return <MessageCircle className="w-5 h-5 text-blue-600" />;
      case 'new_review':
        return <Star className="w-5 h-5 text-primary" />;
      case 'new_refund_request':
      case 'refund_confirmed':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;

      // Custom order notifications - UPPERCASE types
      case 'NEW_CUSTOM_ORDER':
        // Check body for input type to show appropriate icon
        if (bodyAr?.includes('صوتي')) {
          return <Mic className="w-5 h-5 text-emerald-600" />;
        }
        if (bodyAr?.includes('صور')) {
          return <ImageIcon className="w-5 h-5 text-emerald-600" />;
        }
        return <FileText className="w-5 h-5 text-emerald-600" />;
      case 'CUSTOM_ORDER_APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'CUSTOM_ORDER_REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PRICING_EXPIRED':
        return <Clock className="w-5 h-5 text-amber-600" />;

      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  }

  function getNotificationBgColor(type: string) {
    switch (type) {
      // Standard orders
      case 'new_order':
        return 'bg-yellow-100';
      case 'new_message':
        return 'bg-blue-100';
      case 'new_review':
        return 'bg-primary/10';
      case 'new_refund_request':
      case 'refund_confirmed':
        return 'bg-orange-100';

      // Custom order notifications
      case 'NEW_CUSTOM_ORDER':
        return 'bg-emerald-100';
      case 'CUSTOM_ORDER_APPROVED':
        return 'bg-green-100';
      case 'CUSTOM_ORDER_REJECTED':
        return 'bg-red-100';
      case 'PRICING_EXPIRED':
        return 'bg-amber-100';

      default:
        return 'bg-slate-100';
    }
  }

  function getNotificationLink(notification: ProviderNotification) {
    switch (notification.type) {
      // Standard orders
      case 'new_order':
      case 'new_message':
        return notification.related_order_id
          ? `/${locale}/provider/orders/${notification.related_order_id}`
          : `/${locale}/provider/orders`;
      case 'new_review':
        return `/${locale}/provider/reviews`;
      case 'new_refund_request':
      case 'refund_confirmed':
        return `/${locale}/provider/refunds`;

      // Custom order notifications
      // related_message_id stores request_id for custom orders
      case 'NEW_CUSTOM_ORDER':
      case 'CUSTOM_ORDER_REJECTED':
      case 'PRICING_EXPIRED':
        // Navigate to custom orders list or specific request
        return notification.related_message_id
          ? `/${locale}/provider/orders/custom?request=${notification.related_message_id}`
          : `/${locale}/provider/orders/custom`;

      case 'CUSTOM_ORDER_APPROVED':
        // After approval, we have real order_id
        return notification.related_order_id
          ? `/${locale}/provider/orders/${notification.related_order_id}`
          : `/${locale}/provider/orders/custom`;

      default:
        return `/${locale}/provider`;
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Just now';
    if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  };

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-100/80 px-4 lg:px-6 py-3 shadow-elegant sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Right Side (RTL): Menu & Logo */}
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="lg:hidden text-slate-500 hover:text-slate-700">
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo - visible on mobile, hidden on desktop */}
          <Link href={`/${locale}/provider`} className="lg:hidden">
            <EngeznaLogo size="sm" static showPen={false} />
          </Link>
        </div>

        {/* Center: Page Title - visible on all screens */}
        {pageTitle && (
          <div className="flex items-center justify-center flex-1 min-w-0 px-2">
            <div className="text-center truncate">
              <h2 className="text-sm md:text-lg font-semibold text-slate-800 truncate">
                {locale === 'ar' ? pageTitle.ar : pageTitle.en}
              </h2>
              {pageSubtitle && (
                <p className="text-[10px] md:text-xs text-slate-500 truncate hidden md:block">
                  {locale === 'ar' ? pageSubtitle.ar : pageSubtitle.en}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Left Side (RTL): Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setNotificationsOpen(true)}
            onMouseLeave={() => setNotificationsOpen(false)}
          >
            <button className="relative p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition-all duration-200 active:scale-95">
              <Bell className="w-5 h-5" />
              {(totalNotifications ?? pendingOrders) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {(totalNotifications ?? pendingOrders) > 9
                    ? '9+'
                    : (totalNotifications ?? pendingOrders)}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {notificationsOpen && (
              <div
                className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-80 sm:w-96 z-50 animate-slide-up`}
              >
                <div className="bg-white rounded-2xl shadow-elegant-lg border border-slate-100 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
                      </h3>
                      {unreadNotifications.length > 0 && (
                        <p className="text-xs text-slate-500">
                          {locale === 'ar'
                            ? `${unreadNotifications.length} إشعار غير مقروء`
                            : `${unreadNotifications.length} unread`}
                        </p>
                      )}
                    </div>
                    {unreadNotifications.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Check className="w-3 h-3" />
                        {locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="max-h-96 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        {notifications.map((notification) => (
                          <Link
                            key={notification.id}
                            href={getNotificationLink(notification)}
                            onClick={() => {
                              if (!notification.is_read) {
                                markAsRead(notification.id);
                              }
                              setNotificationsOpen(false);
                            }}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors ${
                              !notification.is_read ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationBgColor(notification.type)}`}
                            >
                              {getNotificationIcon(notification.type, notification.body_ar)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium ${!notification.is_read ? 'text-primary' : 'text-slate-900'}`}
                              >
                                {locale === 'ar' ? notification.title_ar : notification.title_en}
                              </p>
                              {(notification.body_ar || notification.body_en) && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                  {locale === 'ar' ? notification.body_ar : notification.body_en}
                                </p>
                              )}
                              <p className="text-xs text-slate-400 mt-1">
                                {formatTimeAgo(notification.created_at)}
                              </p>
                            </div>
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Reply button for customer messages */}
                              {notification.type === 'new_message' &&
                                notification.related_order_id && (
                                  <Link
                                    href={`/${locale}/provider/orders/${notification.related_order_id}?openChat=true`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!notification.is_read) {
                                        markAsRead(notification.id);
                                      }
                                      setNotificationsOpen(false);
                                    }}
                                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                                  >
                                    {locale === 'ar' ? 'رد' : 'Reply'}
                                  </Link>
                                )}
                              {!notification.is_read && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-primary rounded-full hover:bg-slate-100"
                                  title={locale === 'ar' ? 'تحديد كمقروء' : 'Mark as read'}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => deleteNotification(notification.id, e)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50"
                                title={locale === 'ar' ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100">
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
            <button className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 active:scale-95">
              <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-primary" />
              </div>
            </button>

            {/* Dropdown Menu */}
            {accountMenuOpen && (
              <div
                className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-1 w-56 z-50 animate-slide-up`}
              >
                <div className="bg-white rounded-2xl shadow-elegant-lg border border-slate-100 py-2">
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
                      {locale === 'ar' ? 'إعدادات المتجر' : 'Store Settings'}
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onSignOut();
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
  );
}
