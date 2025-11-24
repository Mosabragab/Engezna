'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import {
  UtensilsCrossed,
  Coffee,
  ShoppingBasket,
  Apple,
  TrendingDown,
  Zap,
  MapPin,
  Smartphone,
  ChevronRight,
  LogOut,
  User as UserIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  console.log('🏠 Homepage rendered')
  const t = useTranslations('home')
  const navT = useTranslations('nav')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  console.log('🌍 Locale:', locale, 'RTL:', isRTL)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setAuthLoading(false)
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }

  async function handleSignOut() {
    console.log('🚪 Signing out from homepage...')
    const supabase = createClient()
    await supabase.auth.signOut()
    
    // Refresh the page to update auth state
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-primary">
                {locale === 'ar' ? 'انجزنا' : 'Engezna'}
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#services" className="text-sm font-medium hover:text-primary transition-colors">
                {navT('services')}
              </a>
              <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">
                {navT('about')}
              </a>
              <a href="#contact" className="text-sm font-medium hover:text-primary transition-colors">
                {navT('contact')}
              </a>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LanguageSwitcher />
              
              {/* Auth Section */}
              {authLoading ? (
                <div className="w-20 h-8 bg-muted animate-pulse rounded" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  {/* User Info - Hidden on mobile */}
                  <div className="hidden md:flex items-center gap-2 text-sm">
                    <UserIcon className="w-4 h-4" />
                    <span className="text-muted-foreground">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  
                  {/* Sign Out Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {navT('logout') || (locale === 'ar' ? 'خروج' : 'Sign Out')}
                    </span>
                    <span className="sm:hidden">
                      {locale === 'ar' ? 'خروج' : 'Out'}
                    </span>
                  </Button>
                  
                  {/* Go to Providers Button */}
                  <Link href={`/${locale}/providers`}>
                    <Button variant="default" size="sm" className="hidden sm:flex">
                      {locale === 'ar' ? 'المتاجر' : 'Stores'}
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link href={`/${locale}/auth/login`}>
                  <Button variant="default" size="sm" className="flex">
                    {navT('login')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Coming Soon Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20">
              {t('comingSoon')}
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              {t('heroTitle')}
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">
              {t('heroSubtitle')}
            </p>

            {/* Description */}
            <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl">
              {t('heroDescription')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                {t('ctaOrder')}
                <ChevronRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                {t('ctaPartner')}
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Service Categories Section */}
      <section id="services" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('categories.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('categories.subtitle')}
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Restaurants */}
            <div className="group bg-background rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-border/50">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <UtensilsCrossed className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                {t('categories.restaurants.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('categories.restaurants.description')}
              </p>
            </div>

            {/* Coffee Shops */}
            <div className="group bg-background rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-border/50">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Coffee className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                {t('categories.coffee.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('categories.coffee.description')}
              </p>
            </div>

            {/* Groceries */}
            <div className="group bg-background rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-border/50">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <ShoppingBasket className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                {t('categories.groceries.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('categories.groceries.description')}
              </p>
            </div>

            {/* Vegetables & Fruits */}
            <div className="group bg-background rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-border/50">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Apple className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                {t('categories.vegetables.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('categories.vegetables.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('features.subtitle')}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Low Commission */}
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingDown className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {t('features.lowCommission.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('features.lowCommission.description')}
              </p>
            </div>

            {/* Fast Delivery */}
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {t('features.fastDelivery.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('features.fastDelivery.description')}
              </p>
            </div>

            {/* Local Focus */}
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {t('features.localFocus.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('features.localFocus.description')}
              </p>
            </div>

            {/* Easy to Use */}
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Smartphone className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                {t('features.easyToUse.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('features.easyToUse.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          {/* Steps for Customers */}
          <div className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 h-full">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-6">
                    1
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {t('howItWorks.customer.step1.title')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('howItWorks.customer.step1.description')}
                  </p>
                </div>
                {/* Arrow for desktop */}
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ChevronRight className={`w-8 h-8 text-primary ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 h-full">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-6">
                    2
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {t('howItWorks.customer.step2.title')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('howItWorks.customer.step2.description')}
                  </p>
                </div>
                {/* Arrow for desktop */}
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ChevronRight className={`w-8 h-8 text-primary ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 h-full">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mb-6">
                    3
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {t('howItWorks.customer.step3.title')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('howItWorks.customer.step3.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* For Providers */}
          <div className="bg-primary/5 rounded-3xl p-8 md:p-12 border-2 border-primary/20">
            <div className="text-center mb-12">
              <h3 className="text-2xl md:text-4xl font-bold mb-3">
                {t('howItWorks.provider.title')}
              </h3>
              <p className="text-lg text-muted-foreground">
                {t('howItWorks.provider.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Provider Step 1 */}
              <div className="bg-background rounded-xl p-6">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  1
                </div>
                <h4 className="text-lg font-bold mb-2">
                  {t('howItWorks.provider.step1.title')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('howItWorks.provider.step1.description')}
                </p>
              </div>

              {/* Provider Step 2 */}
              <div className="bg-background rounded-xl p-6">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  2
                </div>
                <h4 className="text-lg font-bold mb-2">
                  {t('howItWorks.provider.step2.title')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('howItWorks.provider.step2.description')}
                </p>
              </div>

              {/* Provider Step 3 */}
              <div className="bg-background rounded-xl p-6">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  3
                </div>
                <h4 className="text-lg font-bold mb-2">
                  {t('howItWorks.provider.step3.title')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('howItWorks.provider.step3.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('cta.customer.title')}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t('cta.customer.subtitle')}
            </p>
            <Button size="lg" className="text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all">
              {t('cta.customer.button')}
              <ChevronRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Provider CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('cta.provider.title')}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t('cta.provider.subtitle')}
            </p>
            <Button size="lg" variant="outline" className="text-lg px-10 py-6 border-2">
              {t('cta.provider.button')}
              <ChevronRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-background border-t">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* About */}
            <div>
              <div className="text-2xl font-bold text-primary mb-4">
                {locale === 'ar' ? 'انجزنا' : 'Engezna'}
              </div>
              <h3 className="font-bold text-lg mb-3">
                {t('footer.about.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('footer.about.description')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-lg mb-4">
                {t('footer.links.title')}
              </h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {t('footer.links.aboutUs')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {t('footer.links.terms')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {t('footer.links.privacy')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {t('footer.links.contact')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-bold text-lg mb-4">
                {t('footer.contact.title')}
              </h3>
              <ul className="space-y-2">
                <li className="text-muted-foreground">
                  {t('footer.contact.address')}
                </li>
                <li className="text-muted-foreground">
                  {t('footer.contact.email')}
                </li>
                <li className="text-muted-foreground">
                  {t('footer.contact.phone')}
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t pt-8 text-center text-muted-foreground">
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  )
}
