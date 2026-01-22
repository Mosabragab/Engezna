'use client';

import { useLocale } from 'next-intl';
import { Wrench, Clock, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function MaintenancePage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const content = {
    ar: {
      title: 'جاري الصيانة',
      subtitle: 'نعمل على تحسين تجربتك',
      description: 'نقوم حالياً بإجراء بعض التحسينات على المنصة. سنعود قريباً بتجربة أفضل!',
      estimatedTime: 'الوقت المتوقع: قريباً',
      contact: 'للاستفسارات العاجلة:',
      email: 'support@engezna.com',
      backHome: 'العودة للرئيسية',
      features: ['تحسينات في الأداء', 'تحديثات أمنية', 'ميزات جديدة قادمة'],
    },
    en: {
      title: 'Under Maintenance',
      subtitle: "We're improving your experience",
      description:
        "We're currently making some improvements to the platform. We'll be back soon with a better experience!",
      estimatedTime: 'Estimated time: Soon',
      contact: 'For urgent inquiries:',
      email: 'support@engezna.com',
      backHome: 'Back to Home',
      features: ['Performance improvements', 'Security updates', 'New features coming'],
    },
  };

  const t = content[locale as keyof typeof content] || content.en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
            <Wrench className="w-12 h-12 text-primary animate-bounce" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-primary/30 rounded-full animate-ping" />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t.title}</h1>
        <p className="text-xl text-primary mb-6">{t.subtitle}</p>

        {/* Description */}
        <p className="text-slate-300 mb-8 leading-relaxed">{t.description}</p>

        {/* Features being worked on */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-8 border border-slate-700">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-slate-300">{t.estimatedTime}</span>
          </div>
          <div className="space-y-2">
            {t.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full" />
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
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <Mail className="w-4 h-4" />
            {t.email}
          </a>
        </div>

        {/* Back Link (for admins) */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
        >
          <BackArrow className="w-4 h-4" />
          {t.backHome}
        </Link>

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
