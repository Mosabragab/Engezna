'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLocale } from 'next-intl'
import { useCallback, useTransition } from 'react'
import { Globe } from 'lucide-react'

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact'
  className?: string
}

export function LanguageSwitcher({ variant = 'default', className = '' }: LanguageSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-transition')
      })
    })
  }, [locale, pathname, router])

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={switchLanguage}
        disabled={isPending}
        className={`flex items-center gap-1.5 text-gray-700 hover:text-primary ${className}`}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isPending ? '...' : locale === 'ar' ? 'EN' : 'AR'}
        </span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLanguage}
      disabled={isPending}
      className={`flex items-center gap-2 min-w-[90px] text-gray-700 hover:text-primary hover:bg-gray-100 ${className}`}
    >
      <Globe className="w-4 h-4" />
      <span className="text-sm font-medium">
        {isPending ? '...' : locale === 'ar' ? 'EN' : 'عربي'}
      </span>
    </Button>
  )
}
