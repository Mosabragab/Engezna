'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { Button } from '@/components/ui/button'
import { guestLocationStorage } from '@/lib/hooks/useGuestLocation'
import {
  MessageCircle,
  Star,
  ShieldCheck,
  Truck,
  MapPin,
  UtensilsCrossed,
  Coffee,
  ShoppingBasket,
  Apple,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  MessagesSquare,
  Store,
} from 'lucide-react'

interface Governorate {
  id: string
  name_ar: string
  name_en: string
  is_active: boolean
}

export default function WelcomePage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [loading, setLoading] = useState(true)

  // Check if user already has location set
  useEffect(() => {
    const guestLocation = guestLocationStorage.get()
    if (guestLocation?.governorateId) {
      // User already has location, redirect to home
      router.replace(`/${locale}`)
    }
  }, [locale, router])

  // Fetch active governorates
  useEffect(() => {
    async function fetchGovernorates() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('governorates')
          .select('id, name_ar, name_en, is_active')
          .eq('is_active', true)
          .order('name_ar')

        if (!error && data) {
          setGovernorates(data)
        }
      } catch (err) {
        console.error('Error fetching governorates:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGovernorates()
  }, [])

  const categories = [
    {
      id: 'restaurant_cafe',
      name_ar: 'مطاعم وكافيهات',
      name_en: 'Restaurants & Cafes',
      icon: UtensilsCrossed,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      id: 'coffee_patisserie',
      name_ar: 'البن والحلويات',
      name_en: 'Coffee & Patisserie',
      icon: Coffee,
      color: 'bg-amber-50 text-amber-700',
    },
    {
      id: 'grocery',
      name_ar: 'سوبر ماركت',
      name_en: 'Supermarket',
      icon: ShoppingBasket,
      color: 'bg-green-50 text-green-600',
    },
    {
      id: 'vegetables_fruits',
      name_ar: 'خضروات وفواكه',
      name_en: 'Fruits & Vegetables',
      icon: Apple,
      color: 'bg-red-50 text-red-500',
    },
  ]

  const features = [
    {
      icon: MessageCircle,
      title_ar: 'اطلب بالشات',
      title_en: 'Chat to Order',
      description_ar: 'اطلب بالكلام! مساعدنا الذكي يفهم طلبك ويضيفه للسلة',
      description_en: 'Order by chatting! Our smart assistant understands your request and adds it to your cart',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: MessagesSquare,
      title_ar: 'تواصل مع المتجر',
      title_en: 'Chat with Store',
      description_ar: 'تواصل مباشرة مع المتجر عن طريق الشات بعد الطلب',
      description_en: 'Communicate directly with the store via chat after ordering',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Star,
      title_ar: 'تقييمات حقيقية',
      title_en: 'Real Reviews',
      description_ar: 'شوف تقييمات العملاء الحقيقية قبل ما تطلب',
      description_en: 'See real customer reviews before you order',
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      icon: ShieldCheck,
      title_ar: 'بدون رسوم خدمة',
      title_en: 'No Service Fees',
      description_ar: '0% رسوم خدمة - بعكس المنصات التانية اللي بتاخد 25-30%',
      description_en: '0% service fees - unlike other platforms that charge 25-30%',
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: Truck,
      title_ar: 'توصيل سريع',
      title_en: 'Fast Delivery',
      description_ar: 'طلبك يوصلك من أقرب متجر في أسرع وقت',
      description_en: 'Your order arrives from the nearest store as fast as possible',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: MapPin,
      title_ar: 'للمحافظات',
      title_en: 'For Provinces',
      description_ar: 'مش بس للقاهرة - إنجزنا لكل مدن مصر',
      description_en: 'Not just for Cairo - Engezna is for all cities in Egypt',
      color: 'bg-rose-50 text-rose-600',
    },
  ]

  const steps = [
    {
      number: '1',
      title_ar: 'اختر موقعك',
      title_en: 'Select Your Location',
      description_ar: 'اختر محافظتك ومدينتك لعرض المتاجر المتاحة',
      description_en: 'Choose your governorate and city to see available stores',
    },
    {
      number: '2',
      title_ar: 'تصفح المتاجر',
      title_en: 'Browse Stores',
      description_ar: 'تصفح المطاعم والمتاجر واختر اللي يعجبك',
      description_en: 'Browse restaurants and stores and choose what you like',
    },
    {
      number: '3',
      title_ar: 'اطلب واستلم',
      title_en: 'Order & Receive',
      description_ar: 'أكد طلبك وانتظر التوصيل السريع',
      description_en: 'Confirm your order and wait for fast delivery',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-[#E0F4FF] via-[#F0FAFF] to-white overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 pt-8 pb-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <EngeznaLogo size="lg" static showPen={false} />
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {isRTL ? 'عايز تطلب؟ إنجزنا!' : 'Want to order? Engezna!'}
            </h1>
            <p className="text-lg text-slate-600 mb-6">
              {isRTL
                ? 'توصيل أسرع بينك وبين أقرب تاجر في محافظتك - بدون رسوم خدمة'
                : 'Fast delivery connecting you with the nearest merchant in your governorate - no service fees'}
            </p>

            {/* CTA Button */}
            <Link href={`/${locale}/profile/governorate`}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 gap-2"
              >
                <MapPin className="w-5 h-5" />
                {isRTL ? 'اختر موقعك للبدء' : 'Select Your Location to Start'}
                {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </Button>
            </Link>

            {/* Already have account */}
            <p className="mt-4 text-sm text-slate-500">
              {isRTL ? 'لديك حساب؟' : 'Have an account?'}{' '}
              <Link href={`/${locale}/auth/login`} className="text-primary hover:underline font-medium">
                {isRTL ? 'سجل دخول' : 'Sign in'}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
            {isRTL ? 'ماذا نقدم؟' : 'What We Offer'}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className={`w-14 h-14 rounded-full ${category.color} flex items-center justify-center mx-auto mb-3`}>
                  <category.icon className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-slate-900">
                  {isRTL ? category.name_ar : category.name_en}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-3">
            {isRTL ? 'ليه إنجزنا؟' : 'Why Engezna?'}
          </h2>
          <p className="text-slate-600 text-center mb-8 max-w-xl mx-auto">
            {isRTL
              ? 'تجربة طلب مختلفة - سهلة وسريعة ومن غير رسوم خدمة'
              : 'A different ordering experience - easy, fast, and with no service fees'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">
                  {isRTL ? feature.title_ar : feature.title_en}
                </h3>
                <p className="text-slate-600 text-sm">
                  {isRTL ? feature.description_ar : feature.description_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-3">
            {isRTL ? 'كيف يعمل؟' : 'How It Works'}
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-xl mx-auto">
            {isRTL ? 'ثلاث خطوات بسيطة فقط' : 'Just three simple steps'}
          </p>

          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center relative">
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-slate-200" />
                  )}

                  {/* Step number */}
                  <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 relative z-10 shadow-lg shadow-primary/20">
                    {step.number}
                  </div>

                  <h3 className="font-bold text-slate-900 mb-2">
                    {isRTL ? step.title_ar : step.title_en}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {isRTL ? step.description_ar : step.description_en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Available Governorates Section */}
      <section className="py-12 px-4 bg-white">
        <div className="container mx-auto">
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-slate-900">
                {isRTL ? 'متاحين في' : 'Available In'}
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : governorates.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {governorates.map((gov) => (
                  <span
                    key={gov.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full text-slate-700 font-medium shadow-sm border border-slate-100"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {isRTL ? gov.name_ar : gov.name_en}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 mb-6">
                {isRTL ? 'قريباً في محافظتك' : 'Coming soon to your governorate'}
              </p>
            )}

            <p className="text-slate-600 text-sm">
              {isRTL
                ? 'نتوسع باستمرار - قريباً في محافظات أكثر!'
                : 'We are constantly expanding - coming soon to more governorates!'}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-white to-[#E0F4FF]">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            {isRTL ? 'جاهز تبدأ؟' : 'Ready to Start?'}
          </h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            {isRTL
              ? 'اختر موقعك وابدأ تصفح المتاجر المتاحة في منطقتك'
              : 'Select your location and start browsing available stores in your area'}
          </p>

          <Link href={`/${locale}/profile/governorate`}>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 gap-2"
            >
              <MapPin className="w-5 h-5" />
              {isRTL ? 'اختر موقعك الآن' : 'Select Your Location Now'}
              {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>
          </Link>

          {/* Partner CTA */}
          <div className="mt-10 pt-8 border-t border-slate-200">
            <p className="text-slate-600 mb-3">
              {isRTL ? 'أنت صاحب متجر أو مطعم؟' : 'Own a store or restaurant?'}
            </p>
            <Link
              href={`/${locale}/partner`}
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <Store className="w-5 h-5" />
              {isRTL ? 'انضم كشريك - 6 شهور بدون عمولة' : 'Join as a Partner - 6 months with 0% commission'}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 bg-slate-900 text-white text-center">
        <div className="container mx-auto">
          <p className="text-slate-400 text-sm">
            © 2025 {isRTL ? 'إنجزنا - جميع الحقوق محفوظة' : 'Engezna - All rights reserved'}
          </p>
        </div>
      </footer>
    </div>
  )
}
