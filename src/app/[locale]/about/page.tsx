'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { Footer } from '@/components/shared/Footer';
import { BottomNavigation } from '@/components/customer/layout/BottomNavigation';
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Eye,
  Heart,
  Users,
  MapPin,
  Zap,
  Shield,
  Sparkles,
  Building2,
  Home,
} from 'lucide-react';

export default function AboutPage() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const content = {
    ar: {
      pageTitle: 'من نحن',
      heroTitle: 'قصة إنجزنا',
      heroSubtitle: 'منصّة بدأت من المحافظات... وهتوصل لكل مصر',
      storyTitle: 'قصتنا',
      storyParagraphs: [
        'في مدن المحافظات... الحياة ماشية بسرعة، لكن التكنولوجيا لسه بتيجي ورا متأخرة.',
        'العميل عايز يطلب أكل، دواء، بقالة، خضار... والمحل أو المطعم شغّال طول اليوم على التليفون: خطوط مشغولة... طلبات بتضيع... وزباين بتزهق وتنسحب.',
        'وفي النص، صاحب المحل بيخسر رزق... والعميل بيضيع عليه وقت... ولا دا راضي... ولا دا قادر يحلّها.',
        'هنا اتولدت منصّة إنجزنا.',
      ],
      promiseTitle: 'وعدنا',
      promiseItems: [
        'مفيش انتظار على خطوط مشغولة',
        'اتصال بسيط وسريع وعادل بين العميل والتاجر',
        'تمكين الأعمال المحلية في كل مصر',
      ],
      missionTitle: 'مهمتنا',
      missionText:
        'تحديث تجربة الطلب اليومي لكل المصريين بجعلها سريعة وعادلة ومتاحة للعملاء وأصحاب الأعمال المحلية - بدءاً من المحافظات والتوسع لتغطية كل مصر.',
      visionTitle: 'رؤيتنا',
      visionText:
        'أن نصبح البنية التحتية الرقمية الأساسية لخدمات المستهلك (الطعام، البقالة، الصيدلة، المنتجات الطازجة) في جميع محافظات مصر - من المدن الثانوية إلى المناطق الحضرية الكبرى.',
      valuesTitle: 'قيمنا',
      values: [
        {
          icon: Sparkles,
          title: 'البساطة',
          description: 'لا تعقيد ولا لف ولا دوران - كل حاجة واضحة ومباشرة',
        },
        {
          icon: Shield,
          title: 'العدالة',
          description: 'رسوم منخفضة للجميع - 7% فقط كحد أقصى للتجار، صفر للعملاء',
        },
        {
          icon: MapPin,
          title: 'المحلية',
          description: 'نفهم كل المحافظات ونتكلم بلغتهم',
        },
        {
          icon: Zap,
          title: 'السرعة',
          description: 'اتصال فوري بالتاجر - مفيش وقت ضايع',
        },
        {
          icon: Users,
          title: 'الشمولية',
          description: 'من المحافظات للعاصمة - الخدمة الحلوة حق للجميع',
        },
      ],
      numbersTitle: 'إنجزنا بالأرقام',
      numbers: [
        { value: '7%', label: 'عمولة كحد أقصى' },
        { value: '0', label: 'رسوم تسجيل' },
        { value: '3', label: 'شهور بدون عمولة' },
        { value: '24/7', label: 'خدمة متاحة' },
      ],
      companyTitle: 'معلومات الشركة',
      companyName: 'سويفكم للتجارة والتصدير (ذ.م.م)',
      registryNumber: 'سجل تجاري: 2767',
      address: 'ش صالح حمام بجوار مسجد الاباصيري - بني سويف، مصر',
      tagline: 'عايز تطلب؟ إنجزنا!',
      backToHome: 'الرئيسية',
    },
    en: {
      pageTitle: 'About Us',
      heroTitle: 'The Engezna Story',
      heroSubtitle: 'A platform born in the governorates... reaching all of Egypt',
      storyTitle: 'Our Story',
      storyParagraphs: [
        "In Egypt's governorate cities... life moves fast, but technology often lags behind.",
        'Customers want to order food, medicine, groceries, vegetables... but shops and restaurants are tied to phones all day: busy lines, lost orders, and frustrated customers who give up.',
        'In the middle, shop owners lose business... customers waste time... neither satisfied... neither able to fix it.',
        'This is where Engezna was born.',
      ],
      promiseTitle: 'Our Promise',
      promiseItems: [
        'No more waiting on busy phone lines',
        'Simple, fast, fair connection between customer and merchant',
        'Empowerment for local businesses across all of Egypt',
      ],
      missionTitle: 'Our Mission',
      missionText:
        'To modernize everyday ordering for all Egyptians by making it fast, fair, and accessible for both customers and local businesses – starting from the governorates and expanding to cover all of Egypt.',
      visionTitle: 'Our Vision',
      visionText:
        'To become the default digital infrastructure for consumer services (food, groceries, pharma, fresh produce) across all Egyptian governorates – from secondary cities to major metropolitan areas.',
      valuesTitle: 'Our Values',
      values: [
        {
          icon: Sparkles,
          title: 'Simplicity',
          description: 'No complexity, no runaround - everything is clear and direct',
        },
        {
          icon: Shield,
          title: 'Fairness',
          description: 'Low fees for everyone - max 7% for merchants, zero for customers',
        },
        {
          icon: MapPin,
          title: 'Locality',
          description: 'We understand every governorate and speak their language',
        },
        {
          icon: Zap,
          title: 'Speed',
          description: 'Instant connection to merchants - no wasted time',
        },
        {
          icon: Users,
          title: 'Inclusivity',
          description: 'From governorates to the capital - great service is for everyone',
        },
      ],
      numbersTitle: 'Engezna by Numbers',
      numbers: [
        { value: '7%', label: 'Maximum Commission' },
        { value: '0', label: 'Registration Fees' },
        { value: '3', label: 'Months Zero Commission' },
        { value: '24/7', label: 'Service Available' },
      ],
      companyTitle: 'Company Information',
      companyName: 'Sweifcom for Trade and Export (LLC)',
      registryNumber: 'Commercial Registry: 2767',
      address: 'Saleh Hammam St., next to Al-Abasiri Mosque, Beni Suef, Egypt',
      tagline: 'Want to order? Engezna!',
      backToHome: 'Home',
    },
  };

  const t = isArabic ? content.ar : content.en;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors"
            >
              {isArabic ? (
                <ArrowRight className="w-5 h-5" strokeWidth={1.8} />
              ) : (
                <ArrowLeft className="w-5 h-5" strokeWidth={1.8} />
              )}
              <Home className="w-5 h-5" strokeWidth={1.8} />
              <span className="font-medium">{t.backToHome}</span>
            </Link>

            <Link href={`/${locale}`}>
              <EngeznaLogo size="md" showPen={false} static />
            </Link>

            <div className="w-24" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-gradient-to-br from-primary/5 via-white to-[#00C27A]/5 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-[#00C27A] rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              {t.heroTitle}
            </h1>
            <p className="text-xl md:text-2xl text-slate-600">{t.heroSubtitle}</p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" strokeWidth={1.8} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.storyTitle}</h2>
            </div>

            <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
              {t.storyParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {/* Promise Box */}
            <div className="mt-10 p-6 bg-primary/5 rounded-2xl border border-primary/10">
              <h3 className="text-xl font-bold text-slate-900 mb-4">{t.promiseTitle}</h3>
              <ul className="space-y-3">
                {t.promiseItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Mission */}
            <div className="bg-white p-8 rounded-2xl shadow-elegant">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Target className="w-7 h-7 text-primary" strokeWidth={1.8} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{t.missionTitle}</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">{t.missionText}</p>
            </div>

            {/* Vision */}
            <div className="bg-white p-8 rounded-2xl shadow-elegant">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-[#00C27A]/10 rounded-xl flex items-center justify-center">
                  <Eye className="w-7 h-7 text-[#00C27A]" strokeWidth={1.8} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{t.visionTitle}</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">{t.visionText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{t.valuesTitle}</h2>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.values.map((value, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-2xl border border-slate-100 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{value.title}</h3>
                <p className="text-slate-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-primary via-primary/90 to-[#0086c3]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white">{t.numbersTitle}</h2>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {t.numbers.map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{item.value}</div>
                <div className="text-white/80">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-slate-600" strokeWidth={1.8} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.companyTitle}</h2>
            </div>

            <div className="space-y-4 text-slate-600">
              <p className="font-semibold text-lg text-slate-900">{t.companyName}</p>
              <p>{t.registryNumber}</p>
              <p>{t.address}</p>
            </div>

            {/* Tagline */}
            <div className="mt-10 p-6 bg-primary/5 rounded-2xl">
              <p className="text-2xl font-bold text-primary">{t.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Hidden on mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  );
}
