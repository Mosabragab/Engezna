import Link from 'next/link'
import { Suspense } from 'react'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/shared/Footer'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { WelcomeClientWrapper, LanguageToggle } from '@/components/welcome/WelcomeClientWrapper'
import { GovernoratesList, GovernoratesListSkeleton } from '@/components/welcome/GovernoratesList'
import {
  MessageCircle,
  Star,
  ShieldCheck,
  Truck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  Store,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function WelcomePage({ params }: PageProps) {
  const { locale } = await params
  const isRTL = locale === 'ar'

  // Categories with emoji and gradient backgrounds
  const categories = [
    {
      id: 'restaurant_cafe',
      name_ar: 'مطاعم',
      name_en: 'Restaurants',
      emoji: '🍔',
      gradient: 'linear-gradient(145deg, rgba(254,243,199,0.85) 0%, rgba(254,249,195,0.7) 100%)',
    },
    {
      id: 'coffee_patisserie',
      name_ar: 'البن والحلويات',
      name_en: 'Coffee & Sweets',
      emoji: '☕',
      gradient: 'linear-gradient(145deg, rgba(245,235,220,0.9) 0%, rgba(237,224,205,0.75) 100%)',
    },
    {
      id: 'grocery',
      name_ar: 'سوبر ماركت',
      name_en: 'Supermarket',
      emoji: '🛒',
      gradient: 'linear-gradient(145deg, rgba(224,244,255,0.9) 0%, rgba(186,230,253,0.75) 100%)',
    },
    {
      id: 'vegetables_fruits',
      name_ar: 'خضروات وفواكه',
      name_en: 'Vegetables & Fruits',
      emoji: '🍌',
      gradient: 'linear-gradient(145deg, rgba(209,250,229,0.85) 0%, rgba(167,243,208,0.7) 100%)',
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
      description_ar: '0% رسوم خدمة على طلباتك - ادفع فقط ثمن الطلب والتوصيل',
      description_en: '0% service fees on your orders - pay only for your order and delivery',
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
    <WelcomeClientWrapper>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-[#E0F4FF] via-[#F0FAFF] to-white overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="relative container mx-auto px-4 pt-4 pb-12">
            {/* Header with Language Toggle */}
            <div className="flex justify-between items-center mb-6">
              <div /> {/* Spacer */}
              <LanguageToggle />
            </div>

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
        <section className="py-12 px-4 bg-white">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
              {isRTL ? 'ماذا نقدم؟' : 'What We Offer'}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {categories.map((category, index) => (
                <div
                  key={category.id}
                  className={`flex flex-col items-center p-4 text-center animate-slide-up opacity-0`}
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-elegant hover:shadow-elegant-lg"
                    style={{
                      background: category.gradient,
                    }}
                  >
                    <span
                      className="text-4xl md:text-5xl"
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    >
                      {category.emoji}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">
                    {isRTL ? category.name_ar : category.name_en}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 px-4 bg-slate-50/50">
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
                  className="bg-white rounded-2xl p-6 border border-slate-100 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
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
        <section className="py-12 px-4 bg-white">
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
                      <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/30 to-primary/10" />
                    )}

                    {/* Step number */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 relative z-10 shadow-elegant-lg">
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

        {/* Available Governorates Section - Streamed with Suspense */}
        <section className="py-12 px-4 bg-slate-50/50">
          <div className="container mx-auto">
            <div className="bg-white rounded-2xl p-8 text-center shadow-elegant border border-slate-100">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {isRTL ? 'متاحين في' : 'Available In'}
                </h2>
              </div>

              {/* Governorates list loads separately - page renders instantly */}
              <Suspense fallback={<GovernoratesListSkeleton locale={locale} />}>
                <GovernoratesList locale={locale} />
              </Suspense>

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
        <Footer />

        {/* PWA Install Prompt */}
        <InstallPrompt />
      </div>
    </WelcomeClientWrapper>
  )
}
