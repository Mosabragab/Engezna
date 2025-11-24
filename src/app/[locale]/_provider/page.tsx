'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { 
  Store, 
  Package, 
  Users, 
  BarChart3, 
  Settings,
  ArrowRight,
  Plus
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ProviderPage() {
  const t = useTranslations('provider')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {locale === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first'}
          </h1>
          <Link href={`/${locale}/auth/login`}>
            <Button>
              {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/${locale}`} className="text-2xl font-bold text-primary">
                {locale === 'ar' ? 'انجزنا' : 'Engezna'}
              </Link>
              <span className="text-muted-foreground">
                {locale === 'ar' ? '- لوحة مقدم الخدمة' : '- Provider Dashboard'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {locale === 'ar' ? 'مرحباً' : 'Welcome'}, {user.email?.split('@')[0]}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {locale === 'ar' ? 'لوحة مقدم الخدمة' : 'Provider Dashboard'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {locale === 'ar' 
              ? 'مرحباً بك في لوحة تحكم مقدم الخدمة. يمكنك من هنا إدارة متجرك وطلباتك.' 
              : 'Welcome to your provider dashboard. Manage your store and orders from here.'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {locale === 'ar' ? 'المنتجات' : 'Products'}
                </h3>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {locale === 'ar' ? 'الطلبات اليوم' : 'Orders Today'}
                </h3>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}
                </h3>
                <p className="text-2xl font-bold">0 EGP</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {locale === 'ar' ? 'حالة المتجر' : 'Store Status'}
                </h3>
                <p className="text-sm font-medium text-orange-600">
                  {locale === 'ar' ? 'قيد الإعداد' : 'Setup Required'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Setup Store */}
          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold mb-2">
                  {locale === 'ar' ? 'إعداد المتجر' : 'Setup Your Store'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {locale === 'ar' 
                    ? 'قم بإضافة معلومات متجرك والمنتجات لبدء استقبال الطلبات.'
                    : 'Add your store information and products to start receiving orders.'}
                </p>
                <Button className="w-full">
                  {locale === 'ar' ? 'إعداد المتجر' : 'Setup Store'}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Add Products */}
          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold mb-2">
                  {locale === 'ar' ? 'إضافة المنتجات' : 'Add Products'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {locale === 'ar' 
                    ? 'أضف منتجاتك مع الأسعار والصور والأوصاف.'
                    : 'Add your products with prices, images, and descriptions.'}
                </p>
                <Button variant="outline" className="w-full">
                  {locale === 'ar' ? 'إضافة منتجات' : 'Add Products'}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Manage Orders */}
          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold mb-2">
                  {locale === 'ar' ? 'إدارة الطلبات' : 'Manage Orders'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {locale === 'ar' 
                    ? 'عرض ومتابعة الطلبات الواردة من العملاء.'
                    : 'View and track incoming orders from customers.'}
                </p>
                <Button variant="outline" className="w-full">
                  {locale === 'ar' ? 'عرض الطلبات' : 'View Orders'}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-bold mb-2">
                  {locale === 'ar' ? 'الإعدادات' : 'Settings'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {locale === 'ar' 
                    ? 'إدارة إعدادات الحساب والإشعارات.'
                    : 'Manage account settings and notifications.'}
                </p>
                <Button variant="outline" className="w-full">
                  {locale === 'ar' ? 'الإعدادات' : 'Settings'}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2 text-primary">
            {locale === 'ar' ? '🚀 قريباً في بني سويف!' : '🚀 Coming Soon to Beni Suef!'}
          </h3>
          <p className="text-muted-foreground">
            {locale === 'ar' 
              ? 'نحن نعمل بجد لإطلاق منصة انجزنا قريباً في بني سويف. ستتمكن قريباً من إدارة متجرك بالكامل من هنا.'
              : 'We are working hard to launch Engezna in Beni Suef soon. You will be able to manage your entire store from here.'}
          </p>
        </div>
      </main>
    </div>
  )
}
