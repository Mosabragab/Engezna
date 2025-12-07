'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { createClient } from '@/lib/supabase/client'
import {
  Phone,
  MessageCircle,
  Facebook,
  MapPin,
  Store,
  LogIn,
  Sparkles,
  HelpCircle,
  Home,
  ShoppingBag,
  Heart,
  User,
  Mail,
  Loader2
} from 'lucide-react'

interface Governorate {
  id: string
  name_ar: string
  name_en: string
  is_active: boolean
}

export function Footer() {
  const locale = useLocale()
  const t = useTranslations('footer')
  const isRTL = locale === 'ar'
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch active governorates from database
  useEffect(() => {
    async function fetchGovernorates() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('governorates')
          .select('id, name_ar, name_en, is_active')
          .eq('is_active', true)
          .order('name_ar')

        if (error) {
          console.error('Error fetching governorates:', error)
        } else {
          setGovernorates(data || [])
        }
      } catch (err) {
        console.error('Error fetching governorates:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGovernorates()
  }, [])

  const customerLinks = [
    { href: `/${locale}`, label: t('home'), icon: Home },
    { href: `/${locale}/orders`, label: t('myOrders'), icon: ShoppingBag },
    { href: `/${locale}/favorites`, label: t('favorites'), icon: Heart },
    { href: `/${locale}/profile/account`, label: t('myAccount'), icon: User },
  ]

  const partnerLinks = [
    { href: `/${locale}/partner`, label: t('becomePartner'), icon: Store },
    { href: `/${locale}/provider/login`, label: t('partnerLogin'), icon: LogIn },
    { href: `/${locale}/partner#features`, label: t('features'), icon: Sparkles },
    { href: `/${locale}/partner#faq`, label: t('faq'), icon: HelpCircle },
  ]

  return (
    <footer className="bg-[#F1F5F9] border-t border-[#E2E8F0]">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link href={`/${locale}`} className="inline-block">
              <EngeznaLogo size="md" static showPen={false} />
            </Link>
            <p className="text-[#475569] text-sm leading-relaxed">
              {t('tagline')}
            </p>
            <p className="text-[#475569] text-sm">
              {t('description')}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://wa.me/201XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all duration-200 shadow-sm"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" strokeWidth={1.8} />
              </a>
              <a
                href="https://facebook.com/engezna"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all duration-200 shadow-sm"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" strokeWidth={1.8} />
              </a>
              <a
                href="mailto:support@engezna.com"
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#009DE0] hover:bg-[#009DE0] hover:text-white transition-all duration-200 shadow-sm"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" strokeWidth={1.8} />
              </a>
            </div>
          </div>

          {/* For Customers */}
          <div>
            <h3 className="font-bold text-[#0F172A] mb-4 text-lg">
              {t('forCustomers')}
            </h3>
            <ul className="space-y-3">
              {customerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-[#475569] hover:text-[#009DE0] transition-colors"
                  >
                    <link.icon className="w-4 h-4" strokeWidth={1.8} />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Partners */}
          <div>
            <h3 className="font-bold text-[#0F172A] mb-4 text-lg">
              {t('forPartners')}
            </h3>
            <ul className="space-y-3">
              {partnerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-[#475569] hover:text-[#009DE0] transition-colors"
                  >
                    <link.icon className="w-4 h-4" strokeWidth={1.8} />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Partner CTA */}
            <Link
              href={`/${locale}/partner/register`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#009DE0] text-white rounded-lg hover:bg-[#0086c3] transition-colors text-sm font-medium"
            >
              <Store className="w-4 h-4" strokeWidth={1.8} />
              {t('registerNow')}
            </Link>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="font-bold text-[#0F172A] mb-4 text-lg">
              {t('contactUs')}
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="tel:+201XXXXXXXXX"
                  className="flex items-center gap-2 text-[#475569] hover:text-[#009DE0] transition-colors"
                >
                  <Phone className="w-4 h-4" strokeWidth={1.8} />
                  <span dir="ltr">+20 1XX XXX XXXX</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/201XXXXXXXXX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#475569] hover:text-[#25D366] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
                  <span>{t('whatsappSupport')}</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@engezna.com"
                  className="flex items-center gap-2 text-[#475569] hover:text-[#009DE0] transition-colors"
                >
                  <Mail className="w-4 h-4" strokeWidth={1.8} />
                  <span>support@engezna.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Available Governorates - Dynamic from database */}
      <div className="border-t border-[#E2E8F0] bg-white/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-[#009DE0]" strokeWidth={1.8} />
            <span className="text-[#475569] font-medium">{t('availableGovernorates')}:</span>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#009DE0]" />
            ) : governorates.length > 0 ? (
              governorates.map((gov, index) => (
                <span key={gov.id} className="text-[#0F172A]">
                  {locale === 'ar' ? gov.name_ar : gov.name_en}
                  {index < governorates.length - 1 && (
                    <span className="text-[#94A3B8] mx-1">•</span>
                  )}
                </span>
              ))
            ) : (
              <span className="text-[#94A3B8]">
                {locale === 'ar' ? 'قريباً' : 'Coming soon'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-[#E2E8F0] bg-[#0F172A]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
            <p className="text-slate-400">
              {t('copyright')}
            </p>
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}/privacy`}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {t('privacy')}
              </Link>
              <span className="text-slate-600">|</span>
              <Link
                href={`/${locale}/terms`}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {t('terms')}
              </Link>
              <span className="text-slate-600">|</span>
              <Link
                href={`/${locale}/admin/login`}
                className="text-slate-500 hover:text-white transition-colors text-xs"
              >
                {locale === 'ar' ? 'المشرفين' : 'Admin'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
