'use client'

import { useLocale } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { createClient } from '@/lib/supabase/client'
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  LogIn,
  ArrowRight,
  ArrowLeft,
  Timer,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminLoginPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Brute force protection
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0)
  const MAX_ATTEMPTS = 5
  const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes in milliseconds

  const clearLockout = useCallback(() => {
    localStorage.removeItem('admin_login_lockout')
    localStorage.removeItem('admin_login_attempts')
    setIsLocked(false)
    setLockoutTimeLeft(0)
  }, [])

  const checkLockoutStatus = useCallback(() => {
    const lockoutData = localStorage.getItem('admin_login_lockout')
    if (lockoutData) {
      const { lockoutUntil } = JSON.parse(lockoutData)
      const now = Date.now()
      if (lockoutUntil > now) {
        setIsLocked(true)
        setLockoutTimeLeft(lockoutUntil - now)
      } else {
        clearLockout()
      }
    }
  }, [clearLockout])

  const checkExistingAuth = useCallback(async () => {
    try {
      const supabase = createClient()

      // Add timeout to prevent hanging forever (5 seconds max)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 5000)
      )

      const authPromise = supabase.auth.getUser()
      const { data: { user } } = await Promise.race([authPromise, timeoutPromise])

      if (user) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'admin') {
          // Check if admin is active
          const { data: adminUser } = await supabase
            .from('admin_users')
            .select('is_active')
            .eq('user_id', user.id)
            .single()

          if (adminUser?.is_active) {
            router.push(`/${locale}/admin`)
            return
          }
        }
      }
    } catch (error) {
      // Log error but continue to show login form
      console.error('Error checking existing auth:', error)
    }

    setCheckingAuth(false)
  }, [locale, router])

  useEffect(() => {
    checkExistingAuth()
    checkLockoutStatus()

    // Fallback: Force show form after 6 seconds if still loading
    const fallbackTimer = setTimeout(() => {
      setCheckingAuth(false)
    }, 6000)

    return () => clearTimeout(fallbackTimer)
  }, [checkExistingAuth, checkLockoutStatus])

  // Countdown timer for lockout
  useEffect(() => {
    if (!isLocked || lockoutTimeLeft <= 0) return

    const timer = setInterval(() => {
      setLockoutTimeLeft(prev => {
        if (prev <= 1000) {
          setIsLocked(false)
          clearLockout()
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isLocked, lockoutTimeLeft, clearLockout])

  function getFailedAttempts(): number {
    const data = localStorage.getItem('admin_login_attempts')
    if (data) {
      const { count, timestamp } = JSON.parse(data)
      // Reset if older than 1 hour
      if (Date.now() - timestamp > 60 * 60 * 1000) {
        localStorage.removeItem('admin_login_attempts')
        return 0
      }
      return count
    }
    return 0
  }

  function incrementFailedAttempts() {
    const current = getFailedAttempts()
    const newCount = current + 1
    localStorage.setItem('admin_login_attempts', JSON.stringify({
      count: newCount,
      timestamp: Date.now()
    }))

    if (newCount >= MAX_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION
      localStorage.setItem('admin_login_lockout', JSON.stringify({ lockoutUntil }))
      setIsLocked(true)
      setLockoutTimeLeft(LOCKOUT_DURATION)
    }

    return newCount
  }

  function clearAttempts() {
    localStorage.removeItem('admin_login_attempts')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    // Check if locked out
    if (isLocked) {
      const minutes = Math.ceil(lockoutTimeLeft / 60000)
      setError(
        locale === 'ar'
          ? `تم قفل الحساب مؤقتاً. حاول مرة أخرى بعد ${minutes} دقيقة.`
          : `Account temporarily locked. Try again in ${minutes} minute(s).`
      )
      return
    }

    if (!email || !password) {
      setError(locale === 'ar' ? 'البريد الإلكتروني وكلمة المرور مطلوبان' : 'Email and password are required')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()

    try {
      // Sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (signInError) {
        // Increment failed attempts on authentication failure
        const attempts = incrementFailedAttempts()
        const remaining = MAX_ATTEMPTS - attempts

        if (signInError.message.includes('Invalid login credentials')) {
          if (remaining > 0) {
            setError(
              locale === 'ar'
                ? `البريد الإلكتروني أو كلمة المرور غير صحيحة. ${remaining} محاولات متبقية.`
                : `Invalid email or password. ${remaining} attempt(s) remaining.`
            )
          } else {
            setError(
              locale === 'ar'
                ? 'تم قفل الحساب لمدة 15 دقيقة بسبب كثرة المحاولات الفاشلة.'
                : 'Account locked for 15 minutes due to too many failed attempts.'
            )
          }
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

      // Check if user has admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        setError(locale === 'ar' ? 'هذا الحساب ليس حساب مشرف' : 'This account is not an admin account')
        setLoading(false)
        return
      }

      // Check if admin is active
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('is_active, role')
        .eq('user_id', authData.user.id)
        .single()

      if (!adminUser) {
        await supabase.auth.signOut()
        setError(locale === 'ar' ? 'لم يتم العثور على سجل المشرف' : 'Admin record not found')
        setLoading(false)
        return
      }

      if (!adminUser.is_active) {
        await supabase.auth.signOut()
        setError(locale === 'ar' ? 'حسابك معطل. تواصل مع المدير التنفيذي.' : 'Your account is deactivated. Contact the administrator.')
        setLoading(false)
        return
      }

      // Update last active
      await supabase
        .from('admin_users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('user_id', authData.user.id)

      // Clear failed login attempts on successful login
      clearAttempts()

      // Nuclear fix: Use window.location.href to ensure full page reload
      // This guarantees all cookies are sent to server and Layout rebuilds completely
      window.location.href = `/${locale}/admin`

    } catch {
      setError(locale === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    }

    setLoading(false)
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#009DE0] border-t-transparent"></div>
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
            {locale === 'ar' ? 'لوحة تحكم المشرفين' : 'Admin Dashboard'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#009DE0] to-[#0080b8] px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {locale === 'ar' ? 'تسجيل دخول المشرفين' : 'Admin Login'}
                </h1>
                <p className="text-sm text-white/80">
                  {locale === 'ar' ? 'سجل دخولك للوصول للوحة التحكم' : 'Sign in to access the dashboard'}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-6 space-y-5">
            {/* Lockout Warning */}
            {isLocked && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <Timer className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">
                    {locale === 'ar' ? 'الحساب مقفل مؤقتاً' : 'Account Temporarily Locked'}
                  </span>
                </div>
                <p className="text-sm text-amber-600">
                  {locale === 'ar'
                    ? `يمكنك المحاولة مرة أخرى بعد: ${Math.floor(lockoutTimeLeft / 60000)}:${String(Math.floor((lockoutTimeLeft % 60000) / 1000)).padStart(2, '0')}`
                    : `You can try again in: ${Math.floor(lockoutTimeLeft / 60000)}:${String(Math.floor((lockoutTimeLeft % 60000) / 1000)).padStart(2, '0')}`
                  }
                </p>
              </div>
            )}

            {error && !isLocked && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <div className="relative">
                <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={locale === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0] focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  dir="ltr"
                  required
                  disabled={isLocked}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={locale === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
                  className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0] focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed`}
                  required
                  disabled={isLocked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-end">
              <Link
                href={`/${locale}/auth/forgot-password`}
                className="text-sm text-[#009DE0] hover:underline"
              >
                {locale === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading || isLocked}
              className="w-full bg-[#009DE0] hover:bg-[#0080b8] py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : isLocked ? (
                <>
                  <Timer className="w-5 h-5 me-2" />
                  {locale === 'ar' ? 'الحساب مقفل' : 'Account Locked'}
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 me-2" />
                  {locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Back to main site */}
        <div className="text-center mt-6">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {locale === 'ar' ? 'العودة للموقع الرئيسي' : 'Back to main site'}
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">
            {locale === 'ar' ? 'ملاحظة للمشرفين الجدد:' : 'Note for new supervisors:'}
          </p>
          <p className="text-blue-700">
            {locale === 'ar'
              ? 'إذا كنت مدعواً للانضمام، استخدم رابط الدعوة المرسل إليك لإنشاء حسابك أولاً.'
              : 'If you have been invited to join, use the invitation link sent to you to create your account first.'}
          </p>
        </div>
      </div>
    </div>
  )
}
