'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLocale, useTranslations } from 'next-intl'

export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('nav')

  const switchLanguage = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar'
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    
    // Update HTML attributes
    document.documentElement.lang = newLocale
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr'
    
    router.push(newPathname)
  }

  return (
    <Button variant="ghost" size="sm" onClick={switchLanguage}>
      {t('switchLanguage')}
    </Button>
  )
}
