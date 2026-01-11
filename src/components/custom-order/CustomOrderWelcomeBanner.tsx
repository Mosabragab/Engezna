'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, Camera, FileText, Sparkles, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CustomOrderWelcomeBannerProps {
  providerId: string
  providerName: string
  settings?: {
    accepts_text?: boolean
    accepts_voice?: boolean
    accepts_image?: boolean
    welcome_banner_text_ar?: string
    welcome_banner_text_en?: string
    welcome_banner_enabled?: boolean
  }
  onStartCustomOrder?: () => void
  className?: string
}

export function CustomOrderWelcomeBanner({
  providerId,
  providerName,
  settings,
  onStartCustomOrder,
  className = '',
}: CustomOrderWelcomeBannerProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [isDismissed, setIsDismissed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Check if banner was previously dismissed (per provider, per session)
  useEffect(() => {
    const dismissedKey = `custom_order_banner_dismissed_${providerId}`
    const dismissed = sessionStorage.getItem(dismissedKey)
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [providerId])

  const handleDismiss = () => {
    const dismissedKey = `custom_order_banner_dismissed_${providerId}`
    sessionStorage.setItem(dismissedKey, 'true')
    setIsDismissed(true)
  }

  // Don't show if disabled or dismissed
  if (!settings?.welcome_banner_enabled || isDismissed) {
    return null
  }

  const defaultTextAr = 'مرحباً! فعّلنا نظام الطلب الخاص 🎉 أرسل طلبك بالصوت أو الصورة أو النص وسنقوم بتسعيره فوراً'
  const defaultTextEn = 'Welcome! We enabled Custom Orders 🎉 Send your order via voice, image, or text and we will price it immediately'

  const bannerText = isRTL
    ? settings?.welcome_banner_text_ar || defaultTextAr
    : settings?.welcome_banner_text_en || defaultTextEn

  const inputMethods = [
    { key: 'voice', icon: Mic, enabled: settings?.accepts_voice !== false, labelAr: 'صوتي', labelEn: 'Voice' },
    { key: 'image', icon: Camera, enabled: settings?.accepts_image !== false, labelAr: 'صورة', labelEn: 'Image' },
    { key: 'text', icon: FileText, enabled: settings?.accepts_text !== false, labelAr: 'نص', labelEn: 'Text' },
  ].filter((m) => m.enabled)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`relative overflow-hidden ${className}`}
      >
        {/* Vibrant Gradient Background */}
        <div className="relative rounded-2xl shadow-xl overflow-hidden" style={{
          background: 'linear-gradient(135deg, #059669 0%, #10B981 25%, #34D399 50%, #10B981 75%, #059669 100%)'
        }}>
          {/* Decorative Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Animated Gradient Shine */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-banner-shine"
            />
          </div>

          {/* Decorative Circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-300/20 rounded-full blur-xl" />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-teal-400/15 rounded-full blur-lg" />

          <div className="relative p-4 md:p-6">
            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 end-3 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors backdrop-blur-sm"
              aria-label={isRTL ? 'إغلاق' : 'Dismiss'}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Main Content */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* Icon & Badge */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
                </div>
                <div className="md:hidden">
                  <span className="inline-block px-3 py-1 bg-amber-400 rounded-full text-xs font-bold text-amber-900 shadow-md">
                    {isRTL ? 'جديد!' : 'NEW!'}
                  </span>
                </div>
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <div className="hidden md:inline-block px-3 py-1 bg-amber-400 rounded-full text-xs font-bold text-amber-900 mb-2 shadow-md">
                  {isRTL ? 'خدمة جديدة!' : 'NEW SERVICE!'}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1 drop-shadow-md">
                  {isRTL ? 'نظام الطلب الخاص' : 'Custom Order System'}
                </h3>
                <p className="text-white text-sm md:text-base leading-relaxed drop-shadow-sm">
                  {bannerText}
                </p>

                {/* Input Methods */}
                <div className="flex items-center gap-2 mt-3">
                  {inputMethods.map((method) => (
                    <div
                      key={method.key}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/25 backdrop-blur-sm rounded-full border border-white/30"
                    >
                      <method.icon className="w-4 h-4 text-white" />
                      <span className="text-xs text-white font-semibold">
                        {isRTL ? method.labelAr : method.labelEn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <div className="w-full md:w-auto mt-2 md:mt-0">
                {onStartCustomOrder ? (
                  <Button
                    onClick={onStartCustomOrder}
                    className="w-full md:w-auto bg-white text-emerald-700 hover:bg-emerald-50 font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-base py-6"
                  >
                    {isRTL ? 'ابدأ طلبك الآن' : 'Start Your Order'}
                    {isRTL ? (
                      <ArrowLeft className="w-5 h-5 ms-2" />
                    ) : (
                      <ArrowRight className="w-5 h-5 ms-2" />
                    )}
                  </Button>
                ) : (
                  <Link href={`/${locale}/custom-order?provider=${providerId}`}>
                    <Button className="w-full md:w-auto bg-white text-emerald-700 hover:bg-emerald-50 font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-base py-6">
                      {isRTL ? 'ابدأ طلبك الآن' : 'Start Your Order'}
                      {isRTL ? (
                        <ArrowLeft className="w-5 h-5 ms-2" />
                      ) : (
                        <ArrowRight className="w-5 h-5 ms-2" />
                      )}
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Expandable How It Works Section */}
            <motion.div
              initial={false}
              animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-white/30">
                <h4 className="text-white font-bold mb-3 drop-shadow-sm">
                  {isRTL ? 'كيف يعمل النظام؟' : 'How does it work?'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-md">
                      <span className="text-emerald-600 font-bold text-lg">1</span>
                    </div>
                    <p className="text-white text-sm font-medium">
                      {isRTL
                        ? 'أرسل طلبك بالصوت أو الصورة أو اكتبه'
                        : 'Send your order via voice, image, or text'}
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-md">
                      <span className="text-emerald-600 font-bold text-lg">2</span>
                    </div>
                    <p className="text-white text-sm font-medium">
                      {isRTL
                        ? 'نقوم بتسعير طلبك خلال دقائق'
                        : 'We price your order within minutes'}
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-md">
                      <span className="text-emerald-600 font-bold text-lg">3</span>
                    </div>
                    <p className="text-white text-sm font-medium">
                      {isRTL
                        ? 'وافق على السعر وسنوصّل طلبك'
                        : 'Approve the price and we deliver'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Toggle How It Works */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 mt-3 text-white hover:text-white/90 text-sm font-medium transition-colors"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
              {isExpanded
                ? isRTL
                  ? 'إخفاء التفاصيل'
                  : 'Hide details'
                : isRTL
                ? 'كيف يعمل النظام؟'
                : 'How does it work?'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Compact version for smaller spaces
export function CustomOrderBadge({
  providerId,
  onClick,
}: {
  providerId: string
  onClick?: () => void
}) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
    >
      <Sparkles className="w-4 h-4" />
      {isRTL ? 'طلب خاص متاح' : 'Custom Orders Available'}
    </motion.button>
  )
}

// Mini floating button for custom order
export function CustomOrderFloatingButton({
  providerId,
  providerName,
}: {
  providerId: string
  providerName: string
}) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  return (
    <Link href={`/${locale}/custom-order?provider=${providerId}`}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 end-4 z-40"
      >
        <div className="relative">
          {/* Pulse animation */}
          <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-25" />

          {/* Button */}
          <div className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-full shadow-xl">
            <Mic className="w-5 h-5" />
            <span className="font-semibold text-sm whitespace-nowrap">
              {isRTL ? 'طلب خاص' : 'Custom Order'}
            </span>
          </div>

          {/* NEW badge */}
          <div className="absolute -top-2 -end-2 px-1.5 py-0.5 bg-amber-400 text-amber-900 rounded-full text-[10px] font-bold">
            {isRTL ? 'جديد' : 'NEW'}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
