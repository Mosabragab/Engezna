'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { ArrowLeft, ArrowRight, Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { guestLocationStorage } from '@/lib/hooks/useGuestLocation';
import { useGoogleLogin } from '@react-oauth/google';

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Error messages mapping
const getErrorMessage = (errorCode: string | null, locale: string): string | null => {
  if (!errorCode) return null;

  const messages: Record<string, { ar: string; en: string }> = {
    link_expired: {
      ar: 'انتهت صلاحية الرابط. يرجى طلب رابط جديد.',
      en: 'The link has expired. Please request a new one.',
    },
    exchange_failed: {
      ar: 'فشل التحقق من الرابط. يرجى المحاولة مرة أخرى.',
      en: 'Failed to verify the link. Please try again.',
    },
    no_code: {
      ar: 'رابط غير صالح. يرجى طلب رابط جديد.',
      en: 'Invalid link. Please request a new one.',
    },
    no_user: {
      ar: 'فشل في إنشاء الجلسة. يرجى المحاولة مرة أخرى.',
      en: 'Failed to create session. Please try again.',
    },
    access_denied: {
      ar: 'تم رفض الوصول. يرجى المحاولة مرة أخرى.',
      en: 'Access denied. Please try again.',
    },
    invalid_credentials: {
      ar: 'الإيميل أو كلمة المرور غير صحيحة',
      en: 'Invalid email or password',
    },
  };

  const message = messages[errorCode];
  return message ? (locale === 'ar' ? message.ar : message.en) : null;
};

