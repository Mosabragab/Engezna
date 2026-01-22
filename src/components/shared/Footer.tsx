'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { createClient } from '@/lib/supabase/client';
import { Phone, MessageCircle, Facebook, MapPin, Mail } from 'lucide-react';

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

export function Footer() {
  const locale = useLocale();
  const t = useTranslations('footer');
  const [governorates, setGovernorates] = useState<Governorate[]>([]);

  useEffect(() => {
    async function fetchGovernorates() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('governorates')
          .select('id, name_ar, name_en, is_active')
          .eq('is_active', true)
          .order('name_ar');
        setGovernorates(data || []);
      } catch {
        // Silent fail
      }
    }
    fetchGovernorates();
  }, []);

  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      {/* Main Content - Compact */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          {/* Brand + Social */}
          <div className="flex flex-col items-center lg:items-start gap-3">
            <Link href={`/${locale}`}>
              <EngeznaLogo size="md" static showPen={false} />
            </Link>
            <p className="text-slate-500 text-sm text-center lg:text-start max-w-xs">
              {t('tagline')}
            </p>
            {/* Social - Inline */}
            <div className="flex items-center gap-2">
              <a
                href="https://wa.me/201XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#25D366] hover:border-[#25D366] transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com/engezna"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#1877F2] hover:border-[#1877F2] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="mailto:support@engezna.com"
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links - Horizontal on Desktop */}
          <div className="flex flex-wrap justify-center lg:justify-end gap-x-8 gap-y-4 text-sm">
            {/* Customers */}
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-slate-700 text-xs uppercase tracking-wide">
                {t('forCustomers')}
              </span>
              <Link
                href={`/${locale}`}
                className="text-slate-500 hover:text-primary transition-colors"
              >
                {t('home')}
              </Link>
              <Link
                href={`/${locale}/orders`}
                className="text-slate-500 hover:text-primary transition-colors"
              >
                {t('myOrders')}
              </Link>
              <Link
                href={`/${locale}/help`}
                className="text-slate-500 hover:text-primary transition-colors"
              >
                {locale === 'ar' ? 'المساعدة' : 'Help'}
              </Link>
            </div>

            {/* Partners */}
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-slate-700 text-xs uppercase tracking-wide">
                {t('forPartners')}
              </span>
              <Link
                href={`/${locale}/partner`}
                className="text-slate-500 hover:text-primary transition-colors"
              >
                {t('becomePartner')}
              </Link>
              <Link
                href={`/${locale}/provider/login`}
                className="text-slate-500 hover:text-primary transition-colors"
              >
                {t('partnerLogin')}
              </Link>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-slate-700 text-xs uppercase tracking-wide">
                {t('contactUs')}
              </span>
              <a
                href="tel:+201XXXXXXXXX"
                className="text-slate-500 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">+20 1XX XXX XXXX</span>
              </a>
              <a
                href="mailto:support@engezna.com"
                className="text-slate-500 hover:text-primary transition-colors"
              >
                support@engezna.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Governorates + Copyright */}
      <div className="border-t border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            {/* Governorates */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>{t('availableGovernorates')}:</span>
              {governorates.length > 0 ? (
                governorates.map((gov, i) => (
                  <span key={gov.id}>
                    {locale === 'ar' ? gov.name_ar : gov.name_en}
                    {i < governorates.length - 1 && <span className="text-slate-300 mx-1">•</span>}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">{locale === 'ar' ? 'قريباً' : 'Coming soon'}</span>
              )}
            </div>

            {/* Links + Copyright */}
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link href={`/${locale}/about`} className="hover:text-primary transition-colors">
                {locale === 'ar' ? 'من نحن' : 'About'}
              </Link>
              <Link href={`/${locale}/privacy`} className="hover:text-primary transition-colors">
                {t('privacy')}
              </Link>
              <Link href={`/${locale}/terms`} className="hover:text-primary transition-colors">
                {t('terms')}
              </Link>
              <span className="text-slate-400">
                © 2026 {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
