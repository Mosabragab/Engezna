'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Wrench, Clock, Mail, Shield, Store, Users, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function MaintenancePage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const isRTL = locale === 'ar';

  // Get maintenance type from URL params (provider or customer)
  const maintenanceType = searchParams.get('type') || 'customer';
  const isProviderMaintenance = maintenanceType === 'provider';

  const content = {
    ar: {
      // Customer maintenance content
      customer: {
        title: 'جاري الصيانة',
        subtitle: 'نعمل على تحسين تجربتك',
        description: 'نقوم حالياً بإجراء بعض التحسينات على المنصة. سنعود قريباً بتجربة أفضل!',
        features: ['تحسينات في الأداء', 'تحديثات أمنية', 'ميزات جديدة قادمة'],
      },
      // Provider maintenance content
      provider: {
        title: 'صيانة لوحة التحكم',
        subtitle: 'لوحة تحكم التجار قيد الصيانة',
        description:
          'نقوم حالياً بإجراء تحديثات على لوحة تحكم التجار. يرجى المحاولة مرة أخرى لاحقاً.',
        features: ['تحسينات في الأداء', 'ميزات جديدة للتجار', 'تحديثات على النظام'],
      },
      // Common content
      estimatedTime: 'الوقت المتوقع: قريباً',
      contact: 'للاستفسارات العاجلة:',
      email: 'support@engezna.com',
      adminLogin: 'دخول المشرفين',
      providerLogin: 'دخول التجار',
    },
    en: {
      // Customer maintenance content
      customer: {
        title: 'Under Maintenance',
        subtitle: "We're improving your experience",
        description:
          "We're currently making some improvements to the platform. We'll be back soon with a better experience!",
        features: ['Performance improvements', 'Security updates', 'New features coming'],
      },
      // Provider maintenance content
      provider: {
        title: 'Dashboard Maintenance',
        subtitle: 'Provider dashboard is under maintenance',
        description:
          "We're currently making updates to the provider dashboard. Please try again later.",
        features: ['Performance improvements', 'New provider features', 'System updates'],
      },
      // Common content
      estimatedTime: 'Estimated time: Soon',
      contact: 'For urgent inquiries:',
      email: 'support@engezna.com',
      adminLogin: 'Admin Login',
      providerLogin: 'Provider Login',
    },
  };

  const t = content[locale as keyof typeof content] || content.en;
  const typeContent = isProviderMaintenance ? t.provider : t.customer;
  const TypeIcon = isProviderMaintenance ? Store : Users;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-lg w-full text-center">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
            <Wrench className="w-12 h-12 text-primary animate-bounce" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-primary/30 rounded-full animate-ping" />
        </div>

        {/* Maintenance Type Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full mb-6 border border-slate-700">
          <TypeIcon className="w-4 h-4 text-primary" />
          <span className="text-slate-300 text-sm">
            {isProviderMaintenance
              ? isRTL
                ? 'صيانة التجار'
                : 'Provider Maintenance'
              : isRTL
                ? 'صيانة عامة'
                : 'General Maintenance'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{typeContent.title}</h1>
        <p className="text-xl text-primary mb-6">{typeContent.subtitle}</p>

        {/* Description */}
        <p className="text-slate-300 mb-8 leading-relaxed">{typeContent.description}</p>

        {/* Features being worked on */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-8 border border-slate-700">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-slate-300">{t.estimatedTime}</span>
          </div>
          <div className="space-y-2">
            {typeContent.features.map((feature, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-slate-400 text-sm ${isRTL ? 'flex-row-reverse justify-center' : 'justify-center'}`}
              >
                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mb-8">
          <p className="text-slate-400 mb-2">{t.contact}</p>
          <a
            href={`mailto:${t.email}`}
            className={`inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Mail className="w-4 h-4" />
            {t.email}
          </a>
        </div>

        {/* Login Links for Staff */}
        <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
          <div
            className={`flex items-center justify-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Shield className="w-5 h-5 text-slate-400" />
            <span className="text-slate-400 text-sm">{isRTL ? 'للموظفين فقط' : 'Staff Only'}</span>
          </div>

          <div
            className={`flex items-center justify-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {/* Admin Login */}
            <Link
              href={`/${locale}/admin/login`}
              className={`inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <LogIn className="w-4 h-4" />
              {t.adminLogin}
            </Link>

            {/* Provider Login - Only show if customer maintenance */}
            {!isProviderMaintenance && (
              <Link
                href={`/${locale}/provider/login`}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Store className="w-4 h-4" />
                {t.providerLogin}
              </Link>
            )}
          </div>
        </div>

        {/* Logo */}
        <div className="mt-12 opacity-50">
          <span className="text-2xl font-bold text-white">إنجزنا</span>
          <span className="text-slate-500 mx-2">|</span>
          <span className="text-slate-400">Engezna</span>
        </div>
      </div>
    </div>
  );
}
