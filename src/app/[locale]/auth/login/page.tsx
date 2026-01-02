'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { ArrowLeft, ArrowRight, Loader2, Mail, CheckCircle } from 'lucide-react'
import { guestLocationStorage } from '@/lib/hooks/useGuestLocation'
import { useGoogleLogin } from '@react-oauth/google'

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
)

export default function LoginPage() {
  const locale = useLocale()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')

  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Email Magic Link states
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Handle Google login with authorization code flow
  const handleGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setIsGoogleLoading(true)
      setError(null)

      try {
        // Exchange auth code for ID token via our API
        const tokenResponse = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
        })

        const tokens = await tokenResponse.json()

        if (!tokenResponse.ok || !tokens.id_token) {
          setError(locale === 'ar' ? 'فشل في الحصول على بيانات Google' : 'Failed to get Google credentials')
          setIsGoogleLoading(false)
          return
        }

        const supabase = createClient()

        // Sign in to Supabase with Google ID token
        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokens.id_token,
        })

        if (signInError) {
          console.error('Supabase signInWithIdToken error:', signInError)
          setError(signInError.message)
          setIsGoogleLoading(false)
          return
        }

        await handlePostLogin(supabase, data.user)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setIsGoogleLoading(false)
      }
    },
    onError: () => {
      setError(locale === 'ar' ? 'فشل تسجيل الدخول بـ Google' : 'Google sign-in failed')
      setIsGoogleLoading(false)
    },
  })

  // Handle Email Magic Link
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setError(locale === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email')
      return
    }

    setIsEmailLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Build the redirect URL for magic link
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const redirectUrl = redirectTo
        ? `${siteUrl}/${locale}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
        : `${siteUrl}/${locale}/auth/callback`

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (otpError) {
        console.error('OTP error:', otpError)
        setError(otpError.message)
        setIsEmailLoading(false)
        return
      }

      // Success - show confirmation message
      setEmailSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsEmailLoading(false)
    }
  }

  // Common post-login handler
  const handlePostLogin = async (supabase: ReturnType<typeof createClient>, user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
    if (!user) return

    // Check if profile exists, if not create one
    const { data: profile } = await supabase
      .from('profiles')
      .select('governorate_id, phone, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Create profile for new user
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: (user.user_metadata?.full_name || user.user_metadata?.name || '') as string,
        role: 'customer',
      })
    }

    // Sync guest location if exists
    const guestLocation = guestLocationStorage.get()
    if (guestLocation?.governorateId && !profile?.governorate_id) {
      await supabase
        .from('profiles')
        .update({
          governorate_id: guestLocation.governorateId,
          city_id: guestLocation.cityId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      guestLocationStorage.clear()
    }

    // Check if profile is complete
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('governorate_id, phone')
      .eq('id', user.id)
      .single()

    if (!fullProfile?.governorate_id || !fullProfile?.phone) {
      const completeProfileUrl = redirectTo
        ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(redirectTo)}`
        : `/${locale}/auth/complete-profile`
      window.location.href = completeProfileUrl
      return
    }

    // Profile is complete - redirect
    window.location.href = redirectTo || `/${locale}`
  }

  const isRTL = locale === 'ar'
  const isLoading = isGoogleLoading || isEmailLoading

  // Email sent success state
  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
        {/* Logo */}
        <Link href={`/${locale}`} className="mb-12">
          <EngeznaLogo size="lg" static showPen={false} />
        </Link>

        {/* Success Message */}
        <div className="w-full max-w-[340px] text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-[#009DE0] mb-3">
            {locale === 'ar' ? 'تفقد بريدك الإلكتروني' : 'Check Your Email'}
          </h1>

          <p className="text-slate-500 mb-2">
            {locale === 'ar'
              ? 'لقد أرسلنا رابط الدخول إلى:'
              : 'We sent a login link to:'}
          </p>

          <p className="text-[#0F172A] font-medium mb-6" dir="ltr">
            {email}
          </p>

          <p className="text-slate-400 text-sm mb-8">
            {locale === 'ar'
              ? 'اضغط على الرابط في البريد للدخول إلى حسابك'
              : 'Click the link in the email to sign in to your account'}
          </p>

          <button
            type="button"
            onClick={() => {
              setEmailSent(false)
              setEmail('')
              setShowEmailInput(false)
            }}
            className="text-[#009DE0] font-medium hover:underline"
          >
            {locale === 'ar' ? 'استخدام بريد آخر' : 'Use a different email'}
          </button>
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
    )
  }

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
          <h1 className="text-2xl font-bold text-[#009DE0] mb-2">
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

          {/* Email Button / Input */}
          {!showEmailInput ? (
            <button
              type="button"
              onClick={() => setShowEmailInput(true)}
              disabled={isLoading}
              className="w-full h-[52px] flex items-center justify-center gap-3 bg-[#009DE0] border border-[#009DE0] rounded-xl text-white font-medium transition-all hover:bg-[#0080b8] hover:border-[#0080b8] active:scale-[0.98] disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              <span>{locale === 'ar' ? 'الدخول عبر البريد' : 'Continue with Email'}</span>
            </button>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={locale === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                disabled={isEmailLoading}
                className="w-full h-[52px] px-4 bg-white border border-slate-300 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#009DE0] focus:ring-1 focus:ring-[#009DE0] transition-all disabled:opacity-50"
                dir="ltr"
                autoFocus
              />
              <button
                type="submit"
                disabled={isEmailLoading || !email}
                className="w-full h-[52px] flex items-center justify-center gap-3 bg-[#009DE0] border border-[#009DE0] rounded-xl text-white font-medium transition-all hover:bg-[#0080b8] hover:border-[#0080b8] active:scale-[0.98] disabled:opacity-50"
              >
                {isEmailLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>{locale === 'ar' ? 'إرسال رابط الدخول' : 'Send Login Link'}</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Terms Notice */}
        <p className="text-xs text-slate-400 text-center mt-8 leading-relaxed">
          {locale === 'ar' ? (
            <>
              بالمتابعة، أنت توافق على{' '}
              <Link href={`/${locale}/terms`} className="text-[#009DE0] hover:underline">
                الشروط والأحكام
              </Link>{' '}
              و{' '}
              <Link href={`/${locale}/privacy`} className="text-[#009DE0] hover:underline">
                سياسة الخصوصية
              </Link>
            </>
          ) : (
            <>
              By continuing, you agree to our{' '}
              <Link href={`/${locale}/terms`} className="text-[#009DE0] hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href={`/${locale}/privacy`} className="text-[#009DE0] hover:underline">
                Privacy Policy
              </Link>
            </>
          )}
        </p>

        {/* Divider */}
        <div className="my-8 border-t border-slate-100"></div>

        {/* Provider/Admin Links */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-3">
            {locale === 'ar' ? 'لست عميلاً؟' : 'Not a customer?'}
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <Link
              href={`/${locale}/provider/login`}
              className="text-[#009DE0] font-medium hover:underline"
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
  )
}
