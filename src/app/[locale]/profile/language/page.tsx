'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { BottomNavigation } from '@/components/customer/layout'
import { Card } from '@/components/ui/card'
import { Globe, Loader2, Check, User } from 'lucide-react'

export default function LanguagePage() {
  const locale = useLocale()
  const t = useTranslations('settings.language')
  const router = useRouter()

  const [authLoading, setAuthLoading] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState(locale)
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/profile/language`)
      return
    }

    setAuthLoading(false)
  }

  async function handleLanguageChange(newLocale: string) {
    if (newLocale === locale) return

    setChanging(true)
    setSelectedLanguage(newLocale)

    // Wait a bit for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500))

    // Redirect to profile page with new locale
    router.push(`/${newLocale}/profile`)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted pb-20">
        <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href={`/${locale}/profile`} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                <User className="w-5 h-5" />
              </Link>
              <Link href={`/${locale}`} className="text-xl font-bold text-primary">
                {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
              </Link>
              <div className="w-9" />
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted pb-20">
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/profile`} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
              <User className="w-5 h-5" />
            </Link>
            <Link href={`/${locale}`} className="text-xl font-bold text-primary">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </Link>
            <div className="w-9" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t('description')}
        </p>

        <div className="space-y-4">
          {/* Arabic Option */}
          <Card
            className={`p-4 cursor-pointer transition-all ${
              selectedLanguage === 'ar'
                ? 'border-2 border-primary bg-primary/5'
                : 'hover:bg-muted'
            } ${changing ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => handleLanguageChange('ar')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedLanguage === 'ar' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    العربية
                  </h3>
                  {selectedLanguage === 'ar' && (
                    <p className="text-sm text-primary">{t('current')}</p>
                  )}
                </div>
              </div>
              {selectedLanguage === 'ar' && !changing && (
                <Check className="w-5 h-5 text-primary" />
              )}
              {selectedLanguage === 'ar' && changing && (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
            </div>
          </Card>

          {/* English Option */}
          <Card
            className={`p-4 cursor-pointer transition-all ${
              selectedLanguage === 'en'
                ? 'border-2 border-primary bg-primary/5'
                : 'hover:bg-muted'
            } ${changing ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => handleLanguageChange('en')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedLanguage === 'en' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    English
                  </h3>
                  {selectedLanguage === 'en' && (
                    <p className="text-sm text-primary">{t('current')}</p>
                  )}
                </div>
              </div>
              {selectedLanguage === 'en' && !changing && (
                <Check className="w-5 h-5 text-primary" />
              )}
              {selectedLanguage === 'en' && changing && (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
            </div>
          </Card>
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}
