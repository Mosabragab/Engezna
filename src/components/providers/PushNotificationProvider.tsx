'use client';

import { useEffect, useCallback, useState } from 'react';
import { usePushNotifications, NotificationPayload } from '@/hooks/usePushNotifications';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { getAudioManager } from '@/lib/audio/audio-manager';

interface ToastNotification extends NotificationPayload {
  id: string;
}

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { permission, isSupported, isLoading, requestPermission, onForegroundMessage } =
    usePushNotifications();

  const pathname = usePathname();
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Initialize Audio Manager on mount
  useEffect(() => {
    const audioManager = getAudioManager();
    audioManager.init();
  }, []);

  // Determine if we should show the notification prompt
  // Only show on authenticated pages (provider, admin, customer areas)
  const isAuthenticatedPage =
    pathname?.includes('/provider') ||
    pathname?.includes('/admin') ||
    pathname?.includes('/orders') ||
    pathname?.includes('/profile');

  // Show prompt after a delay on authenticated pages
  useEffect(() => {
    if (!isAuthenticatedPage || !isSupported || isLoading) return;
    if (permission !== 'default') return;

    // Show prompt after 5 seconds on authenticated pages
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isAuthenticatedPage, isSupported, isLoading, permission]);

  // Handle enabling notifications
  const handleEnableNotifications = useCallback(async () => {
    setShowPrompt(false);
    await requestPermission();
  }, [requestPermission]);

  // Handle dismissing the prompt
  const handleDismissPrompt = useCallback(() => {
    setShowPrompt(false);
    // Store dismissal in localStorage to not show again for 7 days
    localStorage.setItem('notification_prompt_dismissed', String(Date.now()));
  }, []);

  // Check if prompt was recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('notification_prompt_dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < sevenDays) {
        setShowPrompt(false);
      }
    }
  }, []);

  // Handle foreground messages
  useEffect(() => {
    if (permission !== 'granted') return;

    const unsubscribe = onForegroundMessage((payload) => {
      // Add toast notification
      const toast: ToastNotification = {
        ...payload,
        id: `toast-${Date.now()}`,
      };

      setToasts((prev) => [...prev, toast]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);

      // Play the appropriate sound based on FCM notification type
      const notifType = payload.data?.type || '';
      if (notifType === 'new_order') {
        getAudioManager().play('new-order');
      } else if (notifType === 'order_update') {
        getAudioManager().play('order-update');
      } else if (
        notifType === 'custom_order' ||
        notifType === 'new_custom_order' ||
        notifType === 'custom_order_approved' ||
        notifType === 'custom_order_rejected' ||
        notifType === 'CUSTOM_ORDER_PRICED' ||
        notifType === 'CUSTOM_ORDER_EXPIRED' ||
        notifType === 'CUSTOM_ORDER_PRICING_EXPIRED'
      ) {
        getAudioManager().play('custom-order');
      } else {
        getAudioManager().play('notification');
      }
    });

    return unsubscribe;
  }, [permission, onForegroundMessage]);

  // Handle NOTIFICATION_CLICK messages from service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.targetUrl) {
        router.push(event.data.targetUrl);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, [router]);

  // Remove a toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle toast click
  const handleToastClick = useCallback(
    (toast: ToastNotification) => {
      removeToast(toast.id);

      // Navigate based on notification data using Next.js router
      if (toast.data?.click_action) {
        router.push(toast.data.click_action);
      }
    },
    [removeToast, router]
  );

  // Get locale from pathname
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en';

  return (
    <>
      {children}

      {/* Notification Permission Prompt */}
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
          <div className="bg-white rounded-2xl shadow-elegant-lg border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">
                  {locale === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications'}
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  {locale === 'ar'
                    ? 'احصل على تنبيهات فورية للطلبات والرسائل الجديدة'
                    : 'Get instant alerts for new orders and messages'}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleEnableNotifications}
                    className="flex-1 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {locale === 'ar' ? 'تفعيل' : 'Enable'}
                  </button>
                  <button
                    onClick={handleDismissPrompt}
                    className="px-4 py-2 text-slate-500 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {locale === 'ar' ? 'لاحقاً' : 'Later'}
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismissPrompt}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => handleToastClick(toast)}
            className="bg-white rounded-xl shadow-elegant-lg border border-slate-200 p-4 cursor-pointer hover:bg-slate-50 transition-colors animate-slide-in-right"
          >
            <div className="flex items-start gap-3">
              {toast.icon ? (
                <img src={toast.icon} alt="" className="w-10 h-10 rounded-lg" />
              ) : (
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 truncate">{toast.title}</h4>
                <p className="text-sm text-slate-500 line-clamp-2">{toast.body}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default PushNotificationProvider;
