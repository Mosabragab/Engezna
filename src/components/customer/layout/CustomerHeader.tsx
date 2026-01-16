'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Bell,
  User,
  ChevronDown,
  ShoppingCart,
  Check,
  X,
  DollarSign,
  Package,
  AlertCircle,
  Clock,
  Loader2,
  MessageCircle,
  Reply,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { useNotifications } from '@/hooks/customer';
import { useCart } from '@/lib/store/cart';
import { useGuestLocation } from '@/lib/hooks/useGuestLocation';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface CustomerHeaderProps {
  showBackButton?: boolean;
  title?: string;
  transparent?: boolean;
  rightAction?: React.ReactNode; // Custom action button (e.g., refresh)
}

export function CustomerHeader({
  showBackButton = false,
  title,
  transparent = false,
  rightAction,
}: CustomerHeaderProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('header');

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [confirmingRefundId, setConfirmingRefundId] = useState<string | null>(null);
  const [confirmedRefundIds, setConfirmedRefundIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Guest location hook
  const { location: guestLocation, isLoaded: guestLocationLoaded } = useGuestLocation();

  // Use real-time notifications hook
  const { notifications, unreadCount, markAsRead, refresh } = useNotifications();

  // Get cart item count
  const { getItemCount } = useCart();
  const cartItemCount = getItemCount();

  const checkAuth = useCallback(async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Logged-in user - get location from profile
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select(
              `
              governorate_id,
              city_id,
              governorates:governorate_id (name_ar, name_en),
              cities:city_id (name_ar, name_en)
            `
            )
            .eq('id', user.id)
            .single();

          if (!error && profile) {
            // Supabase returns joined data as the object directly
            const govData = profile.governorates as unknown as {
              name_ar: string;
              name_en: string;
            } | null;
            const cityData = profile.cities as unknown as {
              name_ar: string;
              name_en: string;
            } | null;

            if (cityData && cityData.name_ar) {
              setCurrentLocation(locale === 'ar' ? cityData.name_ar : cityData.name_en);
            } else if (govData && govData.name_ar) {
              setCurrentLocation(locale === 'ar' ? govData.name_ar : govData.name_en);
            }
          }
        } catch (error) {
          // Error handled silently
        }
      } else {
        // Guest user - get location from localStorage
        if (guestLocation.cityName) {
          setCurrentLocation(
            locale === 'ar' ? guestLocation.cityName.ar : guestLocation.cityName.en
          );
        } else if (guestLocation.governorateName) {
          setCurrentLocation(
            locale === 'ar' ? guestLocation.governorateName.ar : guestLocation.governorateName.en
          );
        }
      }
    } catch (error) {
      // Error handled silently
    }

    setLocationLoading(false);
  }, [locale, guestLocation]);

  useEffect(() => {
    if (guestLocationLoaded) {
      checkAuth();
    }
  }, [guestLocationLoaded, checkAuth]);

  // Listen for guest location changes
  useEffect(() => {
    const handleLocationChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newLocation = customEvent.detail;
      // Update location display immediately with the new data
      if (newLocation?.cityName) {
        setCurrentLocation(locale === 'ar' ? newLocation.cityName.ar : newLocation.cityName.en);
      } else if (newLocation?.governorateName) {
        setCurrentLocation(
          locale === 'ar' ? newLocation.governorateName.ar : newLocation.governorateName.en
        );
      }
    };
    window.addEventListener('guestLocationChanged', handleLocationChange);
    return () => {
      window.removeEventListener('guestLocationChanged', handleLocationChange);
    };
  }, [locale]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Confirm refund receipt
  async function handleConfirmRefund(orderId: string, notificationId: string) {
    if (!user) return;

    setConfirmingRefundId(orderId);
    const supabase = createClient();

    try {
      // Find the refund for this order
      // Note: customer_confirmed can be false or NULL, so we need to check both
      const { data: refund, error: refundError } = await supabase
        .from('refunds')
        .select('id')
        .eq('order_id', orderId)
        .eq('customer_id', user.id)
        .eq('provider_action', 'cash_refund')
        .or('customer_confirmed.eq.false,customer_confirmed.is.null')
        .single();

      if (refundError || !refund) {
        console.error('Refund not found');
        setConfirmingRefundId(null);
        return;
      }

      // Confirm the refund
      const { error } = await supabase
        .from('refunds')
        .update({
          customer_confirmed: true,
          customer_confirmed_at: new Date().toISOString(),
          status: 'processed',
        })
        .eq('id', refund.id);

      if (error) {
        console.error('Error confirming refund:', error);
      } else {
        // Add to confirmed set to show success message
        setConfirmedRefundIds((prev) => new Set(prev).add(orderId));
        // Mark notification as read
        await markAsRead(notificationId);
        // Refresh notifications after a delay to show success message
        setTimeout(async () => {
          await refresh();
        }, 2000);
      }
    } catch (error) {
      console.error('Error:', error);
    }

    setConfirmingRefundId(null);
  }

  // Handle mouse enter/leave for dropdown
  function handleMouseEnter() {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setShowNotificationDropdown(true);
  }

  function handleMouseLeave() {
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowNotificationDropdown(false);
    }, 300); // Delay before closing
  }

  // Get notification icon based on type
  function getNotificationIcon(type: string) {
    switch (type) {
      case 'refund_update':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'order_delivered':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'order_cancelled':
        return <X className="h-4 w-4 text-red-500" />;
      case 'new_message':
        return <MessageCircle className="h-4 w-4 text-primary" />;
      case 'support_message':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  }

  // Check if notification is a message from provider
  function isMessageNotification(notification: { type: string }) {
    return notification.type === 'new_message';
  }

  // Check if notification is a support message
  function isSupportNotification(notification: { type: string }) {
    return notification.type === 'support_message';
  }

  // Check if notification is a refund that needs confirmation
  function isRefundConfirmation(notification: { type: string; body_ar: string | null }) {
    return (
      notification.type === 'refund_update' &&
      (notification.body_ar?.includes('تأكيد استلام') ||
        notification.body_ar?.includes('تأكيد الاستلام') ||
        notification.body_ar?.includes('يرجى تأكيد'))
    );
  }

  // Display text for location button
  const locationDisplayText = locationLoading
    ? '...'
    : currentLocation || (locale === 'ar' ? 'اختر موقعك' : 'Select location');

  // Get recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5);

  return (
    <header
      className={`sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] ${transparent ? 'bg-transparent' : 'bg-white/95 backdrop-blur-md border-b border-slate-100/80'}`}
    >
      <div className="container mx-auto px-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Location (only on home page without title) */}
          <div className="flex items-center gap-3">
            {!title ? (
              <button
                onClick={() => router.push(`/${locale}/profile/governorate`)}
                className="group flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-slate-100 active:scale-[0.98]"
              >
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium max-w-[100px] truncate text-sm text-primary">
                  {locationDisplayText}
                </span>
              </button>
            ) : (
              // Empty placeholder to maintain layout balance
              <div className="w-9 h-9" />
            )}
          </div>

          {/* Center - Always show Animated Logo as link to home */}
          <Link
            href={`/${locale}`}
            className="absolute left-1/2 -translate-x-1/2 hover:scale-105 transition-transform duration-200"
          >
            <EngeznaLogo size="lg" showPen={false} bgColor="white" />
          </Link>

          {/* Right Section - Custom Action + Notifications & Profile */}
          <div className="flex items-center gap-1.5">
            {/* Custom Action (e.g., refresh button) */}
            {rightAction && rightAction}

            {/* Cart - Hidden on mobile (bottom nav has cart) */}
            <button
              onClick={() => router.push(`/${locale}/cart`)}
              className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 active:scale-95 transition-all duration-200 relative group"
            >
              <ShoppingCart className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full px-1 shadow-sm shadow-primary/30">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </button>

            {/* Notifications - With Dropdown on Hover */}
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 active:scale-95 transition-all duration-200 relative group"
                onClick={() => router.push(`/${locale}/notifications`)}
                aria-label="notifications"
              >
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-sm shadow-red-500/30 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown - Elegant Design */}
              {showNotificationDropdown && (
                <div
                  className={`absolute top-full mt-3 ${locale === 'ar' ? 'left-0' : 'right-0'} w-80 bg-white rounded-2xl shadow-elegant-lg border border-slate-100 overflow-hidden z-50 animate-slide-up`}
                >
                  {/* Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">
                      {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        {unreadCount} {locale === 'ar' ? 'جديد' : 'new'}
                      </span>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto">
                    {recentNotifications.length > 0 ? (
                      recentNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                            !notification.is_read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {locale === 'ar' ? notification.title_ar : notification.title_en}
                              </p>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                {locale === 'ar' ? notification.body_ar : notification.body_en}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                    locale: locale === 'ar' ? ar : enUS,
                                  })}
                                </span>
                              </div>

                              {/* Refund Confirmation Button or Success Message */}
                              {isRefundConfirmation(notification) &&
                                notification.related_order_id &&
                                (confirmedRefundIds.has(notification.related_order_id) ? (
                                  // Success message after confirmation
                                  <div className="mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-xs font-medium text-green-700">
                                      {locale === 'ar'
                                        ? 'شكراً لتأكيدك! تم تسجيل الاستلام بنجاح'
                                        : 'Thank you! Receipt confirmed successfully'}
                                    </span>
                                  </div>
                                ) : (
                                  // Confirmation buttons
                                  <div className="mt-2 flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConfirmRefund(
                                          notification.related_order_id!,
                                          notification.id
                                        );
                                      }}
                                      disabled={
                                        confirmingRefundId === notification.related_order_id
                                      }
                                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                      {confirmingRefundId === notification.related_order_id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5" />
                                      )}
                                      {locale === 'ar' ? 'نعم، استلمت' : 'Yes, Received'}
                                    </button>
                                    <Link
                                      href={`/${locale}/profile/support`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      {locale === 'ar' ? 'لم أستلم' : 'Not Received'}
                                    </Link>
                                  </div>
                                ))}

                              {/* Reply to Message Button */}
                              {isMessageNotification(notification) &&
                                notification.related_order_id && (
                                  <div className="mt-2">
                                    <Link
                                      href={`/${locale}/orders/${notification.related_order_id}?chat=open`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded-lg transition-colors"
                                    >
                                      <Reply className="h-3.5 w-3.5" />
                                      {locale === 'ar' ? 'رد على الرسالة' : 'Reply to Message'}
                                    </Link>
                                  </div>
                                )}

                              {/* View Support Ticket Button */}
                              {isSupportNotification(notification) && (
                                <div className="mt-2">
                                  <Link
                                    href={`/${locale}/profile/support`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                                  >
                                    <Reply className="h-3.5 w-3.5" />
                                    {locale === 'ar'
                                      ? 'عرض الشكوى والرد'
                                      : 'View & Reply to Ticket'}
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <Bell className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          {locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {recentNotifications.length > 0 && (
                    <Link
                      href={`/${locale}/notifications`}
                      className="block px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-slate-50 border-t border-slate-100"
                    >
                      {locale === 'ar' ? 'عرض كل الإشعارات' : 'View All Notifications'}
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <Link href={user ? `/${locale}/profile` : `/${locale}/auth/login`}>
              <button className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 active:scale-95 transition-all duration-200 group">
                <User className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
