'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import {
  Store,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  LogIn,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'

// Form validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const dynamic = 'force-dynamic'

export default function ProviderLoginPage() {
  const locale = useLocale()
  const t = useTranslations('partner.login')
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    checkExistingAuth()
  }, [])

  async function checkExistingAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Check if user is provider_owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'provider_owner') {
        router.push(`/${locale}/provider`)
        return
      }
    }

    setCheckingAuth(false)
  }

  async function onSubmit(data: LoginFormData) {
    setLoading(true)
    setError('')

    const supabase = createClient()

    try {
      // Sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email.toLowerCase().trim(),
        password: data.password,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError(locale === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password')
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError(locale === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed')
        setLoading(false)
        return
      }

      // Check if user has provider_owner role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profile?.role !== 'provider_owner') {
        await supabase.auth.signOut()
        setError(locale === 'ar' ? t('notProviderTitle') : t('notProviderTitle'))
        setLoading(false)
        return
      }

      // Redirect to provider dashboard
      router.push(`/${locale}/provider`)

    } catch (err) {
      setError(locale === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    }

    setLoading(false)
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-block">
            <EngeznaLogo size="lg" static showPen={false} />
          </Link>
          <p className="text-sm text-slate-600 mt-2">
            {locale === 'ar' ? 'بوابة الشركاء' : 'Partner Portal'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {t('title')}
                </h1>
                <p className="text-sm text-white/80">
                  {t('description')}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <div className="relative">
                <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  {...register('email')}
                  disabled={loading}
                  className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} ${errors.email ? 'border-destructive' : ''}`}
                  dir="ltr"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('passwordPlaceholder')}
                  {...register('password')}
                  disabled={loading}
                  className={`${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.password ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-end">
              <Link
                href={`/${locale}/auth/forgot-password`}
                className="text-sm text-primary hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 me-2" />
                  {t('loginButton')}
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Register link */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-slate-600">
            {t('noAccount')}{' '}
            <Link
              href={`/${locale}/partner/register`}
              className="text-primary font-medium hover:underline"
            >
              {t('registerLink')}
            </Link>
          </p>
          <p className="text-slate-600 text-sm">
            {t('notProvider')}{' '}
            <Link
              href={`/${locale}/auth/login`}
              className="text-primary hover:underline"
            >
              {t('customerLoginLink')}
            </Link>
          </p>
        </div>

        {/* Back to main site */}
        <div className="text-center mt-4">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
