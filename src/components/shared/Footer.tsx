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
    { href: `/${locale}/help`, label: locale === 'ar' ? 'مركز المساعدة' : 'Help Center', icon: HelpCircle },
    { href: `/${locale}/profile/support`, label: locale === 'ar' ? 'الدعم والشكاوى' : 'Support & Complaints', icon: MessageCircle },
  ]

  const partnerLinks = [
    { href: `/${locale}/partner`, label: t('becomePartner'), icon: Store },
    { href: `/${locale}/provider/login`, label: t('partnerLogin'), icon: LogIn },
    { href: `/${locale}/partner#features`, label: t('features'), icon: Sparkles },
    { href: `/${locale}/partner#faq`, label: t('faq'), icon: HelpCircle },
  ]

  return (
    <footer className="bg-gradient-to-b from-slate-50 to-slate-100 border-t border-slate-200/50">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand Section */}
          <div className="space-y-5">
            <Link href={`/${locale}`} className="inline-block hover:scale-105 transition-transform duration-200">
              <EngeznaLogo size="lg" static showPen={false} />
            </Link>
            <p className="text-slate-600 text-sm leading-relaxed">
              {t('tagline')}
            </p>
            <p className="text-slate-500 text-sm">
              {t('description')}
            </p>

            {/* Social Links - Elegant */}
            <div className="flex items-center gap-3 pt-3">
              <a
                href="https://wa.me/201XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white hover:shadow-lg hover:shadow-[#25D366]/25 transition-all duration-300 shadow-elegant-sm active:scale-95"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" strokeWidth={1.8} />
              </a>
              <a
                href="https://facebook.com/engezna"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-[#1877F2] hover:bg-[#1877F2] hover:text-white hover:shadow-lg hover:shadow-[#1877F2]/25 transition-all duration-300 shadow-elegant-sm active:scale-95"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" strokeWidth={1.8} />
              </a>
              <a
                href="mailto:support@engezna.com"
                className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-primary hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 shadow-elegant-sm active:scale-95"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" strokeWidth={1.8} />
              </a>
            </div>
          </div>

          {/* For Customers */}
          <div>
            <h3 className="font-bold text-slate-900 mb-5 text-lg">
              {t('forCustomers')}
            </h3>
            <ul className="space-y-3.5">
              {customerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2.5 text-slate-600 hover:text-primary transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <link.icon className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" strokeWidth={1.8} />
                    </div>
                    <span className="font-medium text-sm">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Partners */}
          <div>
            <h3 className="font-bold text-slate-900 mb-5 text-lg">
              {t('forPartners')}
            </h3>
            <ul className="space-y-3.5">
              {partnerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2.5 text-slate-600 hover:text-primary transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <link.icon className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" strokeWidth={1.8} />
                    </div>
                    <span className="font-medium text-sm">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Partner CTA - Elegant */}
            <Link
              href={`/${locale}/partner/register`}
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 text-sm font-semibold active:scale-95"
            >
              <Store className="w-4 h-4" strokeWidth={1.8} />
              {t('registerNow')}
            </Link>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="font-bold text-slate-900 mb-5 text-lg">
              {t('contactUs')}
            </h3>
            <ul className="space-y-3.5">
              <li>
                <a
                  href="tel:+201XXXXXXXXX"
                  className="group flex items-center gap-2.5 text-slate-600 hover:text-primary transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <Phone className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" strokeWidth={1.8} />
                  </div>
                  <span dir="ltr" className="font-medium text-sm">+20 1XX XXX XXXX</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/201XXXXXXXXX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 text-slate-600 hover:text-[#25D366] transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#25D366]/10 flex items-center justify-center transition-colors">
                    <MessageCircle className="w-4 h-4 text-slate-500 group-hover:text-[#25D366] transition-colors" strokeWidth={1.8} />
                  </div>
                  <span className="font-medium text-sm">{t('whatsappSupport')}</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@engezna.com"
                  className="group flex items-center gap-2.5 text-slate-600 hover:text-primary transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <Mail className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" strokeWidth={1.8} />
                  </div>
                  <span className="font-medium text-sm">support@engezna.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Available Governorates - Dynamic from database */}
      <div className="border-t border-slate-200/50 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" strokeWidth={1.8} />
            </div>
            <span className="text-slate-600 font-semibold">{t('availableGovernorates')}:</span>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : governorates.length > 0 ? (
              governorates.map((gov, index) => (
                <span key={gov.id} className="text-slate-800 font-medium">
                  {locale === 'ar' ? gov.name_ar : gov.name_en}
                  {index < governorates.length - 1 && (
                    <span className="text-slate-300 mx-1.5">•</span>
                  )}
                </span>
              ))
            ) : (
              <span className="text-slate-400 italic">
                {locale === 'ar' ? 'قريباً' : 'Coming soon'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Copyright - Elegant Dark */}
      <div className="bg-slate-900">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-slate-400">
              {t('copyright')}
            </p>
            <div className="flex items-center gap-6">
              <Link
                href={`/${locale}/privacy`}
                className="text-slate-400 hover:text-white transition-colors font-medium"
              >
                {t('privacy')}
              </Link>
              <Link
                href={`/${locale}/terms`}
                className="text-slate-400 hover:text-white transition-colors font-medium"
              >
                {t('terms')}
              </Link>
              <Link
                href={`/${locale}/admin/login`}
                className="text-slate-500 hover:text-slate-300 transition-colors text-xs"
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
