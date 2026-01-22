'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Cookie, X, Settings, Check } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'engezna_cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0';

type ConsentType = 'all' | 'essential' | null;

interface CookieConsent {
  version: string;
  timestamp: string;
  consent: ConsentType;
}

export function CookieConsentBanner() {
  const locale = useLocale();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (storedConsent) {
      try {
        const consent: CookieConsent = JSON.parse(storedConsent);
        // Show banner again if version changed
        if (consent.version !== COOKIE_CONSENT_VERSION) {
          setShowBanner(true);
        }
      } catch {
        setShowBanner(true);
      }
    } else {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (type: ConsentType) => {
    const consent: CookieConsent = {
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      consent: type,
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setShowBanner(false);
  };

  const handleAcceptAll = () => {
    saveConsent('all');
  };

  const handleAcceptEssential = () => {
    saveConsent('essential');
  };

  if (!showBanner) return null;

  const isRTL = locale === 'ar';

  const content = {
    ar: {
      title: 'نستخدم الكوكيز',
      description:
        'نستخدم ملفات تعريف الارتباط (الكوكيز) لتحسين تجربتك وضمان عمل الموقع بشكل صحيح.',
      learnMore: 'اعرف المزيد',
      acceptAll: 'قبول الكل',
      essentialOnly: 'الأساسية فقط',
      showDetails: 'إعدادات',
      hideDetails: 'إخفاء',
      essentialTitle: 'كوكيز أساسية',
      essentialDesc: 'ضرورية لتسجيل الدخول والأمان (Supabase)',
      analyticsTitle: 'كوكيز التحليلات',
      analyticsDesc: 'تساعدنا على تحسين أداء الموقع (Vercel)',
      securityTitle: 'كوكيز الأمان',
      securityDesc: 'لتتبع الأخطاء وتحسين الاستقرار (Sentry)',
      notificationTitle: 'كوكيز الإشعارات',
      notificationDesc: 'لإرسال الإشعارات المهمة (Firebase)',
    },
    en: {
      title: 'We use cookies',
      description:
        'We use cookies to enhance your experience and ensure our website functions properly.',
      learnMore: 'Learn more',
      acceptAll: 'Accept All',
      essentialOnly: 'Essential Only',
      showDetails: 'Settings',
      hideDetails: 'Hide',
      essentialTitle: 'Essential Cookies',
      essentialDesc: 'Required for login and security (Supabase)',
      analyticsTitle: 'Analytics Cookies',
      analyticsDesc: 'Help us improve site performance (Vercel)',
      securityTitle: 'Security Cookies',
      securityDesc: 'For error tracking and stability (Sentry)',
      notificationTitle: 'Notification Cookies',
      notificationDesc: 'For sending important notifications (Firebase)',
    },
  };

  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800 md:p-6">
          {/* Main Content */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Icon and Text */}
            <div className="flex items-start gap-3 md:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t.title}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {t.description}{' '}
                  <Link
                    href={`/${locale}/privacy#cookies`}
                    className="text-primary underline hover:text-primary/80"
                  >
                    {t.learnMore}
                  </Link>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Settings className="h-4 w-4" />
                {showDetails ? t.hideDetails : t.showDetails}
              </button>

              <button
                onClick={handleAcceptEssential}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
                {t.essentialOnly}
              </button>

              <button
                onClick={handleAcceptAll}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <Check className="h-4 w-4" />
                {t.acceptAll}
              </button>
            </div>
          </div>

          {/* Cookie Details */}
          {showDetails && (
            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="grid gap-3 md:grid-cols-2">
                {/* Essential Cookies */}
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t.essentialTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.essentialDesc}</p>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Cookie className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t.analyticsTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.analyticsDesc}</p>
                  </div>
                </div>

                {/* Security Cookies */}
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                    <Cookie className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t.securityTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.securityDesc}</p>
                  </div>
                </div>

                {/* Notification Cookies */}
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Cookie className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t.notificationTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.notificationDesc}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
