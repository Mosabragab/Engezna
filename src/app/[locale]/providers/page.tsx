'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  UtensilsCrossed,
  Coffee,
  ShoppingBasket,
  Apple,
  Star,
  Clock,
  DollarSign,
  MapPin,
  LogOut,
  User as UserIcon
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'

type Provider = {
  id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  category: 'restaurant' | 'coffee_shop' | 'grocery' | 'vegetables_fruits'
  logo_url: string | null
  cover_image_url: string | null
  rating: number
  total_reviews: number
  delivery_fee: number
  min_order_amount: number
  estimated_delivery_time_min: number
  status: 'open' | 'closed' | 'temporarily_paused' | 'on_vacation' | 'pending_approval'
}

const categoryIcons = {
  restaurant: UtensilsCrossed,
  coffee_shop: Coffee,
  grocery: ShoppingBasket,
  vegetables_fruits: Apple,
}

export default function ProvidersPage() {
  const t = useTranslations('providers')
  const locale = useLocale()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    fetchProviders()
    checkAuth()
  }, [selectedCategory])

  async function checkAuth() {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 Auth check in providers page:', { user: user?.email, hasUser: !!user })
    setUser(user)
    setAuthLoading(false)
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', { event: _event, userEmail: session?.user?.email })
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }

  async function handleSignOut() {
    console.log('🚪 Signing out...')
    const supabase = createClient()
    await supabase.auth.signOut()
    
    // Redirect to homepage after sign out
    window.location.href = `/${locale}`
  }

  async function fetchProviders() {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('providers')
      .select('*')
      .in('status', ['open', 'closed'])
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching providers:', error)
    } else {
      setProviders(data || [])
    }

    setLoading(false)
  }

  const getProviderName = (provider: Provider) => {
    return locale === 'ar' ? provider.name_ar : provider.name_en
  }

  const getProviderDescription = (provider: Provider) => {
    return locale === 'ar' ? provider.description_ar : provider.description_en
  }

  const getStatusText = (status: Provider['status']) => {
    switch (status) {
      case 'open':
        return locale === 'ar' ? 'مفتوح' : 'Open'
      case 'closed':
        return locale === 'ar' ? 'مغلق' : 'Closed'
      default:
        return locale === 'ar' ? 'غير متاح' : 'Unavailable'
    }
  }

  const getStatusColor = (status: Provider['status']) => {
    return status === 'open' ? 'text-green-600' : 'text-red-600'
  }

  const categories = [
    { id: 'all', name_ar: 'الكل', name_en: 'All' },
    { id: 'restaurant', name_ar: 'المطاعم', name_en: 'Restaurants' },
    { id: 'coffee_shop', name_ar: 'الكافيهات', name_en: 'Coffee Shops' },
    { id: 'grocery', name_ar: 'البقالة', name_en: 'Groceries' },
    { id: 'vegetables_fruits', name_ar: 'الخضار والفواكه', name_en: 'Vegetables & Fruits' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}`} className="text-2xl font-bold text-primary">
              {locale === 'ar' ? 'انجزنا' : 'Engezna'}
            </Link>
            
            {/* Auth Section */}
            <div className="flex items-center gap-3">
              {authLoading ? (
                <div className="w-20 h-8 bg-muted animate-pulse rounded" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  {/* Debug Info */}
                  <div className="hidden md:block text-xs text-green-600 font-mono">
                    ✅ Logged in: {user.email}
                  </div>
                  
                  {/* User Info */}
                  <div className="hidden sm:flex items-center gap-2 text-sm">
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
                    className="flex items-center gap-2 border-red-200 hover:border-red-300 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Debug Info */}
                  <div className="text-xs text-red-600 font-mono">
                    ❌ Not logged in
                  </div>
                  
                  <Link href={`/${locale}/auth/login`}>
                    <Button variant="default" size="sm">
                      {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {locale === 'ar' ? 'اختر المتجر المفضل لديك' : 'Choose Your Favorite Provider'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'ar'
              ? 'اطلب من أفضل المطاعم والكافيهات في بني سويف'
              : 'Order from the best restaurants and coffee shops in Beni Suef'}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {locale === 'ar' ? category.name_ar : category.name_en}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-xl border animate-pulse">
                <div className="h-48 bg-muted rounded-t-xl" />
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Providers Grid */}
        {!loading && providers.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              {locale === 'ar' ? 'لا توجد متاجر متاحة حالياً' : 'No providers available'}
            </p>
          </div>
        )}

        {!loading && providers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => {
              const Icon = categoryIcons[provider.category]

              return (
                <Link
                  key={provider.id}
                  href={`/${locale}/providers/${provider.id}`}
                  className="group"
                >
                  <div className="bg-card rounded-xl border hover:shadow-xl transition-all duration-300 overflow-hidden h-full">
                    {/* Cover Image */}
                    <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                      {provider.cover_image_url ? (
                        <img
                          src={provider.cover_image_url}
                          alt={getProviderName(provider)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon className="w-16 h-16 text-primary/30" />
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-4 right-4 bg-white dark:bg-gray-900 px-3 py-1 rounded-full shadow-lg">
                        <span className={`text-sm font-medium ${getStatusColor(provider.status)}`}>
                          {getStatusText(provider.status)}
                        </span>
                      </div>

                      {/* Logo */}
                      {provider.logo_url && (
                        <div className="absolute bottom-4 left-4 w-16 h-16 bg-white dark:bg-gray-900 rounded-full border-4 border-white dark:border-gray-900 shadow-lg overflow-hidden">
                          <img
                            src={provider.logo_url}
                            alt={getProviderName(provider)}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Provider Info */}
                    <div className="p-6">
                      {/* Name */}
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {getProviderName(provider)}
                      </h3>

                      {/* Description */}
                      {getProviderDescription(provider) && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {getProviderDescription(provider)}
                        </p>
                      )}

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{provider.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ({provider.total_reviews} {locale === 'ar' ? 'تقييم' : 'reviews'})
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {provider.estimated_delivery_time_min} {locale === 'ar' ? 'دقيقة' : 'min'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span>
                            {locale === 'ar' ? 'توصيل' : 'Delivery'}: {provider.delivery_fee} {locale === 'ar' ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {locale === 'ar' ? 'الحد الأدنى' : 'Min'}: {provider.min_order_amount} {locale === 'ar' ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
