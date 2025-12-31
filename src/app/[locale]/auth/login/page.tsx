'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
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

// Form validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const t = useTranslations('auth.login')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

        if (data.user) {
          // Check if profile exists, if not create one
          const { data: profile } = await supabase
            .from('profiles')
            .select('governorate_id, phone, role')
            .eq('id', data.user.id)
            .single()

          if (!profile) {
            // Create profile for new Google user
            await supabase.from('profiles').insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
              role: 'customer',
            })
          }

          // Check if profile is complete
          if (!profile?.governorate_id || !profile?.phone) {
            const completeProfileUrl = redirectTo
              ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(redirectTo)}`
              : `/${locale}/auth/complete-profile`
            window.location.href = completeProfileUrl
            return
          }

          // Profile is complete - redirect
          window.location.href = redirectTo || `/${locale}`
        }
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email.toLowerCase().trim(),
        password: data.password,
      })

      if (authError) {
        // Provide more specific error messages
        if (authError.message.includes('Invalid login credentials')) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة / Invalid email or password')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('يرجى تأكيد بريدك الإلكتروني أولاً / Please confirm your email first')
        } else {
          setError(authError.message)
        }
        return
      }

      if (authData.user) {
        // Fetch user profile to get role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', authData.user.id)
          .single()

        // Check if user is a customer - this login page is for customers only
        if (profile?.role && profile.role !== 'customer') {
          // Sign out non-customer users
          await supabase.auth.signOut()

          // Show appropriate message based on role
          if (profile.role === 'admin') {
            setError(
              locale === 'ar'
                ? 'هذه الصفحة للعملاء فقط. يرجى استخدام صفحة تسجيل دخول المشرفين'
                : 'This page is for customers only. Please use the admin login page'
            )
          } else if (profile.role === 'provider_owner' || profile.role === 'provider_staff') {
            setError(
              locale === 'ar'
                ? 'هذه الصفحة للعملاء فقط. يرجى استخدام صفحة تسجيل دخول مقدمي الخدمة'
                : 'This page is for customers only. Please use the provider login page'
            )
          }
          return
        }

        // Sync guest location to profile if exists
        const guestLocation = guestLocationStorage.get()
        if (guestLocation?.governorateId) {
          // Check if user has no location set
          const hasLocation = profile?.role === 'customer' // Will refetch below

          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('governorate_id, city_id')
            .eq('id', authData.user.id)
            .single()

          // Only sync if user doesn't have a location set
          if (!currentProfile?.governorate_id) {
            await supabase
              .from('profiles')
              .update({
                governorate_id: guestLocation.governorateId,
                city_id: guestLocation.cityId || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', authData.user.id)
          }

          // Clear guest location after sync
          guestLocationStorage.clear()
        }

        // Check if profile is complete (has governorate and phone)
        const { data: fullProfile } = await supabase
          .from('profiles')
          .select('governorate_id, phone')
          .eq('id', authData.user.id)
          .single()

        // If profile is incomplete, redirect to complete-profile page
        if (!fullProfile?.governorate_id || !fullProfile?.phone) {
          const completeProfileUrl = redirectTo
            ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(redirectTo)}`
            : `/${locale}/auth/complete-profile`
          window.location.href = completeProfileUrl
          return
        }

        // Customer with complete profile - redirect to specified URL or home page
        setTimeout(() => {
          if (redirectTo) {
            window.location.href = redirectTo
          } else {
            window.location.href = `/${locale}`
          }
        }, 500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const isRTL = locale === 'ar'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      {/* Logo - Links back to home */}
      <div className="mb-6">
        <Link href={`/${locale}`} className="inline-block">
          <EngeznaLogo size="lg" static showPen={false} />
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                {...register('email')}
                disabled={isLoading}
                className={errors.email ? 'border-destructive' : ''}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                {...register('password')}
                disabled={isLoading}
                className={errors.password ? 'border-destructive' : ''}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link
                href={`/${locale}/auth/forgot-password`}
                className="text-sm text-primary hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? t('loggingIn') : t('loginButton')}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {locale === 'ar' ? 'أو' : 'OR'}
              </span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleGoogleLogin()}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 me-2 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span className="ms-2">
              {locale === 'ar' ? 'إستمرار عبر جوجل' : 'Continue with Google'}
            </span>
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t('noAccount')}{' '}
            <Link
              href={redirectTo ? `/${locale}/auth/signup?redirect=${encodeURIComponent(redirectTo)}` : `/${locale}/auth/signup`}
              className="text-primary hover:underline font-medium"
            >
              {t('signupLink')}
            </Link>
          </div>

          {/* Links for providers and admins */}
          <div className="w-full pt-4 border-t border-border">
            <p className="text-xs text-center text-muted-foreground mb-2">
              {locale === 'ar' ? 'لست عميلاً؟' : 'Not a customer?'}
            </p>
            <div className="flex justify-center gap-4 text-xs">
              <Link
                href={`/${locale}/provider/login`}
                className="text-[#009DE0] hover:underline"
              >
                {locale === 'ar' ? 'دخول مقدمي الخدمة' : 'Provider Login'}
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link
                href={`/${locale}/admin/login`}
                className="text-slate-500 hover:underline"
              >
                {locale === 'ar' ? 'دخول المشرفين' : 'Admin Login'}
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Back to Home Link */}
      <Link
        href={`/${locale}`}
        className="mt-6 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {locale === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
      </Link>
    </div>
  )
}
