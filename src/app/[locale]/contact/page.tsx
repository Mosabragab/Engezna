'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { BottomNavigation } from '@/components/customer/layout/BottomNavigation';
import { useUserLocation } from '@/lib/contexts';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
  FileText,
  Home,
  Send,
  Loader2,
  CheckCircle2,
  Facebook,
} from 'lucide-react';

type InquiryType = 'general' | 'complaint' | 'suggestion' | 'partnership';

export default function ContactPage() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  // Check if user has selected location
  const { governorateId, isLoading: isLocationLoading } = useUserLocation();
  const hasLocation = !isLocationLoading && !!governorateId;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: 'general' as InquiryType,
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = {
    ar: {
      pageTitle: 'تواصل معنا',
      heroTitle: 'نحن هنا لمساعدتك',
      heroSubtitle: 'أرسل لنا رسالتك وسنرد عليك في أقرب وقت',
      contactFormTitle: 'أرسل لنا رسالة',
      contactFormSubtitle: 'سنرد عليك خلال 24 ساعة',
      form: {
        name: 'الاسم',
        namePlaceholder: 'اسمك الكريم',
        email: 'البريد الإلكتروني',
        emailPlaceholder: 'example@email.com',
        phone: 'رقم الواتساب',
        phonePlaceholder: '01xxxxxxxxx',
        phoneHint: 'للتواصل معك بشكل أسرع (اختياري)',
        inquiryType: 'نوع الاستفسار',
        inquiryTypes: {
          general: 'استفسار عام',
          complaint: 'شكوى',
          suggestion: 'اقتراح',
          partnership: 'طلب شراكة',
        },
        message: 'رسالتك',
        messagePlaceholder: 'اكتب رسالتك هنا...',
        submit: 'إرسال الرسالة',
        submitting: 'جاري الإرسال...',
        success: 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.',
        error: 'حدث خطأ. حاول مرة أخرى.',
      },
      otherWaysTitle: 'طرق أخرى للتواصل',
      contactMethods: [
        {
          icon: Mail,
          title: 'البريد الإلكتروني',
          description: 'للاستفسارات العامة والدعم',
          action: 'support@engezna.com',
          href: 'mailto:support@engezna.com',
        },
        {
          icon: Facebook,
          title: 'فيسبوك',
          description: 'تابعنا وتواصل معنا',
          action: 'engezna',
          href: 'https://facebook.com/engezna',
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
      heroSubtitle: 'Send us your message and we will respond as soon as possible',
      contactFormTitle: 'Send us a message',
      contactFormSubtitle: 'We will respond within 24 hours',
      form: {
        name: 'Name',
        namePlaceholder: 'Your name',
        email: 'Email',
        emailPlaceholder: 'example@email.com',
        phone: 'WhatsApp Number',
        phonePlaceholder: '01xxxxxxxxx',
        phoneHint: 'For faster communication (optional)',
        inquiryType: 'Inquiry Type',
        inquiryTypes: {
          general: 'General Inquiry',
          complaint: 'Complaint',
          suggestion: 'Suggestion',
          partnership: 'Partnership Request',
        },
        message: 'Your Message',
        messagePlaceholder: 'Write your message here...',
        submit: 'Send Message',
        submitting: 'Sending...',
        success: 'Your message has been sent successfully! We will contact you soon.',
        error: 'An error occurred. Please try again.',
      },
      otherWaysTitle: 'Other Ways to Contact',
      contactMethods: [
        {
          icon: Mail,
          title: 'Email',
          description: 'For general inquiries and support',
          action: 'support@engezna.com',
          href: 'mailto:support@engezna.com',
        },
        {
          icon: Facebook,
          title: 'Facebook',
          description: 'Follow us and get in touch',
          action: 'engezna',
          href: 'https://facebook.com/engezna',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          inquiryType: formData.inquiryType,
          message: formData.message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', inquiryType: 'general', message: '' });
    } catch {
      setError(t.form.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-white ${hasLocation ? 'pb-20 md:pb-0' : ''}`}>
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
      <section className="relative py-12 md:py-20 bg-gradient-to-br from-primary/5 via-white to-[#00C27A]/5 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-[#00C27A] rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">{t.heroTitle}</h1>
            <p className="text-lg md:text-xl text-slate-600">{t.heroSubtitle}</p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                {t.contactFormTitle}
              </h2>
              <p className="text-slate-600">{t.contactFormSubtitle}</p>
            </div>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-green-800">{t.form.success}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.form.name} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t.form.namePlaceholder}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.form.email} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t.form.emailPlaceholder}
                    dir="ltr"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                {/* WhatsApp Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.form.phone}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t.form.phonePlaceholder}
                    dir="ltr"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">{t.form.phoneHint}</p>
                </div>

                {/* Inquiry Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.form.inquiryType}
                  </label>
                  <select
                    value={formData.inquiryType}
                    onChange={(e) =>
                      setFormData({ ...formData, inquiryType: e.target.value as InquiryType })
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                  >
                    <option value="general">{t.form.inquiryTypes.general}</option>
                    <option value="complaint">{t.form.inquiryTypes.complaint}</option>
                    <option value="suggestion">{t.form.inquiryTypes.suggestion}</option>
                    <option value="partnership">{t.form.inquiryTypes.partnership}</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.form.message} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.form.messagePlaceholder}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.form.submitting}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {t.form.submit}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Other Contact Methods */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.otherWaysTitle}</h2>
          </div>

          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.contactMethods.map((method, index) => (
              <a
                key={index}
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 text-center"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <method.icon className="w-7 h-7 text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{method.title}</h3>
                <p className="text-slate-600 text-sm mb-2">{method.description}</p>
                <span className="text-primary font-medium">{method.action}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                {t.supportTitle}
              </h2>
              <p className="text-lg text-slate-600">{t.supportDescription}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {t.supportActions.map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="group flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
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
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Working Hours */}
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-primary" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.hoursTitle}</h3>
              <p className="text-primary font-semibold mb-1">{t.hoursText}</p>
              <p className="text-sm text-slate-600">{t.hoursSubtext}</p>
            </div>

            {/* Location */}
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-primary" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.locationTitle}</h3>
              <p className="text-slate-900 font-medium mb-1 text-sm">{t.companyName}</p>
              <p className="text-sm text-slate-600">{t.address}</p>
              <p className="text-sm text-slate-600">{t.city}</p>
            </div>

            {/* Emails */}
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{t.emailsTitle}</h3>
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

      {/* Bottom Navigation for Mobile - Only show if user has selected location */}
      {hasLocation && <BottomNavigation />}
    </div>
  );
}
