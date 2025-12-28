'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/shared/Footer'
import {
  Gift,
  Percent,
  LayoutDashboard,
  MapPin,
  BarChart3,
  HeadphonesIcon,
  UserPlus,
  Store,
  Rocket,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Users,
  ShoppingBag,
  Building2,
  Home,
} from 'lucide-react'
import { useState } from 'react'
import { PartnerBannersCarousel } from '@/components/partner/PartnerBannersCarousel'

export default function PartnerLandingPage() {
  const locale = useLocale()
  const t = useTranslations('partnerLanding')
  const isRTL = locale === 'ar'

  const benefits = [
    {
      icon: Gift,
      title: t('benefits.freeRegistration'),
      description: t('benefits.freeRegistrationDesc'),
      color: 'text-[#009DE0]',
      bgColor: 'bg-[#E0F4FF]',
    },
    {
      icon: Percent,
      title: t('benefits.zeroCommission'),
      description: t('benefits.zeroCommissionDesc'),
      color: 'text-[#00C27A]',
      bgColor: 'bg-[#DCFCE7]',
    },
    {
      icon: LayoutDashboard,
      title: t('benefits.easyDashboard'),
      description: t('benefits.easyDashboardDesc'),
      color: 'text-[#009DE0]',
      bgColor: 'bg-[#E0F4FF]',
    },
    {
      icon: MapPin,
      title: t('benefits.localDelivery'),
      description: t('benefits.localDeliveryDesc'),
      color: 'text-[#009DE0]',
      bgColor: 'bg-[#E0F4FF]',
    },
    {
      icon: BarChart3,
      title: t('benefits.analytics'),
      description: t('benefits.analyticsDesc'),
      color: 'text-[#009DE0]',
      bgColor: 'bg-[#E0F4FF]',
    },
    {
      icon: HeadphonesIcon,
      title: t('benefits.support'),
      description: t('benefits.supportDesc'),
      color: 'text-[#009DE0]',
      bgColor: 'bg-[#E0F4FF]',
    },
  ]

  const steps = [
    {
      icon: UserPlus,
      title: t('steps.step1Title'),
      description: t('steps.step1Desc'),
      number: '1',
    },
    {
      icon: Store,
      title: t('steps.step2Title'),
      description: t('steps.step2Desc'),
      number: '2',
    },
    {
      icon: Rocket,
      title: t('steps.step3Title'),
      description: t('steps.step3Desc'),
      number: '3',
    },
  ]

  const faqs = [
    { q: t('faqs.q1'), a: t('faqs.a1') },
    { q: t('faqs.q2'), a: t('faqs.a2') },
    { q: t('faqs.q3'), a: t('faqs.a3') },
    { q: t('faqs.q4'), a: t('faqs.a4') },
    { q: t('faqs.q5'), a: t('faqs.a5') },
  ]

  const stats = [
    { value: '500+', label: t('stats.partners'), icon: Users },
    { value: '10K+', label: t('stats.orders'), icon: ShoppingBag },
    { value: '5', label: t('stats.cities'), icon: Building2 },
  ]

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#009DE0]/5 via-white to-[#00C27A]/5">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-72 h-72 bg-[#009DE0] rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-[#00C27A] rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          {/* Header Nav */}
          <header className="py-6 border-b border-[#E2E8F0]/50">
            <div className="flex items-center justify-between">
              {/* Left - Already Partner */}
              <Link
                href={`/${locale}/provider/login`}
                className="text-[#009DE0] hover:text-[#0086c3] font-medium flex items-center gap-2 text-sm md:text-base"
              >
                {t('alreadyPartner')}
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Link>

              {/* Center - Logo with Animation */}
              <Link href={`/${locale}/partner`} className="absolute left-1/2 -translate-x-1/2">
                <EngeznaLogo size="lg" showPen loop loopDelay={4000} />
              </Link>

              {/* Right - Home Link */}
              <Link
                href={`/${locale}`}
                className="text-[#475569] hover:text-[#0F172A] font-medium flex items-center gap-2 text-sm md:text-base"
              >
                <Home className="w-4 h-4" strokeWidth={1.8} />
                {locale === 'ar' ? 'الصفحة الرئيسية' : 'Home'}
              </Link>
            </div>
          </header>

          {/* Hero Content */}
          <div className="py-20 md:py-28">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0F172A] mb-6 animate-fade-in">
                {t('heroTitle')}
              </h1>
              <p className="text-xl md:text-2xl text-[#475569] mb-10 max-w-2xl mx-auto">
                {t('heroSubtitle')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <Link href={`/${locale}/partner/register`}>
                  <Button size="lg" className="bg-[#009DE0] hover:bg-[#0086c3] text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-[#009DE0]/25 transition-all hover:scale-105">
                    <Store className="w-5 h-5 me-2" strokeWidth={1.8} />
                    {t('registerFree')}
                  </Button>
                </Link>
                <Link href={`/${locale}/provider/login`}>
                  <Button variant="outline" size="lg" className="px-8 py-6 text-lg rounded-xl border-[#009DE0] text-[#009DE0] hover:bg-[#009DE0] hover:text-white transition-all duration-200">
                    {t('login')}
                  </Button>
                </Link>
              </div>

              {/* Stats with Animation */}
              <div className="grid grid-cols-3 gap-6 md:gap-12 max-w-xl mx-auto">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="text-center animate-fade-in-up"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-12 h-12 bg-[#E0F4FF] rounded-xl flex items-center justify-center">
                        <stat.icon className="w-6 h-6 text-[#009DE0]" strokeWidth={1.8} />
                      </div>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-[#0F172A]">{stat.value}</div>
                    <div className="text-sm md:text-base text-[#475569]">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Banners Carousel */}
      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4">
          <PartnerBannersCarousel autoPlayInterval={6000} />
        </div>
      </section>

      {/* Benefits Section */}
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              {t('whyEngezna')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${benefit.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <benefit.icon className={`w-7 h-7 ${benefit.color}`} strokeWidth={1.8} />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-2">
                  {benefit.title}
                </h3>
                <p className="text-[#475569]">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              {t('howItWorks')}
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative text-center">
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`hidden md:block absolute top-10 ${isRTL ? 'right-0 -translate-x-1/2' : 'left-full -translate-x-1/2'} w-full h-0.5 bg-gradient-to-r from-[#009DE0]/30 to-[#009DE0]/10`} />
                  )}

                  {/* Step Number */}
                  <div className="w-20 h-20 bg-gradient-to-br from-[#009DE0] to-[#0086c3] rounded-full flex items-center justify-center mx-auto mb-4 shadow-elegant-lg relative z-10">
                    <span className="text-3xl font-bold text-white">{step.number}</span>
                  </div>

                  <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[#475569]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              {t('faqTitle')}
            </h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-elegant hover:shadow-elegant-lg transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-start hover:bg-slate-50/50 transition-colors"
                >
                  <span className="font-semibold text-[#0F172A]">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${openFaq === index ? 'bg-primary/10 rotate-180' : 'bg-slate-100'}`}>
                    <ChevronDown className={`w-4 h-4 transition-colors ${openFaq === index ? 'text-primary' : 'text-slate-500'}`} />
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-6 pb-5 text-[#475569] leading-relaxed">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[#009DE0] via-[#0086c3] to-[#006d9e] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-white rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant-lg">
              <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={1.8} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('readyToJoin')}
            </h2>
            <p className="text-xl text-white/90 mb-8">
              {t('readyToJoinSubtitle')}
            </p>
            <Link href={`/${locale}/partner/register`}>
              <Button size="lg" className="bg-white text-[#009DE0] hover:bg-slate-50 hover:scale-105 px-8 py-6 text-lg rounded-2xl shadow-elegant-lg transition-all duration-300">
                <Store className="w-5 h-5 me-2" strokeWidth={1.8} />
                {t('registerFree')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
