'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { CustomerLayout } from '@/components/customer/layout';
import { Card } from '@/components/ui/card';
import { Globe, Loader2, Check } from 'lucide-react';

export default function LanguagePage() {
  const locale = useLocale();
  const t = useTranslations('settings.language');
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState(locale);
  const [changing, setChanging] = useState(false);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/profile/language`);
      return;
    }

    setAuthLoading(false);
  }, [locale, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function handleLanguageChange(newLocale: string) {
    if (newLocale === locale) return;

    setChanging(true);
    setSelectedLanguage(newLocale);

    // Wait a bit for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Redirect to profile page with new locale
    router.push(`/${newLocale}/profile`);
  }

  if (authLoading) {
    return (
      <CustomerLayout headerTitle={t('title')} showBottomNav={true}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout headerTitle={t('title')} showBottomNav={true}>
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-6">{t('description')}</p>

        <div className="space-y-4">
          {/* Arabic Option */}
          <Card
            className={`p-4 cursor-pointer transition-all ${
              selectedLanguage === 'ar' ? 'border-2 border-primary bg-primary/5' : 'hover:bg-muted'
            } ${changing ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => handleLanguageChange('ar')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${selectedLanguage === 'ar' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">العربية</h3>
                  {selectedLanguage === 'ar' && (
                    <p className="text-sm text-primary">{t('current')}</p>
                  )}
                </div>
              </div>
              {selectedLanguage === 'ar' && !changing && <Check className="w-5 h-5 text-primary" />}
              {selectedLanguage === 'ar' && changing && (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
            </div>
          </Card>

          {/* English Option */}
          <Card
            className={`p-4 cursor-pointer transition-all ${
              selectedLanguage === 'en' ? 'border-2 border-primary bg-primary/5' : 'hover:bg-muted'
            } ${changing ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => handleLanguageChange('en')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${selectedLanguage === 'en' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">English</h3>
                  {selectedLanguage === 'en' && (
                    <p className="text-sm text-primary">{t('current')}</p>
                  )}
                </div>
              </div>
              {selectedLanguage === 'en' && !changing && <Check className="w-5 h-5 text-primary" />}
              {selectedLanguage === 'en' && changing && (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
            </div>
          </Card>
        </div>
      </main>
    </CustomerLayout>
  );
}
