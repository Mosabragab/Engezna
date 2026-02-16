'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { guestLocationStorage } from '@/lib/hooks/useGuestLocation';

// Safety timeout: if processing takes longer than this, show error with retry
const PROCESSING_TIMEOUT_MS = 30000;

export default function AuthCallbackPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  // Navigate using window.location.href to ensure full page reload
  // This guarantees auth cookies are sent to server middleware on the next request
  // (router.push() does client-side navigation which can miss newly-set cookies)
  const navigateTo = (url: string) => {
    window.location.href = url;
  };

  useEffect(() => {
    // Prevent double execution (using ref to avoid dependency array issues)
    if (processingRef.current) return;
    processingRef.current = true;

    // Safety timeout: if processing takes too long, show an error
    const timeoutId = setTimeout(() => {
      setError(
        locale === 'ar'
          ? 'استغرقت العملية وقتاً طويلاً. يرجى المحاولة مرة أخرى.'
          : 'Processing took too long. Please try again.'
      );
    }, PROCESSING_TIMEOUT_MS);

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const redirectParam = searchParams.get('redirect');
      const next = searchParams.get('next') ?? redirectParam ?? '/';

      const supabase = createClient();

      // Handle error from Supabase (e.g., expired link)
      if (errorParam) {
        console.error('Auth callback error:', errorParam, errorDescription);
        const errorMessage = errorParam === 'access_denied' ? 'link_expired' : errorParam;
        navigateTo(
          `/${locale}/auth/login?error=${errorMessage}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`
        );
        return;
      }

      // First, check if user is already logged in (session might be set automatically)
      let {
        data: { user },
      } = await supabase.auth.getUser();

      // Handle token_hash verification (from email verification link)
      let isSignupVerification = false;
      if (!user && tokenHash && type) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'recovery' | 'email',
        });

        if (verifyError) {
          console.error('Auth callback: Token verification error:', verifyError.message);
          setError(
            locale === 'ar'
              ? 'فشل التحقق من الرابط. قد يكون منتهي الصلاحية.'
              : 'Failed to verify link. It may have expired.'
          );
          setTimeout(() => {
            navigateTo(
              `/${locale}/auth/login?error=verification_failed${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`
            );
          }, 3000);
          return;
        }
        user = data.user;
        isSignupVerification = type === 'signup';

        // For password recovery, redirect directly to reset-password page
        // The session is already established by verifyOtp, so the reset-password
        // page will detect the valid session and show the password form
        if (type === 'recovery' && user) {
          navigateTo(`/${locale}/auth/reset-password`);
          return;
        }
      }

      // If no user and we have a code, try to exchange it
      if (!user && code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Auth callback: Code exchange error:', exchangeError.message);
          // Try getting user again - sometimes session is set but exchange fails
          const {
            data: { user: retryUser },
          } = await supabase.auth.getUser();
          if (retryUser) {
            user = retryUser;
          } else {
            setError(locale === 'ar' ? 'فشل التحقق من الرابط' : 'Failed to verify link');
            setTimeout(() => {
              navigateTo(
                `/${locale}/auth/login?error=exchange_failed${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`
              );
            }, 2000);
            return;
          }
        } else {
          user = data.user;
        }
      }

      // If still no user, redirect to login
      if (!user) {
        console.error('Auth callback: No user found');
        navigateTo(`/${locale}/auth/login?error=no_user`);
        return;
      }

      // Check if user profile exists and is complete (with location names)
      const { data: profile } = await supabase
        .from('profiles')
        .select(
          `
          governorate_id,
          phone,
          role,
          city_id,
          governorates:governorate_id (name_ar, name_en),
          cities:city_id (name_ar, name_en)
        `
        )
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create it
      if (!profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          role: 'customer',
        });

        // Redirect to complete profile
        const completeProfileUrl =
          next !== '/'
            ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(next)}`
            : `/${locale}/auth/complete-profile`;
        navigateTo(completeProfileUrl);
        return;
      }

      // Check if profile is incomplete
      if (!profile.governorate_id || !profile.phone) {
        // For providers, redirect to provider complete-profile
        if (profile.role === 'provider_owner') {
          navigateTo(`/${locale}/provider/complete-profile`);
          return;
        }
        // For customers, redirect to customer complete-profile
        const completeProfileUrl =
          next !== '/'
            ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(next)}`
            : `/${locale}/auth/complete-profile`;
        navigateTo(completeProfileUrl);
        return;
      }

      // Send welcome email if this is a signup verification (non-blocking)
      if (isSignupVerification && user) {
        try {
          await fetch('/api/auth/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });
        } catch (emailError) {
          // Don't block the flow if welcome email fails
          console.error('Failed to send welcome email:', emailError);
        }
      }

      // Sync location to localStorage (so home page can read it)
      try {
        const gov = profile.governorates as unknown as {
          name_ar: string;
          name_en: string;
        } | null;
        const city = profile.cities as unknown as { name_ar: string; name_en: string } | null;

        guestLocationStorage.set({
          governorateId: profile.governorate_id,
          governorateName: gov ? { ar: gov.name_ar, en: gov.name_en } : null,
          cityId: profile.city_id || null,
          cityName: city ? { ar: city.name_ar, en: city.name_en } : null,
        });
      } catch (locationError) {
        // Don't block the flow if localStorage sync fails
        console.error('Failed to sync guest location:', locationError);
      }

      // Profile complete - redirect based on role
      if (profile.role === 'provider_owner') {
        // Check if provider has completed their store setup
        const { data: provider } = await supabase
          .from('providers')
          .select('status')
          .eq('owner_id', user.id)
          .single();

        if (provider?.status === 'incomplete') {
          navigateTo(`/${locale}/provider/complete-profile`);
          return;
        }
        navigateTo(`/${locale}/provider`);
        return;
      }

      // For customers, redirect to destination
      const redirectUrl = next.startsWith('/')
        ? next
        : `/${locale}${next.startsWith('/') ? '' : '/'}${next}`;
      navigateTo(redirectUrl);
    };

    handleCallback()
      .catch((err) => {
        console.error('Auth callback: Unexpected error:', err);
        setError(
          locale === 'ar'
            ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
            : 'An unexpected error occurred. Please try again.'
        );
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  }, [searchParams, locale]);

  const handleRetry = () => {
    // Reload the page to retry the callback
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      {/* Logo */}
      <div className="mb-8">
        <EngeznaLogo size="lg" static showPen={false} />
      </div>

      {/* Loading or Error State */}
      {error ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#009DE0] rounded-lg hover:bg-[#0086c0] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {locale === 'ar' ? 'حاول مرة أخرى' : 'Try Again'}
          </button>
          <p className="text-slate-400 text-sm mt-3">
            {locale === 'ar' ? 'جاري التحويل...' : 'Redirecting...'}
          </p>
        </div>
      ) : (
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#009DE0] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">
            {locale === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing you in...'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            {locale === 'ar' ? 'يرجى الانتظار' : 'Please wait'}
          </p>
        </div>
      )}
    </div>
  );
}
