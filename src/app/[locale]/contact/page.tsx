'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { Footer } from '@/components/shared/Footer';
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Clock,
  HelpCircle,
  FileText,
  Home,
  ExternalLink,
} from 'lucide-react';

export default function ContactPage() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const content = {
    ar: {
      pageTitle: 'تواصل معنا',
      heroTitle: 'نحن هنا لمساعدتك',
      heroSubtitle: 'تواصل معنا بالطريقة اللي تناسبك',
      contactMethodsTitle: 'طرق التواصل',
      contactMethods: [
        {
          icon: MessageCircle,
          title: 'واتساب',
          description: 'أسرع طريقة للتواصل معنا',
          action: 'ابدأ محادثة',
          href: 'https://wa.me/201XXXXXXXXX',
          color: 'text-[#25D366]',
          bgColor: 'bg-[#25D366]/10',
          hoverBg: 'hover:bg-[#25D366]',
        },
        {
          icon: Mail,
          title: 'البريد الإلكتروني',
          description: 'للاستفسارات العامة والدعم',
          action: 'support@engezna.com',
          href: 'mailto:support@engezna.com',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          hoverBg: 'hover:bg-primary',
        },
        {
          icon: Phone,
          title: 'الهاتف',
          description: 'اتصل بنا مباشرة',
          action: '+20 1XX XXX XXXX',
          href: 'tel:+201XXXXXXXXX',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          hoverBg: 'hover:bg-primary',
        },
      ],
      supportTitle: 'الدعم الفني',
      supportDescription: 'عندك مشكلة في طلب أو محتاج مساعدة؟',
      supportActions: [
        {
          icon: HelpCircle,
          title: 'مركز المساعدة',
          description: 'أسئلة شائعة وإجابات سريعة',
          href: `/${locale}/help`,
        },
        {
          icon: FileText,
          title: 'تذاكر الدعم',
          description: 'تتبع شكاواك واستفساراتك',
          href: `/${locale}/profile/support`,
        },
      ],
      hoursTitle: 'ساعات العمل',
      hoursText: 'فريق الدعم متاح 24/7',
      hoursSubtext: 'نرد على استفساراتك في أقرب وقت ممكن',
      locationTitle: 'العنوان',
      companyName: 'سويفكم للتجارة والتصدير (ذ.م.م)',
      address: 'ش صالح حمام بجوار مسجد الاباصيري',
      city: 'بني سويف، مصر',
      emailsTitle: 'البريد الإلكتروني',
      emails: [
        { label: 'الدعم العام', email: 'support@engezna.com' },
        { label: 'الخصوصية', email: 'privacy@engezna.com' },
        { label: 'الاستفسارات القانونية', email: 'legal@engezna.com' },
      ],
      backToHome: 'الرئيسية',
    },
    en: {
      pageTitle: 'Contact Us',
      heroTitle: "We're Here to Help",
      heroSubtitle: 'Reach out to us in the way that suits you best',
      contactMethodsTitle: 'Contact Methods',
      contactMethods: [
        {
          icon: MessageCircle,
          title: 'WhatsApp',
          description: 'Fastest way to reach us',
          action: 'Start Chat',
          href: 'https://wa.me/201XXXXXXXXX',
          color: 'text-[#25D366]',
          bgColor: 'bg-[#25D366]/10',
          hoverBg: 'hover:bg-[#25D366]',
        },
        {
          icon: Mail,
          title: 'Email',
          description: 'For general inquiries and support',
          action: 'support@engezna.com',
          href: 'mailto:support@engezna.com',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          hoverBg: 'hover:bg-primary',
        },
        {
          icon: Phone,
          title: 'Phone',
          description: 'Call us directly',
          action: '+20 1XX XXX XXXX',
          href: 'tel:+201XXXXXXXXX',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          hoverBg: 'hover:bg-primary',
        },
      ],
      supportTitle: 'Technical Support',
      supportDescription: 'Having an issue with an order or need help?',
      supportActions: [
        {
          icon: HelpCircle,
          title: 'Help Center',
          description: 'FAQs and quick answers',
          href: `/${locale}/help`,
        },
        {
          icon: FileText,
          title: 'Support Tickets',
          description: 'Track your complaints and inquiries',
          href: `/${locale}/profile/support`,
        },
      ],
      hoursTitle: 'Working Hours',
      hoursText: 'Support team available 24/7',
      hoursSubtext: 'We respond to your inquiries as soon as possible',
      locationTitle: 'Address',
      companyName: 'Sweifcom for Trade and Export (LLC)',
      address: 'Saleh Hammam St., next to Al-Abasiri Mosque',
      city: 'Beni Suef, Egypt',
      emailsTitle: 'Email Addresses',
      emails: [
        { label: 'General Support', email: 'support@engezna.com' },
        { label: 'Privacy', email: 'privacy@engezna.com' },
        { label: 'Legal Inquiries', email: 'legal@engezna.com' },
      ],
      backToHome: 'Home',
    },
  };

  const t = isArabic ? content.ar : content.en;

  return (
    <div className="min-h-screen bg-white">
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

      {/* Contact Methods */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {t.contactMethodsTitle}
            </h2>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.contactMethods.map((method, index) => (
              <a
                key={index}
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={`group p-6 bg-white rounded-2xl border border-slate-100 shadow-elegant hover:shadow-elegant-lg transition-all duration-300 text-center ${method.hoverBg} hover:text-white`}
              >
                <div
                  className={`w-16 h-16 ${method.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-white/20 transition-colors`}
                >
                  <method.icon
                    className={`w-8 h-8 ${method.color} group-hover:text-white transition-colors`}
                    strokeWidth={1.8}
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-white transition-colors">
                  {method.title}
                </h3>
                <p className="text-slate-600 mb-4 group-hover:text-white/80 transition-colors">
                  {method.description}
                </p>
                <span className="inline-flex items-center gap-2 font-semibold text-primary group-hover:text-white transition-colors">
                  {method.action}
                  {method.href.startsWith('http') && (
                    <ExternalLink className="w-4 h-4" strokeWidth={1.8} />
                  )}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {t.supportTitle}
              </h2>
              <p className="text-xl text-slate-600">{t.supportDescription}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {t.supportActions.map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="group flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-elegant hover:shadow-elegant-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <action.icon className="w-7 h-7 text-primary" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{action.title}</h3>
                    <p className="text-slate-600">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Working Hours */}
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-elegant text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-primary" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.hoursTitle}</h3>
              <p className="text-primary font-semibold mb-1">{t.hoursText}</p>
              <p className="text-sm text-slate-600">{t.hoursSubtext}</p>
            </div>

            {/* Location */}
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-elegant text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-primary" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.locationTitle}</h3>
              <p className="text-slate-900 font-medium mb-1">{t.companyName}</p>
              <p className="text-sm text-slate-600">{t.address}</p>
              <p className="text-sm text-slate-600">{t.city}</p>
            </div>

            {/* Emails */}
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-elegant text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">{t.emailsTitle}</h3>
              <div className="space-y-2">
                {t.emails.map((item, index) => (
                  <div key={index}>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <a
                      href={`mailto:${item.email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {item.email}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
