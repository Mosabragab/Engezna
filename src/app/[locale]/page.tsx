'use client'

import { useTranslations } from 'next-intl'
import Logo from '@/components/shared/Logo'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Button } from '@/components/ui/button'

export default function Home() {
  const t = useTranslations('home')
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Logo language="ar" variant="medium" size="md" />
            
            {/* Navigation */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LanguageSwitcher />
              <Button variant="default" size="sm">
                {t('login')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
          {/* Main Logo */}
          <div className="mb-8 space-y-4">
            <div className="text-6xl font-bold text-primary tracking-tight" style={{fontFamily: 'var(--font-noto-sans-arabic)'}}>
              {t('title')}
            </div>
            <div className="text-5xl font-medium text-muted-foreground tracking-tight">
              {t('subtitle')}
            </div>
          </div>
          
          {/* Tagline */}
          <p className="mb-8 max-w-2xl text-xl text-muted-foreground" style={{fontFamily: 'var(--font-noto-sans-arabic)'}}>
            {t('tagline')}
          </p>
          
          {/* CTA Buttons */}
          <div className="flex gap-4">
            <Button size="lg" className="text-lg" style={{fontFamily: 'var(--font-noto-sans-arabic)'}}>
              {t('ctaOrder')}
            </Button>
            <Button size="lg" variant="outline" className="text-lg" style={{fontFamily: 'var(--font-noto-sans-arabic)'}}>
              {t('ctaPartner')}
            </Button>
          </div>
          
          {/* Status Badge */}
          <div className="mt-12 rounded-full bg-primary/10 px-6 py-2 text-sm font-medium text-primary">
            🚀 {t('comingSoon')}
          </div>
        </div>
      </main>
    </div>
  )
}