'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { guestLocationStorage } from '@/lib/hooks/useGuestLocation';
import { Globe } from 'lucide-react';

interface WelcomeClientWrapperProps {
  children: React.ReactNode;
}

export function WelcomeClientWrapper({ children }: WelcomeClientWrapperProps) {
  const locale = useLocale();
  const router = useRouter();

  // Check if user already has location set - non-blocking redirect
  useEffect(() => {
    const checkLocation = () => {
      const guestLocation = guestLocationStorage.get();
      if (guestLocation?.governorateId) {
        router.replace(`/${locale}`);
      }
    };
    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(checkLocation);
    } else {
      setTimeout(checkLocation, 100);
    }
  }, [locale, router]);

  return <>{children}</>;
}

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();

  const toggleLanguage = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    router.push(`/${newLocale}/welcome`);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-200 transition-colors"
    >
      <Globe className="w-4 h-4" />
      {locale === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}
