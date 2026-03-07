import type { Metadata } from 'next';
import Link from 'next/link';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { Button } from '@/components/ui/button';
import { WelcomeClientWrapper } from '@/components/welcome/WelcomeClientWrapper';
import { WelcomeClientIslands } from '@/components/welcome/WelcomeClientIslands';
import { GovernoratesList } from '@/components/welcome/GovernoratesList';
import {
  ListChecks,
  Star,
  ShieldCheck,
  Truck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  Store,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'مرحباً | إنجزنا' : 'Welcome | Engezna',
    description:
      locale === 'ar'
        ? 'لتلبية احتياجات بيتك اليومية من أقرب تاجر - بدون رسوم خدمة'
        : 'For your daily home essentials from the nearest merchant - no service fees',
    alternates: {
      canonical: `https://www.engezna.com/${locale}/welcome`,
      languages: {
        ar: 'https://www.engezna.com/ar/welcome',
        en: 'https://www.engezna.com/en/welcome',
      },
    },
  };
}

// Static data — rendered server-side, no client JS needed
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
  {
    id: 'pharmacy',
    name_ar: 'صيدليات',
    name_en: 'Pharmacies',
    emoji: '💊',
    gradient: 'linear-gradient(145deg, rgba(252,231,243,0.9) 0%, rgba(249,168,212,0.7) 100%)',
  },
  {
    id: 'home_cooked',
    name_ar: 'أكل بيتي',
    name_en: 'Home Food',
    emoji: '🍲',
    gradient: 'linear-gradient(145deg, rgba(255,237,213,0.9) 0%, rgba(254,215,170,0.75) 100%)',
  },
];

const features_ar = [
  {
    Icon: ListChecks,
    title: 'اطلب وقارن الأسعار',
    description: 'أرسل قائمة طلبك لـ 3 متاجر واختر أفضل سعر يناسبك',
    color: 'bg-primary/10 text-primary',
  },
  {
    Icon: MessagesSquare,
    title: 'تواصل مع المتجر',
    description: 'تواصل مباشرة مع المتجر عن طريق الشات بعد الطلب',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    Icon: ShieldCheck,
    title: 'بدون رسوم خدمة',
    description: '0% رسوم خدمة على طلباتك - ادفع فقط ثمن الطلب والتوصيل',
    color: 'bg-green-50 text-green-600',
  },
  {
    Icon: Star,
    title: 'تقييمات حقيقية',
    description: 'شوف تقييمات العملاء الحقيقية قبل ما تطلب',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    Icon: Truck,
    title: 'توصيل سريع',
    description: 'طلبك يوصلك من أقرب متجر في أسرع وقت',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    Icon: MapPin,
    title: 'للمحافظات',
    description: 'مش بس للقاهرة - إنجزنا لكل مدن مصر',
    color: 'bg-rose-50 text-rose-600',
  },
];

const features_en = [
  {
    Icon: ListChecks,
    title: 'Order & Compare Prices',
    description: 'Send your order list to 3 stores and choose the best price for you',
    color: 'bg-primary/10 text-primary',
  },
  {
    Icon: MessagesSquare,
    title: 'Chat with Store',
    description: 'Communicate directly with the store via chat after ordering',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    Icon: ShieldCheck,
    title: 'No Service Fees',
    description: '0% service fees on your orders - pay only for your order and delivery',
    color: 'bg-green-50 text-green-600',
  },
  {
    Icon: Star,
    title: 'Real Reviews',
    description: 'See real customer reviews before you order',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    Icon: Truck,
    title: 'Fast Delivery',
    description: 'Your order arrives from the nearest store as fast as possible',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    Icon: MapPin,
    title: 'For Provinces',
    description: 'Not just for Cairo - Engezna is for all cities in Egypt',
    color: 'bg-rose-50 text-rose-600',
  },
];

const steps_ar = [
  { number: '1', title: 'اختر موقعك', description: 'اختر محافظتك ومدينتك لعرض المتاجر المتاحة' },
  { number: '2', title: 'تصفح المتاجر', description: 'تصفح المطاعم والمتاجر واختر اللي يعجبك' },
  { number: '3', title: 'اطلب واستلم', description: 'أكد طلبك وانتظر التوصيل السريع' },
];

const steps_en = [
  {
    number: '1',
    title: 'Select Your Location',
    description: 'Choose your governorate and city to see available stores',
  },
  {
    number: '2',
    title: 'Browse Stores',
    description: 'Browse restaurants and stores and choose what you like',
  },
  {
    number: '3',
    title: 'Order & Receive',
    description: 'Confirm your order and wait for fast delivery',
  },
];

/**
 * Welcome Page — Server Component
 *
 * Renders all static content server-side for instant FCP/LCP.
 * Client components (WelcomeClientWrapper, Footer, InstallPrompt) are
 * hydrated as islands without blocking the initial paint.
 *
 * SDUI section overrides are handled via progressive enhancement
 * in the WelcomeClientWrapper after hydration.
 */
export default async function WelcomePage({ params }: PageProps) {
  const { locale } = await params;
  const isRTL = locale === 'ar';
  const features = isRTL ? features_ar : features_en;
  const steps = isRTL ? steps_ar : steps_en;
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <WelcomeClientWrapper>
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-[#E0F4FF] via-[#F0FAFF] to-white overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="relative container mx-auto px-4 pt-8 pb-12">
            <div className="flex justify-center mb-8">
              <EngeznaLogo size="lg" static showPen={false} />
            </div>

            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {isRTL ? 'عايز تطلب؟ إنجزنا!' : 'Want to order? Engezna!'}
              </h1>
              <p className="text-lg text-slate-600 mb-6">
                {isRTL
                  ? 'لتلبية احتياجات بيتك اليومية من أقرب تاجر - بدون رسوم خدمة'
                  : 'For your daily home essentials from the nearest merchant - no service fees'}
              </p>

              <Link href={`/${locale}/profile/governorate`}>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  {isRTL ? 'اختر موقعك للبدء' : 'Select Your Location to Start'}
                  <ChevronIcon className="w-5 h-5" />
                </Button>
              </Link>

              <p className="mt-4 text-sm text-slate-500">
                {isRTL ? 'لديك حساب؟' : 'Have an account?'}{' '}
                <Link
                  href={`/${locale}/auth/login`}
                  className="text-primary hover:underline font-medium"
                >
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

            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${locale}/profile/governorate`}
                  className="flex flex-col items-center p-4 text-center"
                >
                  <div
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-elegant hover:shadow-elegant-lg"
                    style={{ background: category.gradient }}
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
                </Link>
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
                  <div
                    className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm">{feature.description}</p>
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
                    {index < steps.length - 1 && (
                      <div className="hidden md:block absolute top-8 ltr:left-1/2 rtl:right-1/2 w-full h-0.5 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-primary/30 to-primary/10" />
                    )}

                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 relative z-10 shadow-elegant-lg">
                      {step.number}
                    </div>

                    <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-slate-600 text-sm">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Available Governorates Section */}
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

              <GovernoratesList locale={locale} governorates={[]} />

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
                <ChevronIcon className="w-5 h-5" />
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
                {isRTL
                  ? 'انضم كشريك - 3 شهور بدون عمولة'
                  : 'Join as a Partner - 3 months with 0% commission'}
                <ChevronIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer & PWA Install Prompt — client component islands */}
        <WelcomeClientIslands />
      </main>
    </WelcomeClientWrapper>
  );
}