export default function LoginPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const urlError = searchParams.get('error');

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => getErrorMessage(urlError, locale));

  // Email + Password states
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle Google login with authorization code flow
  const handleGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setIsGoogleLoading(true);
      setError(null);

      try {
        // Exchange auth code for ID token via our API
        const tokenResponse = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok || !tokens.id_token) {
          console.error('Google token exchange failed:', tokens.error || tokens);
          setError(
            locale === 'ar' ? 'فشل في الحصول على بيانات Google' : 'Failed to get Google credentials'
          );
          setIsGoogleLoading(false);
          return;
        }

        const supabase = createClient();

        // Sign in to Supabase with Google ID token
        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokens.id_token,
          access_token: tokens.access_token,
        });

        if (signInError) {
          console.error('Supabase signInWithIdToken error:', signInError);
          setError(signInError.message);
          setIsGoogleLoading(false);
          return;
        }

        await handlePostLogin(supabase, data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setError(locale === 'ar' ? 'فشل تسجيل الدخول بـ Google' : 'Google sign-in failed');
      setIsGoogleLoading(false);
    },
  });

  // Handle Email + Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError(locale === 'ar' ? 'يرجى إدخال إيميل صحيح' : 'Please enter a valid email');
      return;
    }

    if (!password || password.length < 8) {
      setError(
        locale === 'ar'
          ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
          : 'Password must be at least 8 characters'
      );
      return;
    }

    setIsEmailLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          setError(
            locale === 'ar' ? 'الإيميل أو كلمة المرور غير صحيحة' : 'Invalid email or password'
          );
        } else if (signInError.message.includes('Email not confirmed')) {
          setError(
            locale === 'ar'
              ? 'يرجى تأكيد الإيميل أولاً. تحقق من بريدك الإلكتروني'
              : 'Please confirm your email first. Check your inbox'
          );
        } else {
          setError(signInError.message);
        }
        setIsEmailLoading(false);
        return;
      }

      await handlePostLogin(supabase, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Common post-login handler
  const handlePostLogin = async (
    supabase: ReturnType<typeof createClient>,
    user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null
  ) => {
    if (!user) return;

    // Check if profile exists, if not create one
    const { data: profile } = await supabase
      .from('profiles')
      .select('governorate_id, phone, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      // Create profile for new user
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: (user.user_metadata?.full_name || user.user_metadata?.name || '') as string,
        role: 'customer',
      });
    }

    // Sync guest location if exists
    const guestLocation = guestLocationStorage.get();
    if (guestLocation?.governorateId && !profile?.governorate_id) {
      await supabase
        .from('profiles')
        .update({
          governorate_id: guestLocation.governorateId,
          city_id: guestLocation.cityId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      guestLocationStorage.clear();
    }

    // Wait for session to be fully persisted before redirecting
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify session is active
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error('Session not found after login');
      setError(
        locale === 'ar'
          ? 'فشل في إنشاء الجلسة. حاول مرة أخرى.'
          : 'Failed to create session. Please try again.'
      );
      return;
    }

    // Check if profile is complete (with location names for localStorage)
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select(
        `
        governorate_id,
        phone,
        city_id,
        governorates:governorate_id (name_ar, name_en),
        cities:city_id (name_ar, name_en)
      `
      )
      .eq('id', user.id)
      .single();

    if (!fullProfile?.governorate_id || !fullProfile?.phone) {
      const completeProfileUrl = redirectTo
        ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(redirectTo)}`
        : `/${locale}/auth/complete-profile`;
      window.location.href = completeProfileUrl;
      return;
    }

    // Sync user location to localStorage (so home page can read it)
    const gov = fullProfile.governorates as unknown as { name_ar: string; name_en: string } | null;
    const city = fullProfile.cities as unknown as { name_ar: string; name_en: string } | null;

    guestLocationStorage.set({
      governorateId: fullProfile.governorate_id,
      governorateName: gov ? { ar: gov.name_ar, en: gov.name_en } : null,
      cityId: fullProfile.city_id || null,
      cityName: city ? { ar: city.name_ar, en: city.name_en } : null,
    });

    // Profile is complete - redirect
    window.location.href = redirectTo || `/${locale}`;
  };

  const isRTL = locale === 'ar';
  const isLoading = isGoogleLoading || isEmailLoading;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
      {/* Logo */}
      <Link href={`/${locale}`} className="mb-12">
        <EngeznaLogo size="lg" static showPen={false} />
      </Link>

      {/* Content */}
      <div className="w-full max-w-[340px]">
        {/* Welcome Text */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-primary mb-2">
            {locale === 'ar' ? 'أهلاً بك في إنجزنا' : 'Welcome to Engezna'}
          </h1>
          <p className="text-slate-500">
            {locale === 'ar' ? 'سجّل دخولك للمتابعة' : 'Sign in to continue'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {/* Login Buttons */}
        <div className="space-y-3">
          {/* Google Button */}
          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            disabled={isLoading}
            className="w-full h-[52px] flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-xl text-[#0F172A] font-medium transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            ) : (
              <>
                <GoogleIcon />
                <span>{locale === 'ar' ? 'المتابعة بحساب Google' : 'Continue with Google'}</span>
              </>
            )}
          </button>

          {/* Email Button / Form */}
          {!showEmailForm ? (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              disabled={isLoading}
              className="w-full h-[52px] flex items-center justify-center gap-3 bg-primary border border-primary rounded-xl text-white font-medium transition-all hover:bg-primary/90 hover:border-primary/90 active:scale-[0.98] disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              <span>{locale === 'ar' ? 'الدخول عبر الإيميل' : 'Continue with Email'}</span>
            </button>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              {/* Email Input */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={locale === 'ar' ? 'أدخل الإيميل' : 'Enter your email'}
                disabled={isEmailLoading}
                className={`w-full h-[52px] px-4 bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 ${isRTL ? 'text-right' : 'text-left'}`}
                autoFocus
              />

              {/* Password Input */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={locale === 'ar' ? 'كلمة المرور' : 'Password'}
                  disabled={isEmailLoading}
                  className={`w-full h-[52px] px-4 pe-12 bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 ${isRTL ? 'text-right' : 'text-left'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'} text-slate-400 hover:text-slate-600`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="text-end">
                <Link
                  href={`/${locale}/auth/forgot-password`}
                  className="text-sm text-primary hover:underline"
                >
                  {locale === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isEmailLoading || !email || !password}
                className="w-full h-[52px] flex items-center justify-center gap-3 bg-primary border border-primary rounded-xl text-white font-medium transition-all hover:bg-primary/90 hover:border-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                {isEmailLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>{locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Create Account Link */}
        <div className="text-center mt-8">
          <p className="text-slate-500">
            {locale === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
            <Link
              href={
                redirectTo
                  ? `/${locale}/auth/register?redirect=${encodeURIComponent(redirectTo)}`
                  : `/${locale}/auth/register`
              }
              className="text-primary font-medium hover:underline"
            >
              {locale === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}
            </Link>
          </p>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-slate-100"></div>

        {/* Provider/Admin Links */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-3">
            {locale === 'ar' ? 'لست عميلاً؟' : 'Not a customer?'}
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <Link
              href={`/${locale}/provider/login`}
              className="text-primary font-medium hover:underline"
            >
              {locale === 'ar' ? 'مقدمي الخدمة' : 'Providers'}
            </Link>
            <Link
              href={`/${locale}/admin/login`}
              className="text-slate-500 font-medium hover:underline"
            >
              {locale === 'ar' ? 'المشرفين' : 'Admins'}
            </Link>
          </div>
        </div>

        {/* Terms Notice */}
        <p className="text-xs text-slate-400 text-center mt-8 leading-relaxed">
          {locale === 'ar' ? (
            <>
              بالمتابعة، أنت توافق على{' '}
              <Link href={`/${locale}/terms`} className="text-primary hover:underline">
                الشروط والأحكام
              </Link>{' '}
              و{' '}
              <Link href={`/${locale}/privacy`} className="text-primary hover:underline">
                سياسة الخصوصية
              </Link>
            </>
          ) : (
            <>
              By continuing, you agree to our{' '}
              <Link href={`/${locale}/terms`} className="text-primary hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href={`/${locale}/privacy`} className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Back to Home */}
      <Link
        href={`/${locale}`}
        className="mt-12 inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm"
      >
        {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
      </Link>
    </div>
  );
}
