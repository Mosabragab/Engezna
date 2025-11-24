'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useTransition } from 'react'

export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('nav')
  const [isPending, startTransition] = useTransition()

  const switchLanguage = useCallback(() => {
    const newLocale = locale === 'ar' ? 'en' : 'ar'
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    
    // Add no-transition class to prevent flash
    document.documentElement.classList.add('no-transition')
    
    // Update HTML attributes before navigation
    document.documentElement.lang = newLocale
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr'
    
    // Use startTransition for smoother navigation
    startTransition(() => {
      router.push(newPathname)
    })
    
    // Remove no-transition class after a brief delay
    // This allows the page to render with the new theme before re-enabling transitions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-transition')
      })
    })
  }, [locale, pathname, router])

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={switchLanguage}
      disabled={isPending}
      className="min-w-[80px]"
    >
      {isPending ? '...' : t('switchLanguage')}
    </Button>
  )
}
