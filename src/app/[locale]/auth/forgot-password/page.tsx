'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { ArrowLeft, ArrowRight, Loader2, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError(locale === 'ar' ? 'يرجى إدخال إيميل صحيح' : 'Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/${locale}/auth/reset-password`,
      });

      if (resetError) {
        console.error('Reset password error:', resetError);
        setError(resetError.message);
        return;
      }

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

        <div className="w-full max-w-[340px] text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-primary mb-3">
            {locale === 'ar' ? 'تفقد الإيميل' : 'Check Your Email'}
          </h1>

          <p className="text-slate-500 mb-2">
            {locale === 'ar'
              ? 'أرسلنا رابط استعادة كلمة المرور إلى:'
              : 'We sent a password reset link to:'}
          </p>

          <p className="text-[#0F172A] font-medium mb-6" dir="ltr">
            {email}
          </p>

          <p className="text-slate-400 text-sm mb-8">
            {locale === 'ar'
              ? 'اضغط على الرابط في الإيميل لإعادة تعيين كلمة المرور'
              : 'Click the link in the email to reset your password'}
          </p>

          <button
            type="button"
            onClick={() => {
              setEmailSent(false);
              setEmail('');
            }}
            className="text-primary font-medium hover:underline"
          >
            {locale === 'ar' ? 'استخدام إيميل آخر' : 'Use a different email'}
          </button>
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
            {locale === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
          </h1>
          <p className="text-slate-500">
            {locale === 'ar'
              ? 'أدخل إيميلك وسنرسل لك رابط استعادة كلمة المرور'
              : 'Enter your email and we will send you a reset link'}
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
          {/* Email Input */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <Mail className="w-4 h-4 text-primary" />
              {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={locale === 'ar' ? 'أدخل الإيميل' : 'Enter your email'}
              disabled={isLoading}
              className="w-full h-[52px] px-4 bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
              dir="ltr"
              autoFocus
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full h-[52px] flex items-center justify-center gap-3 bg-primary border border-primary rounded-xl text-white font-medium transition-all hover:bg-primary/90 hover:border-[primary/90] active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>{locale === 'ar' ? 'إرسال رابط الاستعادة' : 'Send Reset Link'}</span>
            )}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="text-center mt-8">
          <Link href={`/${locale}/auth/login`} className="text-primary font-medium hover:underline">
            {locale === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
          </Link>
        </div>
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
