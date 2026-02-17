'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { ArrowLeft, ArrowRight, Loader2, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const isRTL = locale === 'ar';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user has a valid recovery session
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();

      // Check for hash fragment (Supabase sends recovery link with hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'recovery') {
        // Set the session from the recovery token
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });

        if (!error) {
          setIsValidSession(true);
        } else {
          setError(locale === 'ar' ? 'رابط غير صالح أو منتهي الصلاحية' : 'Invalid or expired link');
        }
      } else {
        // Check if there's an existing authenticated user (set by callback page via verifyOtp)
        // Use getUser() instead of getSession() to verify with the server
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (user && !userError) {
          setIsValidSession(true);
        } else {
          // Fallback: also check getSession() in case cookies are still being written
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            setIsValidSession(true);
          } else {
            setError(
              locale === 'ar' ? 'رابط غير صالح أو منتهي الصلاحية' : 'Invalid or expired link'
            );
          }
        }
      }

      setCheckingSession(false);
    }

    checkSession();
  }, [locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError(
        locale === 'ar'
          ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
          : 'Password must be at least 8 characters'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(locale === 'ar' ? 'كلمة المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('Update password error:', updateError);
        setError(updateError.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
        <Link href={`/${locale}`} className="mb-12">
          <EngeznaLogo size="lg" static showPen={false} />
        </Link>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-slate-500">{locale === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</p>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
        <Link href={`/${locale}`} className="mb-12">
          <EngeznaLogo size="lg" static showPen={false} />
        </Link>

        <div className="w-full max-w-[340px] text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-primary mb-3">
            {locale === 'ar' ? 'تم تغيير كلمة المرور!' : 'Password Changed!'}
          </h1>

          <p className="text-slate-500 mb-8">
            {locale === 'ar'
              ? 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.'
              : 'Your password has been changed successfully. You can now log in.'}
          </p>

          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex items-center justify-center w-full h-[52px] bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all"
          >
            {locale === 'ar' ? 'تسجيل الدخول' : 'Go to Login'}
          </Link>
        </div>
      </div>
    );
  }

  // Invalid session error state
  if (!isValidSession && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
        <Link href={`/${locale}`} className="mb-12">
          <EngeznaLogo size="lg" static showPen={false} />
        </Link>

        <div className="w-full max-w-[340px] text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-red-600 mb-3">
            {locale === 'ar' ? 'رابط غير صالح' : 'Invalid Link'}
          </h1>

          <p className="text-slate-500 mb-8">
            {locale === 'ar'
              ? 'هذا الرابط غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد.'
              : 'This link is invalid or has expired. Please request a new one.'}
          </p>

          <Link
            href={`/${locale}/auth/forgot-password`}
            className="inline-flex items-center justify-center w-full h-[52px] bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all"
          >
            {locale === 'ar' ? 'طلب رابط جديد' : 'Request New Link'}
          </Link>
        </div>

        <Link
          href={`/${locale}/auth/login`}
          className="mt-12 inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {locale === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
      {/* Logo */}
      <Link href={`/${locale}`} className="mb-12">
        <EngeznaLogo size="lg" static showPen={false} />
      </Link>

      {/* Content */}
      <div className="w-full max-w-[340px]">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">
            {locale === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </h1>
          <p className="text-slate-500">
            {locale === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter your new password'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <Lock className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={locale === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}
                disabled={isLoading}
                className="w-full h-[52px] px-4 pe-12 bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'} text-slate-400 hover:text-slate-600`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <Lock className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={locale === 'ar' ? 'أعد كتابة كلمة المرور' : 'Re-enter password'}
                disabled={isLoading}
                className="w-full h-[52px] px-4 pe-12 bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'} text-slate-400 hover:text-slate-600`}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full h-[52px] flex items-center justify-center gap-3 bg-primary border border-primary rounded-xl text-white font-medium transition-all hover:bg-primary/90 hover:border-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>{locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
            )}
          </button>
        </form>
      </div>

      {/* Back to Login */}
      <Link
        href={`/${locale}/auth/login`}
        className="mt-12 inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm"
      >
        {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {locale === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
      </Link>
    </div>
  );
}
