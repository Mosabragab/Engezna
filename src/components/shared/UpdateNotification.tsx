'use client';

import { useEffect, useState } from 'react';
import { X, RefreshCw, Sparkles } from 'lucide-react';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';

/**
 * PWA Update Notification Component
 *
 * Shows a non-intrusive notification when a new version is available.
 * Features:
 * - Animated entrance from bottom
 * - RTL support for Arabic
 * - One-click update with loading state
 * - Dismissible (update later)
 * - Auto-hides after 30 seconds if dismissed
 */
export function UpdateNotification() {
  const { isUpdateAvailable, isUpdating, updateServiceWorker, dismissUpdate } =
    useServiceWorkerUpdate();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Show notification with animation when update is available
  useEffect(() => {
    if (isUpdateAvailable && !isDismissed) {
      // Small delay for smooth animation
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isUpdateAvailable, isDismissed]);

  // Reset dismissed state after 30 minutes (remind user again)
  useEffect(() => {
    if (isDismissed) {
      const timer = setTimeout(
        () => {
          setIsDismissed(false);
        },
        30 * 60 * 1000
      ); // 30 minutes
      return () => clearTimeout(timer);
    }
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      dismissUpdate();
    }, 300); // Wait for exit animation
  };

  const handleUpdate = async () => {
    await updateServiceWorker();
    // Page will reload automatically
  };

  if (!isUpdateAvailable || isDismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md transform transition-all duration-300 ease-out md:left-auto md:right-6 md:max-w-sm ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-4 shadow-xl">
        {/* Background decoration */}
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-2 -left-2 h-16 w-16 rounded-full bg-white/5" />

        {/* Content */}
        <div className="relative flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">تحديث جديد متاح!</h3>
            <p className="mt-0.5 text-xs text-white/80">
              قم بتحديث التطبيق للحصول على أحدث الميزات والتحسينات
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="relative mt-3 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            لاحقاً
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary-600 transition-colors hover:bg-white/90 disabled:opacity-70"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>جاري التحديث...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>تحديث الآن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
