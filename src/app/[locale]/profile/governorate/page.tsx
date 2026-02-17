'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { CustomerLayout } from '@/components/customer/layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPinned, Loader2, Check, User, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useLocation, useUserLocation } from '@/lib/contexts';

export default function GovernoratePage() {
  const locale = useLocale();
  const t = useTranslations('settings.governorate');
  const router = useRouter();

  // Get location data from context (no redundant queries!)
  const {
    governorates,
    getCitiesByGovernorate,
    getGovernorateById,
    getCityById,
    isDataLoading: locationDataLoading,
    isDataLoaded: locationDataLoaded,
    setUserLocation,
  } = useLocation();

  // Get current user location from context
  const {
    governorateId: currentGovernorateId,
    cityId: currentCityId,
    isLoading: userLocationLoading,
    hasLocation: hasUserLocation,
  } = useUserLocation();

  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Selected values (may differ from current saved values)
  const [governorateId, setGovernorateId] = useState('');
  const [cityId, setCityId] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter cities based on selected governorate using context helper
  const cities = useMemo(() => {
    if (!governorateId) return [];
    return getCitiesByGovernorate(governorateId);
  }, [governorateId, getCitiesByGovernorate]);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserId(user.id);
      setIsGuest(false);
    } else {
      setIsGuest(true);
    }

    setAuthLoading(false);
  }, []);

  // Check auth state on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Initialize selections when user location loads
  useEffect(() => {
    if (!userLocationLoading && locationDataLoaded) {
      if (currentGovernorateId) {
        setGovernorateId(currentGovernorateId);
        if (currentCityId) {
          setCityId(currentCityId);
        }
      }
    }
  }, [userLocationLoading, locationDataLoaded, currentGovernorateId, currentCityId, userId]);

  // Reset city when governorate changes
  useEffect(() => {
    // Only reset if user changed governorate (not on initial load)
    if (governorateId && governorateId !== currentGovernorateId) {
      setCityId('');
    }
  }, [governorateId, currentGovernorateId]);

  async function handleSave() {
    if (!governorateId) {
      setMessage({
        type: 'error',
        text: locale === 'ar' ? 'يرجى اختيار المحافظة' : 'Please select a governorate',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Get names for display using context helpers
      const selectedGov = getGovernorateById(governorateId);
      const selectedCity = cityId ? getCityById(cityId) : null;

      // Use context's setUserLocation which handles both guests and logged-in users
      await setUserLocation({
        governorateId,
        governorateName: selectedGov ? { ar: selectedGov.name_ar, en: selectedGov.name_en } : null,
        cityId: cityId || null,
        cityName: selectedCity ? { ar: selectedCity.name_ar, en: selectedCity.name_en } : null,
      });

      setMessage({
        type: 'success',
        text: isGuest ? (locale === 'ar' ? 'تم حفظ الموقع' : 'Location saved') : t('saved'),
      });

      // Redirect to home after saving location (both guests and logged-in users)
      // This allows them to see stores in their new location
      setTimeout(() => {
        router.push(`/${locale}`);
      }, 1000);
    } catch {
      setMessage({
        type: 'error',
        text: locale === 'ar' ? 'حدث خطأ أثناء حفظ الموقع' : 'Error saving location',
      });
    }

    setSaving(false);
  }

  // Show loading while auth or location data is loading
  if (authLoading || locationDataLoading || userLocationLoading) {
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
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {locale === 'ar' ? 'المحافظة والمدينة' : 'Governorate & City'}
        </h1>
        <p className="text-muted-foreground mb-6">
          {locale === 'ar'
            ? 'اختر موقعك لعرض الخدمات المتاحة'
            : 'Select your location to see available services'}
        </p>

        {/* Guest Mode Notice */}
        {isGuest && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <User className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">
                {locale === 'ar' ? 'أنت تتصفح كزائر' : "You're browsing as a guest"}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {locale === 'ar'
                  ? 'يمكنك تصفح المتاجر بدون تسجيل. سجّل دخولك عند الطلب.'
                  : 'You can browse stores without signing in. Sign in when you want to order.'}
              </p>
            </div>
          </div>
        )}

        {/* Back to Welcome Page */}
        <button
          onClick={() => router.push(`/${locale}/welcome?force=true`)}
          className="mb-4 w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm font-medium transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          {locale === 'ar' ? 'عرض صفحة الترحيب' : 'View Welcome Page'}
        </button>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Governorate */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPinned className="w-4 h-4 text-muted-foreground" />
                {locale === 'ar' ? 'المحافظة' : 'Governorate'}
              </Label>
              <Select value={governorateId} onValueChange={setGovernorateId}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={locale === 'ar' ? 'اختر المحافظة' : 'Select governorate'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {governorates.map((gov) => (
                    <SelectItem key={gov.id} value={gov.id}>
                      {locale === 'ar' ? gov.name_ar : gov.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            {governorateId && cities.length > 0 && (
              <div className="space-y-2">
                <Label>{locale === 'ar' ? 'المدينة/المركز' : 'City/Center'}</Label>
                <Select value={cityId} onValueChange={setCityId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={locale === 'ar' ? 'اختر المدينة' : 'Select city'} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {locale === 'ar' ? city.name_ar : city.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving || !governorateId} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : locale === 'ar' ? (
                  'حفظ الموقع'
                ) : (
                  'Save Location'
                )}
              </Button>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} p-3 rounded-lg`}
              >
                {message.type === 'success' && <Check className="w-4 h-4" />}
                <span>{message.text}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </CustomerLayout>
  );
}
