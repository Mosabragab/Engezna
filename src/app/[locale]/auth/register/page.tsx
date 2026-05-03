'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { strongPasswordSchema } from '@/lib/validations/common';
import { createClient } from '@/lib/supabase/client';
import { getCachedGovernorates } from '@/lib/cache/cached-queries';
import Link from 'next/link';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
  CheckCircle,
  User,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Cake,
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { guestLocationStorage } from '@/lib/hooks/useGuestLocation';

// ============================================================================
// Types
// ============================================================================

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface City {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string;
  is_active: boolean;
}

// ============================================================================
// Form Schema
// ============================================================================

const registerSchema = z
  .object({
    email: z.string().email('البريد الإلكتروني غير صالح'),
    firstName: z.string().min(2, 'الاسم الأول مطلوب (حرفين على الأقل)'),
    lastName: z.string().min(2, 'اسم العائلة مطلوب (حرفين على الأقل)'),
    phone: z.string().regex(/^01[0-2,5]{1}[0-9]{8}$/, 'رقم هاتف مصري غير صالح'),
    governorateId: z.string().min(1, 'يرجى اختيار المحافظة'),
    cityId: z.string().min(1, 'يرجى اختيار المدينة'),
    birthdate: z
      .string()
      .optional()
      .refine(
        (v) => {
          if (!v) return true;
          const d = new Date(v);
          if (Number.isNaN(d.getTime())) return false;
          const min = new Date('1925-01-01');
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          return d >= min && d <= today;
        },
        { message: 'تاريخ غير صالح' }
      ),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمة المرور غير متطابقة',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================================================
// Google Icon Component
// ============================================================================

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

// ============================================================================
// Main Component
// ============================================================================

export default function RegisterPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const isRTL = locale === 'ar';

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Location data
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      governorateId: '',
      cityId: '',
      birthdate: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedGovernorateId = watch('governorateId');

  // Filter cities based on selected governorate
  const filteredCities = useMemo(() => {
    if (!selectedGovernorateId) return [];
    return cities.filter((city) => city.governorate_id === selectedGovernorateId);
  }, [selectedGovernorateId, cities]);

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      const supabase = createClient();

      const govData = await getCachedGovernorates();
      setGovernorates(govData);

      const { data: cityData } = await supabase
        .from('cities')
        .select('id, name_ar, name_en, governorate_id, is_active')
        .eq('is_active', true)
        .order('name_ar');

      if (cityData) {
        setCities(cityData);
      }

      setLoadingLocations(false);
    }

    fetchLocations();
  }, []);

  // Reset city when governorate changes
  useEffect(() => {
    setValue('cityId', '');
  }, [selectedGovernorateId, setValue]);

  // Handle Google signup
  const handleGoogleSignup = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setIsGoogleLoading(true);
      setError(null);

      try {
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

        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokens.id_token,
          access_token: tokens.access_token,
        });

        if (signInError) {
          setError(signInError.message);
          setIsGoogleLoading(false);
          return;
        }

        if (data.user) {
          // Check if profile exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('governorate_id, phone')
            .eq('id', data.user.id)
            .single();

          if (!profile) {
            // Create profile for new user
            await supabase.from('profiles').insert({
              id: data.user.id,
              email: data.user.email,
              full_name: (data.user.user_metadata?.full_name ||
                data.user.user_metadata?.name ||
                '') as string,
              role: 'customer',
            });
          }

          // Wait for session to be fully persisted before redirecting
          // This ensures cookies are written before navigation
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify session is active
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            console.error('Session not found after Google sign-in');
            setError(locale === 'ar' ? 'فشل في إنشاء الجلسة' : 'Failed to create session');
            setIsGoogleLoading(false);
            return;
          }

          // Check if profile is already complete (returning Google user)
          if (profile?.governorate_id && profile?.phone) {
            window.location.href = redirectTo || `/${locale}`;
          } else {
            const completeProfileUrl = redirectTo
              ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(redirectTo)}`
              : `/${locale}/auth/complete-profile`;
            window.location.href = completeProfileUrl;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setError(locale === 'ar' ? 'فشل التسجيل بـ Google' : 'Google sign-up failed');
      setIsGoogleLoading(false);
    },
  });

  // Handle form submission
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          governorateId: data.governorateId,
          cityId: data.cityId,
          birthdate: data.birthdate || undefined,
          locale,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // The API has two error shapes:
        //   { error: 'localized string' }  — direct returns (auth/profile errors)
        //   { success: false, error: { code, message, errors? } }  — withErrorHandler / zod
        // Surface a real string in both cases so the user gets a useful message
        // (not '[object Object]' or the generic fallback).
        let errorText: string | null = null;
        if (typeof result?.error === 'string') {
          errorText = result.error;
        } else if (result?.error?.message) {
          errorText = result.error.message as string;
        } else if (Array.isArray(result?.error?.errors) && result.error.errors[0]?.message) {
          errorText = result.error.errors[0].message as string;
        }
        setError(errorText || (locale === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'Registration failed'));
        return;
      }

      // Check if this is a test account - auto login
      if (result.isTestAccount) {
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (signInError) {
          console.error('Auto-login error:', signInError);
          setError(
            locale === 'ar'
              ? 'تم إنشاء الحساب. يرجى تسجيل الدخول.'
              : 'Account created. Please sign in.'
          );
          return;
        }

        // Wait for session to persist
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Sync location to localStorage (so home page can read it)
        const selectedGov = governorates.find((g) => g.id === data.governorateId);
        const selectedCity = cities.find((c) => c.id === data.cityId);

        guestLocationStorage.set({
          governorateId: data.governorateId,
          governorateName: selectedGov
            ? { ar: selectedGov.name_ar, en: selectedGov.name_en }
            : null,
          cityId: data.cityId || null,
          cityName: selectedCity ? { ar: selectedCity.name_ar, en: selectedCity.name_en } : null,
        });

        // Redirect to home or specified redirect
        window.location.href = redirectTo || `/${locale}`;
        return;
      }

      // Success - show email sent message for regular accounts
      setRegisteredEmail(data.email);
      setEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Email sent success state
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
        <Link href={`/${locale}`} className="mb-12">
          <EngeznaLogo size="lg" static showPen={false} />
        </Link>

        <div className="w-full max-w-[400px] text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-primary mb-3">
            {locale === 'ar' ? 'تم إنشاء حسابك!' : 'Account Created!'}
          </h1>

          <p className="text-slate-500 mb-2">
            {locale === 'ar' ? 'أرسلنا رابط التأكيد إلى:' : 'We sent a verification link to:'}
          </p>

          <p className="text-[#0F172A] font-medium mb-6" dir="ltr">
            {registeredEmail}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-blue-700 text-sm">
              {locale === 'ar'
                ? '📧 يرجى فتح بريدك الإلكتروني والضغط على رابط التأكيد لتفعيل حسابك'
                : '📧 Please check your email and click the verification link to activate your account'}
            </p>
          </div>

          <p className="text-slate-400 text-sm mb-8">
            {locale === 'ar'
              ? 'لم يصلك الإيميل؟ تفقد مجلد الرسائل غير المرغوب فيها (Spam)'
              : "Didn't receive the email? Check your spam folder"}
          </p>

          <Link href={`/${locale}/auth/login`} className="text-primary font-medium hover:underline">
            {locale === 'ar' ? 'الذهاب لتسجيل الدخول' : 'Go to Login'}
          </Link>
        </div>

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-8">
      {/* Logo */}
      <Link href={`/${locale}`} className="mb-8">
        <EngeznaLogo size="lg" static showPen={false} />
      </Link>

      {/* Content */}
      <div className="w-full max-w-[400px]">
        {/* Welcome Text */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">
            {locale === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}
          </h1>
          <p className="text-slate-500">
            {locale === 'ar' ? 'أدخل بياناتك للتسجيل' : 'Enter your details to sign up'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 text-center">
            {error}
          </div>
        )}

        {/* Google Button */}
        <button
          type="button"
          onClick={() => handleGoogleSignup()}
          disabled={isLoading || isGoogleLoading}
          className="w-full h-[48px] flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-xl text-[#0F172A] font-medium transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] disabled:opacity-50 mb-4"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          ) : (
            <>
              <GoogleIcon />
              <span>{locale === 'ar' ? 'التسجيل عبر Google' : 'Sign up with Google'}</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-slate-400">
              {locale === 'ar' ? 'أو سجّل بالإيميل' : 'or register with email'}
            </span>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email" className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              {...register('email')}
              disabled={isLoading}
              className={`h-[44px] ${errors.email ? 'border-red-300' : ''}`}
              dir="ltr"
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {/* Name Fields Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName" className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary" />
                {locale === 'ar' ? 'الاسم الأول' : 'First Name'}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder={locale === 'ar' ? 'أحمد' : 'Ahmed'}
                {...register('firstName')}
                disabled={isLoading}
                className={`h-[44px] ${errors.firstName ? 'border-red-300' : ''}`}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">{locale === 'ar' ? 'مطلوب' : 'Required'}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="lastName" className="text-sm">
                {locale === 'ar' ? 'اسم العائلة' : 'Last Name'}
                <span className="text-red-500 ms-1">*</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder={locale === 'ar' ? 'محمد' : 'Mohamed'}
                {...register('lastName')}
                disabled={isLoading}
                className={`h-[44px] ${errors.lastName ? 'border-red-300' : ''}`}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">{locale === 'ar' ? 'مطلوب' : 'Required'}</p>
              )}
            </div>
          </div>

          {/* Birthdate (optional) — placed right under the name (personal info group) */}
          <div className="space-y-1">
            <Label htmlFor="birthdate" className="flex items-center gap-2 text-sm">
              <Cake className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'تاريخ الميلاد' : 'Birthdate'}
              <span className="text-slate-400 text-xs">
                ({locale === 'ar' ? 'اختياري' : 'optional'})
              </span>
            </Label>
            <Input
              id="birthdate"
              type="date"
              {...register('birthdate')}
              disabled={isLoading}
              className={`h-[44px] ${errors.birthdate ? 'border-red-300' : ''}`}
              max={new Date().toISOString().slice(0, 10)}
              min="1925-01-01"
              dir="ltr"
            />
            <p className="text-xs text-slate-500">
              {locale === 'ar'
                ? '🎁 احصل على هدية في عيد ميلادك كل سنة'
                : '🎁 Get a gift on your birthday every year'}
            </p>
            {errors.birthdate && (
              <p className="text-xs text-red-500">
                {locale === 'ar' ? 'تاريخ غير صالح' : 'Invalid date'}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="01xxxxxxxxx"
              {...register('phone')}
              disabled={isLoading}
              className={`h-[44px] ${errors.phone ? 'border-red-300' : ''}`}
              dir="ltr"
            />
            {errors.phone && (
              <p className="text-xs text-red-500">
                {locale === 'ar' ? 'رقم هاتف مصري غير صالح' : 'Invalid Egyptian phone number'}
              </p>
            )}
          </div>

          {/* Location Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Governorate */}
            <div className="space-y-1">
              <Label htmlFor="governorateId" className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                {locale === 'ar' ? 'المحافظة' : 'Governorate'}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                disabled={isLoading || loadingLocations}
                value={selectedGovernorateId}
                onValueChange={(value) => setValue('governorateId', value)}
              >
                <SelectTrigger
                  className={`h-[44px] ${errors.governorateId ? 'border-red-300' : ''}`}
                >
                  <SelectValue
                    placeholder={
                      loadingLocations
                        ? locale === 'ar'
                          ? 'جاري التحميل...'
                          : 'Loading...'
                        : locale === 'ar'
                          ? 'اختر المحافظة'
                          : 'Select'
                    }
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
              {errors.governorateId && (
                <p className="text-xs text-red-500">{locale === 'ar' ? 'مطلوب' : 'Required'}</p>
              )}
            </div>

            {/* City */}
            <div className="space-y-1">
              <Label htmlFor="cityId" className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-cyan-500" />
                {locale === 'ar' ? 'المدينة' : 'City'}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                disabled={isLoading || !selectedGovernorateId || filteredCities.length === 0}
                value={watch('cityId')}
                onValueChange={(value) => setValue('cityId', value)}
              >
                <SelectTrigger className={`h-[44px] ${errors.cityId ? 'border-red-300' : ''}`}>
                  <SelectValue
                    placeholder={
                      !selectedGovernorateId
                        ? locale === 'ar'
                          ? 'اختر المحافظة أولاً'
                          : 'Select governorate'
                        : locale === 'ar'
                          ? 'اختر المدينة'
                          : 'Select'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredCities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {locale === 'ar' ? city.name_ar : city.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cityId && (
                <p className="text-xs text-red-500">{locale === 'ar' ? 'مطلوب' : 'Required'}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label htmlFor="password" className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'كلمة المرور' : 'Password'}
              <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={locale === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}
                {...register('password')}
                disabled={isLoading}
                className={`h-[44px] pe-10 ${errors.password ? 'border-red-300' : ''} ${isRTL ? 'text-right' : 'text-left'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={locale === 'ar' ? 'أعد كتابة كلمة المرور' : 'Re-enter password'}
                {...register('confirmPassword')}
                disabled={isLoading}
                className={`h-[44px] pe-10 ${errors.confirmPassword ? 'border-red-300' : ''} ${isRTL ? 'text-right' : 'text-left'}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-[48px] bg-primary hover:bg-primary/90 text-white font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {locale === 'ar' ? 'جاري التسجيل...' : 'Registering...'}
              </>
            ) : locale === 'ar' ? (
              'إنشاء الحساب'
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Terms Notice */}
        <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed">
          {locale === 'ar' ? (
            <>
              بالتسجيل، أنت توافق على{' '}
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
              By signing up, you agree to our{' '}
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

        {/* Divider */}
        <div className="my-6 border-t border-slate-100"></div>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-slate-500">
            {locale === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
            <Link
              href={
                redirectTo
                  ? `/${locale}/auth/login?redirect=${encodeURIComponent(redirectTo)}`
                  : `/${locale}/auth/login`
              }
              className="text-primary font-medium hover:underline"
            >
              {locale === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>

      {/* Back to Home */}
      <Link
        href={`/${locale}`}
        className="mt-8 inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm"
      >
        {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
      </Link>
    </div>
  );
}
