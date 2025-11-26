'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Moon,
  Sun,
  User,
  Check,
  Loader2,
  Mail,
  Shield,
  LogOut,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ProviderProfilePage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState(locale)
  const [changingLanguage, setChangingLanguage] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    checkAuth()
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    }
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

  const applyTheme = (newTheme: 'light' | 'dark') => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === locale) return

    setChangingLanguage(true)
    setSelectedLanguage(newLocale)

    // Wait a bit for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500))

    // Redirect to provider profile with new locale
    router.push(`/${newLocale}/provider/profile`)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-400">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/provider`}
              className="flex items-center gap-2 text-slate-400 hover:text-white"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
            </Link>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <User className="w-5 h-5" />
              {locale === 'ar' ? 'الملف الشخصي' : 'Profile'}
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Account Info */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات الحساب' : 'Account Info'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {userEmail?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-lg">{userEmail?.split('@')[0]}</p>
                  <p className="text-slate-400 text-sm">{userEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {locale === 'ar' ? 'اللغة' : 'Language'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Arabic Option */}
              <button
                onClick={() => handleLanguageChange('ar')}
                disabled={changingLanguage}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                  selectedLanguage === 'ar'
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-600 hover:border-slate-500'
                } ${changingLanguage ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedLanguage === 'ar' ? 'bg-primary/20' : 'bg-slate-700'
                  }`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">العربية</p>
                    <p className="text-xs text-slate-400">Arabic</p>
                  </div>
                </div>
                {selectedLanguage === 'ar' && !changingLanguage && (
                  <Check className="w-5 h-5 text-primary" />
                )}
                {selectedLanguage === 'ar' && changingLanguage && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
              </button>

              {/* English Option */}
              <button
                onClick={() => handleLanguageChange('en')}
                disabled={changingLanguage}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                  selectedLanguage === 'en'
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-600 hover:border-slate-500'
                } ${changingLanguage ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedLanguage === 'en' ? 'bg-primary/20' : 'bg-slate-700'
                  }`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">English</p>
                    <p className="text-xs text-slate-400">الإنجليزية</p>
                  </div>
                </div>
                {selectedLanguage === 'en' && !changingLanguage && (
                  <Check className="w-5 h-5 text-primary" />
                )}
                {selectedLanguage === 'en' && changingLanguage && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
              </button>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                {locale === 'ar' ? 'المظهر' : 'Appearance'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Dark Mode Option */}
              <button
                onClick={() => handleThemeChange('dark')}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-primary/20' : 'bg-slate-700'
                  }`}>
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{locale === 'ar' ? 'الوضع الليلي' : 'Dark Mode'}</p>
                    <p className="text-xs text-slate-400">
                      {locale === 'ar' ? 'خلفية داكنة' : 'Dark background'}
                    </p>
                  </div>
                </div>
                {theme === 'dark' && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>

              {/* Light Mode Option */}
              <button
                onClick={() => handleThemeChange('light')}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === 'light' ? 'bg-primary/20' : 'bg-slate-700'
                  }`}>
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{locale === 'ar' ? 'الوضع النهاري' : 'Light Mode'}</p>
                    <p className="text-xs text-slate-400">
                      {locale === 'ar' ? 'خلفية فاتحة' : 'Light background'}
                    </p>
                  </div>
                </div>
                {theme === 'light' && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {locale === 'ar' ? 'الأمان' : 'Security'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/${locale}/profile/password`}
                className="w-full p-4 rounded-xl border border-slate-600 hover:border-slate-500 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</p>
                  <p className="text-xs text-slate-400">
                    {locale === 'ar' ? 'تحديث كلمة المرور الخاصة بك' : 'Update your password'}
                  </p>
                </div>
                {isRTL ? <ArrowLeft className="w-5 h-5 text-slate-400" /> : <ArrowRight className="w-5 h-5 text-slate-400" />}
              </Link>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Button
            variant="outline"
            size="lg"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
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
