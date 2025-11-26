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
  User as UserIcon,
  LayoutDashboard,
  Store,
  Shield,
  Users,
  BarChart3,
  Settings,
  ShoppingBag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// User role type
type UserRole = 'customer' | 'provider_owner' | 'admin' | null

export default function Home() {
  console.log('🏠 Homepage rendered')
  const t = useTranslations('home')
  const navT = useTranslations('nav')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole>(null)
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
    
    // If user exists, fetch their role
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role) {
        setUserRole(profile.role as UserRole)
        console.log('👤 User role:', profile.role)
      }
    }
    
    setAuthLoading(false)
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        setUserRole(profile?.role as UserRole || null)
      } else {
        setUserRole(null)
      }
    })
    
    return () => subscription.unsubscribe()
  }

  async function handleSignOut() {
    console.log('🚪 Signing out from homepage...')
    const supabase = createClient()
    await supabase.auth.signOut()
    setUserRole(null)
    
    // Refresh the page to update auth state
    window.location.reload()
  }

  // Helper function to check user roles
  const isProvider = userRole === 'provider_owner'
  const isAdmin = userRole === 'admin'
  const isCustomer = userRole === 'customer' || (!isProvider && !isAdmin && user)
  const isGuest = !user

  // Show customer-focused content only to guests and customers
  const showCustomerContent = isGuest || isCustomer

  // Get the appropriate dashboard link based on role
  const getDashboardLink = () => {
    if (isAdmin) return `/${locale}/admin`
    if (isProvider) return `/${locale}/provider`
    return `/${locale}/providers`
  }

  // Get the appropriate button text based on role
  const getHeaderButtonText = () => {
    if (isAdmin) return locale === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'
    if (isProvider) return locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'
    return locale === 'ar' ? 'المتاجر' : 'Stores'
  }

  // Get header button icon based on role
  const getHeaderButtonIcon = () => {
    if (isAdmin) return <Shield className="w-4 h-4 mr-1" />
    if (isProvider) return <LayoutDashboard className="w-4 h-4 mr-1" />
    return <Store className="w-4 h-4 mr-1" />
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
                {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
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
                  {/* My Orders Link - Only for customers */}
                  {isCustomer && (
                    <Link href={`/${locale}/orders`}>
                      <Button variant="ghost" size="sm" className="relative">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">
                          {locale === 'ar' ? 'طلباتي' : 'Orders'}
                        </span>
                      </Button>
                    </Link>
                  )}
                  
                  {/* User Info - Hidden on mobile - Clickable to go to profile */}
                  <Link href={`/${locale}/profile`}>
                    <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2 text-sm">
                      <UserIcon className="w-4 h-4" />
                      <span className="text-muted-foreground max-w-[100px] truncate">
                        {user.email?.split('@')[0]}
                      </span>
                      {/* Role Badge */}
                      {(isProvider || isAdmin) && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isAdmin
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {isAdmin
                            ? (locale === 'ar' ? 'مسؤول' : 'Admin')
                            : (locale === 'ar' ? 'شريك' : 'Partner')
                          }
                        </span>
                      )}
                    </Button>
                  </Link>
                  
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
                  
                  {/* Role-based Navigation Button */}
                  <Link href={getDashboardLink()}>
                    <Button variant="default" size="sm" className="hidden sm:flex items-center">
                      {getHeaderButtonIcon()}
                      {getHeaderButtonText()}
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

      {/* Hero Section - Different for each role */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Coming Soon Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20">
              {t('comingSoon')}
            </div>

            {/* Main Heading - Role-specific for Admin */}
            {isAdmin ? (
              <>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                  {locale === 'ar' ? 'لوحة إدارة إنجزنا' : 'Engezna Admin Panel'}
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground mb-4">
                  {locale === 'ar' ? 'إدارة المنصة والمستخدمين والمتاجر' : 'Manage platform, users, and stores'}
                </p>
                <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl">
                  {locale === 'ar' 
                    ? 'مرحباً بك في لوحة الإدارة. يمكنك من هنا مراقبة أداء المنصة وإدارة المستخدمين والمتاجر.'
                    : 'Welcome to the admin panel. Monitor platform performance and manage users and stores from here.'}
                </p>
              </>
            ) : isProvider ? (
              <>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  {locale === 'ar' ? 'مرحباً بك يا شريك!' : 'Welcome, Partner!'}
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground mb-4">
                  {locale === 'ar' ? 'إدارة متجرك وزيادة مبيعاتك' : 'Manage your store and grow your sales'}
                </p>
                <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl">
                  {locale === 'ar' 
                    ? 'أنت الآن شريك في منصة إنجزنا. يمكنك إدارة متجرك ومنتجاتك وطلباتك من لوحة التحكم.'
                    : 'You are now a partner on Engezna platform. Manage your store, products, and orders from your dashboard.'}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  {t('heroTitle')}
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground mb-4">
                  {t('heroSubtitle')}
                </p>
                <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl">
                  {t('heroDescription')}
                </p>
              </>
            )}

            {/* CTA Buttons - Role Aware */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {isAdmin ? (
                // Admin CTAs
                <>
                  <Link href={`/${locale}/admin`}>
                    <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto bg-red-600 hover:bg-red-700">
                      <Shield className={`${isRTL ? 'ml-2' : 'mr-2'} h-5 w-5`} />
                      {locale === 'ar' ? 'لوحة الإدارة' : 'Admin Dashboard'}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/providers`}>
                    <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 w-full sm:w-auto">
                      <Store className={`${isRTL ? 'ml-2' : 'mr-2'} h-5 w-5`} />
                      {locale === 'ar' ? 'تصفح المتاجر' : 'Browse Stores'}
                    </Button>
                  </Link>
                </>
              ) : isProvider ? (
                // Provider CTAs
                <>
                  <Link href={`/${locale}/provider`}>
                    <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                      <LayoutDashboard className={`${isRTL ? 'ml-2' : 'mr-2'} h-5 w-5`} />
                      {locale === 'ar' ? 'لوحة التحكم' : 'Go to Dashboard'}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/provider`}>
                    <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 w-full sm:w-auto">
                      <Store className={`${isRTL ? 'ml-2' : 'mr-2'} h-5 w-5`} />
                      {locale === 'ar' ? 'إدارة المتجر' : 'Manage Store'}
                    </Button>
                  </Link>
                </>
              ) : (
                // Guest/Customer CTAs
                <>
                  <Link href={user ? `/${locale}/providers` : `/${locale}/auth/login`}>
                    <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                      {t('ctaOrder')}
                      <ChevronRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
                    </Button>
                  </Link>
                  <Link href={isProvider ? `/${locale}/provider` : `/${locale}/partner/register`}>
                    <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 w-full sm:w-auto">
                      {t('ctaPartner')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className={`absolute top-20 left-10 w-64 h-64 ${isAdmin ? 'bg-red-500/10' : 'bg-primary/10'} rounded-full blur-3xl`}></div>
          <div className={`absolute bottom-20 right-10 w-96 h-96 ${isAdmin ? 'bg-red-500/5' : 'bg-primary/5'} rounded-full blur-3xl`}></div>
        </div>
      </section>

      {/* Admin Quick Stats Section - Only for Admin */}
      {isAdmin && (
        <section className="py-12 bg-slate-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {locale === 'ar' ? 'نظرة سريعة على المنصة' : 'Platform Overview'}
              </h2>
              <p className="text-slate-400">
                {locale === 'ar' ? 'إحصائيات سريعة عن أداء المنصة' : 'Quick stats about platform performance'}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm text-slate-400">{locale === 'ar' ? 'المستخدمين' : 'Users'}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
                <Store className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">4</div>
                <div className="text-sm text-slate-400">{locale === 'ar' ? 'المتاجر' : 'Stores'}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
                <ShoppingBasket className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm text-slate-400">{locale === 'ar' ? 'الطلبات' : 'Orders'}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
                <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">0 EGP</div>
                <div className="text-sm text-slate-400">{locale === 'ar' ? 'الإيرادات' : 'Revenue'}</div>
              </div>
            </div>
            <div className="text-center mt-6">
              <Link href={`/${locale}/admin`}>
                <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                  {locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                  <ChevronRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-4 w-4`} />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Provider Quick Actions - Only for Providers */}
      {isProvider && (
        <section className="py-12 bg-slate-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {locale === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </h2>
              <p className="text-slate-400">
                {locale === 'ar' ? 'الوصول السريع لأهم الوظائف' : 'Quick access to important functions'}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href={`/${locale}/provider`} className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700 hover:bg-slate-700 transition-colors">
                <LayoutDashboard className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="font-medium">{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</div>
              </Link>
              <Link href={`/${locale}/provider`} className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700 hover:bg-slate-700 transition-colors">
                <ShoppingBasket className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="font-medium">{locale === 'ar' ? 'الطلبات' : 'Orders'}</div>
              </Link>
              <Link href={`/${locale}/provider`} className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700 hover:bg-slate-700 transition-colors">
                <Store className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="font-medium">{locale === 'ar' ? 'المنتجات' : 'Products'}</div>
              </Link>
              <Link href={`/${locale}/provider`} className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700 hover:bg-slate-700 transition-colors">
                <Settings className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="font-medium">{locale === 'ar' ? 'الإعدادات' : 'Settings'}</div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Service Categories Section - Show for all */}
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

      {/* Features Section - Show for all */}
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

      {/* How It Works Section - Only for Guests and Customers */}
      {showCustomerContent && (
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

            {/* For Providers - Only show if not already a provider */}
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
      )}

      {/* Customer CTA Section - Only for Guests and Customers */}
      {showCustomerContent && (
        <section className="py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                {t('cta.customer.title')}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t('cta.customer.subtitle')}
              </p>
              <Link href={user ? `/${locale}/providers` : `/${locale}/auth/login`}>
                <Button size="lg" className="text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all">
                  {t('cta.customer.button')}
                  <ChevronRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Provider CTA Section - Different for each role */}
      {showCustomerContent && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                {t('cta.provider.title')}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t('cta.provider.subtitle')}
              </p>
              <Link href={user ? `/${locale}/provider` : `/${locale}/auth/signup`}>
                <Button size="lg" variant="outline" className="text-lg px-10 py-6 border-2">
                  {t('cta.provider.button')}
                  <ChevronRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="contact" className="bg-background border-t">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* About */}
            <div>
              <div className="text-2xl font-bold text-primary mb-4">
                {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
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
