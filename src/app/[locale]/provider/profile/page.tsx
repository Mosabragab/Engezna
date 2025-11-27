'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  ArrowRight,
  User,
  Check,
  Loader2,
  Mail,
  Shield,
  LogOut,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ProviderProfilePage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/profile`)
      return
    }

    setUserEmail(user.email || null)

    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .limit(1)

    const provider = providerData?.[0]
    if (!provider || !['approved', 'open', 'closed', 'temporarily_paused'].includes(provider.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    setLoading(false)
  }

  const handlePasswordChange = async () => {
    if (!userEmail) return

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required'
      })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters'
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'
      })
      return
    }

    setSavingPassword(true)
    setPasswordMessage(null)

    const supabase = createClient()

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })

    if (signInError) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect'
      })
      setSavingPassword(false)
      return
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setPasswordMessage({
        type: 'error',
        text: locale === 'ar' ? 'فشل تحديث كلمة المرور' : 'Failed to update password'
      })
    } else {
      setPasswordMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully'
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setShowPasswordForm(false)
        setPasswordMessage(null)
      }, 2000)
    }

    setSavingPassword(false)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/provider`}
              className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
            </Link>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <User className="w-5 h-5" />
              {locale === 'ar' ? 'الملف الشخصي' : 'Profile'}
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Account Info */}
          <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات الحساب' : 'Account Info'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {userEmail?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-lg text-gray-900 dark:text-white">{userEmail?.split('@')[0]}</p>
                  <p className="text-gray-600 dark:text-slate-400 text-sm">{userEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Section - Inline Password Change */}
          <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {locale === 'ar' ? 'الأمان' : 'Security'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-400">
                        {locale === 'ar' ? 'تحديث كلمة المرور الخاصة بك' : 'Update your password'}
                      </p>
                    </div>
                  </div>
                  {isRTL ? <ArrowLeft className="w-5 h-5 text-gray-400 dark:text-slate-400" /> : <ArrowRight className="w-5 h-5 text-gray-400 dark:text-slate-400" />}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      {locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                    </h4>
                    <button
                      onClick={() => {
                        setShowPasswordForm(false)
                        setPasswordMessage(null)
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                      }}
                      className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>

                  {/* Current Password */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                      {locale === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
                    </label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={`bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 ${isRTL ? 'pl-10' : 'pr-10'}`}
                        placeholder={locale === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400`}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                      {locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 ${isRTL ? 'pl-10' : 'pr-10'}`}
                        placeholder={locale === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400`}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                      {locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600"
                      placeholder={locale === 'ar' ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                    />
                  </div>

                  {/* Password Message */}
                  {passwordMessage && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      passwordMessage.type === 'success'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                      {passwordMessage.type === 'success' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm">{passwordMessage.text}</span>
                    </div>
                  )}

                  {/* Save Button */}
                  <Button
                    onClick={handlePasswordChange}
                    disabled={savingPassword}
                    className="w-full"
                  >
                    {savingPassword ? (
                      <>
                        <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Check className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {locale === 'ar' ? 'حفظ كلمة المرور' : 'Save Password'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Button
            variant="outline"
            size="lg"
            className="w-full border-red-500/50 text-red-500 dark:text-red-400 hover:bg-red-500/10"
            onClick={handleSignOut}
          >
            <LogOut className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
          </Button>
        </div>
      </div>
    </div>
  )
}
