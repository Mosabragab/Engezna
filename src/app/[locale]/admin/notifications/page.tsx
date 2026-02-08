'use client';

import { useLocale } from 'next-intl';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminSidebar } from '@/components/admin/AdminSidebarContext';
import type { User } from '@supabase/supabase-js';
import {
  Bell,
  CheckCheck,
  Trash2,
  Loader2,
  MessageSquare,
  ShoppingBag,
  Wallet,
  Store,
  Star,
  AlertCircle,
  HeadphonesIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminNotification {
  id: string;
  admin_id: string;
  type: string;
  title: string;
  body: string | null;
  related_message_id: string | null;
  related_provider_id: string | null;
  related_order_id: string | null;
  governorate_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

type FilterStatus = 'all' | 'unread' | 'read';

export default function AdminNotificationsPage() {
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return;

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, role, assigned_regions')
      .eq('user_id', authUser.id)
      .single();

    if (!adminUser) return;

    const isSuperAdmin = adminUser.role === 'super_admin';
    const assignedGovernorateIds =
      !isSuperAdmin && adminUser.assigned_regions
        ? ((adminUser.assigned_regions || [])
            .map((r: { governorate_id?: string }) => r.governorate_id)
            .filter(Boolean) as string[])
        : [];
    const hasRegionFilter = assignedGovernorateIds.length > 0;

    const { data: notifs, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('admin_id', adminUser.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    let filteredNotifs = notifs || [];

    if (hasRegionFilter) {
      const { data: regionProviders } = await supabase
        .from('providers')
        .select('id')
        .in('governorate_id', assignedGovernorateIds);

      const providerIdsInRegion = (regionProviders || []).map((p) => p.id);

      const genericTypes = [
        'message',
        'announcement',
        'system',
        'task',
        'approval',
        'reminder',
        'welcome',
        'info',
      ];

      filteredNotifs = filteredNotifs.filter((notif) => {
        if (genericTypes.includes(notif.type)) return true;
        if (notif.governorate_id) return assignedGovernorateIds.includes(notif.governorate_id);
        if (notif.related_provider_id)
          return providerIdsInRegion.includes(notif.related_provider_id);
        return false;
      });
    }

    setNotifications(filteredNotifs);
  }, []);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      router.push(`/${locale}/admin/login`);
      return;
    }

    setUser(authUser);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profile?.role === 'admin') {
      setIsAdmin(true);
      await loadNotifications();
    }

    setLoading(false);
  }, [locale, router, loadNotifications]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Polling for new notifications
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, loadNotifications]);

  async function markAsRead(notificationId: string) {
    setActionLoading(notificationId);
    const supabase = createClient();
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
    }
    setActionLoading(null);
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setActionLoading('all');
    const supabase = createClient();
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    }
    setActionLoading(null);
  }

  async function deleteNotification(notificationId: string) {
    setActionLoading(notificationId);
    const supabase = createClient();
    const { error } = await supabase.from('admin_notifications').delete().eq('id', notificationId);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
    setActionLoading(null);
  }

  function getTimeSince(date: string): string {
    const now = new Date();
    const created = new Date(date);
    const diff = now.getTime() - created.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return locale === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
    if (hours > 0) return locale === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
    if (minutes > 0) return locale === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    return locale === 'ar' ? 'الآن' : 'Just now';
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'message':
        return { icon: MessageSquare, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' };
      case 'order':
      case 'new_order':
      case 'order_status':
        return { icon: ShoppingBag, bgColor: 'bg-amber-100', iconColor: 'text-amber-600' };
      case 'settlement':
      case 'payment':
        return { icon: Wallet, bgColor: 'bg-green-100', iconColor: 'text-green-600' };
      case 'provider':
      case 'new_provider':
        return { icon: Store, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' };
      case 'review':
        return { icon: Star, bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' };
      case 'support_ticket':
      case 'contact_form':
        return { icon: HeadphonesIcon, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' };
      case 'refund':
      case 'new_refund_request':
      case 'refund_escalated':
      case 'escalation':
        return { icon: AlertCircle, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' };
      default:
        return { icon: Bell, bgColor: 'bg-slate-100', iconColor: 'text-slate-600' };
    }
  }

  function getNotificationRoute(type: string): string | null {
    switch (type) {
      case 'message':
        return `/${locale}/admin/messages`;
      case 'order':
      case 'new_order':
      case 'order_status':
        return `/${locale}/admin/orders`;
      case 'settlement':
      case 'payment':
        return `/${locale}/admin/settlements`;
      case 'provider':
      case 'new_provider':
        return `/${locale}/admin/providers`;
      case 'review':
        return `/${locale}/admin/approvals`;
      case 'refund':
      case 'new_refund_request':
      case 'refund_escalated':
      case 'escalation':
        return `/${locale}/admin/refunds`;
      case 'support_ticket':
      case 'contact_form':
        return `/${locale}/admin/support`;
      default:
        return null;
    }
  }

  function handleNotificationClick(notification: AdminNotification) {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    const route = getNotificationRoute(notification.type);
    if (route) {
      router.push(route);
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filterStatus === 'unread') return !n.is_read;
    if (filterStatus === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">
          {locale === 'ar' ? 'غير مصرح لك بالوصول' : 'Unauthorized access'}
        </p>
      </div>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-2xl font-bold text-slate-800 font-numbers">
              {notifications.length}
            </div>
            <div className="text-sm text-slate-500">
              {locale === 'ar' ? 'إجمالي الإشعارات' : 'Total Notifications'}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-600 font-numbers">{unreadCount}</div>
            <div className="text-sm text-slate-500">
              {locale === 'ar' ? 'غير مقروءة' : 'Unread'}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-600 font-numbers">
              {notifications.length - unreadCount}
            </div>
            <div className="text-sm text-slate-500">{locale === 'ar' ? 'مقروءة' : 'Read'}</div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterStatus === 'all'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {locale === 'ar' ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setFilterStatus('unread')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterStatus === 'unread'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {locale === 'ar' ? 'غير مقروءة' : 'Unread'}
            </button>
            <button
              onClick={() => setFilterStatus('read')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterStatus === 'read'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {locale === 'ar' ? 'مقروءة' : 'Read'}
            </button>
          </div>

          {/* Mark All as Read */}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={actionLoading === 'all'}
              className="gap-2"
            >
              {actionLoading === 'all' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              {locale === 'ar' ? 'قراءة الكل' : 'Mark All Read'}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification) => {
                const {
                  icon: NotifIcon,
                  bgColor,
                  iconColor,
                } = getNotificationIcon(notification.type);
                const route = getNotificationRoute(notification.type);
                const isClickable = !!route;

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 transition-colors ${
                      !notification.is_read ? 'bg-blue-50/50' : ''
                    } ${isClickable ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                    onClick={() => isClickable && handleNotificationClick(notification)}
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}
                    >
                      <NotifIcon className={`w-5 h-5 ${iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`text-sm ${
                              !notification.is_read
                                ? 'font-semibold text-slate-900'
                                : 'text-slate-700'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-sm text-slate-500 mt-1">{notification.body}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1.5">
                            {getTimeSince(notification.created_at)}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!notification.is_read && (
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          disabled={actionLoading === notification.id}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title={locale === 'ar' ? 'تعيين كمقروء' : 'Mark as read'}
                        >
                          {actionLoading === notification.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCheck className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        disabled={actionLoading === notification.id}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={locale === 'ar' ? 'حذف' : 'Delete'}
                      >
                        {actionLoading === notification.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">
                {filterStatus === 'unread'
                  ? locale === 'ar'
                    ? 'لا توجد إشعارات غير مقروءة'
                    : 'No unread notifications'
                  : filterStatus === 'read'
                    ? locale === 'ar'
                      ? 'لا توجد إشعارات مقروءة'
                      : 'No read notifications'
                    : locale === 'ar'
                      ? 'لا توجد إشعارات'
                      : 'No notifications'}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
