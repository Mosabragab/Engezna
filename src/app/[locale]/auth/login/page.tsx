'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { guestLocationStorage } from '@/lib/hooks/useGuestLocation'

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

        // Customer - redirect to home page
        setTimeout(() => {
          window.location.href = `/${locale}`
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
              disabled={isLoading}
            >
              {isLoading ? t('loggingIn') : t('loginButton')}
            </Button>


          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t('noAccount')}{' '}
            <Link
              href={`/${locale}/auth/signup`}
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
