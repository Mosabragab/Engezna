'use client'

import { useLocale } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Package,
  ShoppingBag,
  BarChart3,
  Settings,
  Home,
  Clock,
  Wallet,
  Tag,
  X,
  Star,
  Receipt,
  Megaphone,
  RefreshCw,
  MessageSquare,
} from 'lucide-react'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'

interface NavItem {
  icon: React.ElementType
  label: { ar: string; en: string }
  path: string
  badge?: string
}

interface ProviderSidebarProps {
  isOpen: boolean
  onClose: () => void
  provider: {
    name_ar: string
    name_en: string
    category: string
    status: string
  } | null
  pendingOrders?: number
  unreadNotifications?: number
  pendingRefunds?: number
}

export function ProviderSidebar({
  isOpen,
  onClose,
  provider,
  pendingOrders = 0,
  unreadNotifications = 0,
  pendingRefunds = 0,
}: ProviderSidebarProps) {
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === 'ar'

  const navItems: NavItem[] = [
    {
      icon: Home,
      label: { ar: 'الرئيسية', en: 'Dashboard' },
      path: `/${locale}/provider`,
    },
    {
      icon: ShoppingBag,
      label: { ar: 'الطلبات', en: 'Orders' },
      path: `/${locale}/provider/orders`,
      badge: pendingOrders > 0 ? pendingOrders.toString() : undefined,
    },
    {
      icon: Package,
      label: { ar: 'المنتجات', en: 'Products' },
      path: `/${locale}/provider/products`,
    },
    {
      icon: BarChart3,
      label: { ar: 'التقارير', en: 'Reports' },
      path: `/${locale}/provider/reports`,
    },
    {
      icon: Star,
      label: { ar: 'التقييمات', en: 'Reviews' },
      path: `/${locale}/provider/reviews`,
    },
    {
      icon: Tag,
      label: { ar: 'العروض', en: 'Promotions' },
      path: `/${locale}/provider/promotions`,
    },
    {
      icon: Megaphone,
      label: { ar: 'بانر العروض', en: 'Promo Banner' },
      path: `/${locale}/provider/banner`,
    },
    {
      icon: Wallet,
      label: { ar: 'المالية', en: 'Finance' },
      path: `/${locale}/provider/finance`,
    },
    {
      icon: Receipt,
      label: { ar: 'التسويات', en: 'Settlements' },
      path: `/${locale}/provider/settlements`,
    },
    {
      icon: RefreshCw,
      label: { ar: 'المرتجعات', en: 'Refunds' },
      path: `/${locale}/provider/refunds`,
      badge: pendingRefunds > 0 ? pendingRefunds.toString() : undefined,
    },
    {
      icon: MessageSquare,
      label: { ar: 'الشكاوى', en: 'Complaints' },
      path: `/${locale}/provider/complaints`,
    },
    {
      icon: Clock,
      label: { ar: 'ساعات العمل', en: 'Store Hours' },
      path: `/${locale}/provider/store-hours`,
    },
    {
      icon: Settings,
      label: { ar: 'الإعدادات', en: 'Settings' },
      path: `/${locale}/provider/settings`,
    },
  ]

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return locale === 'ar' ? 'مفتوح' : 'Open'
      case 'closed':
        return locale === 'ar' ? 'مغلق' : 'Closed'
      case 'temporarily_paused':
        return locale === 'ar' ? 'متوقف مؤقتاً' : 'Paused'
      case 'on_vacation':
        return locale === 'ar' ? 'في إجازة' : 'On Vacation'
      default:
        return locale === 'ar' ? 'غير نشط' : 'Inactive'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-500'
      case 'closed':
        return 'bg-red-500'
      case 'temporarily_paused':
      case 'on_vacation':
        return 'bg-amber-500'
      default:
        return 'bg-slate-500'
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50
          w-64 bg-white border-${isRTL ? 'l' : 'r'} border-slate-200 shadow-sm
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0
          flex flex-col h-screen max-h-screen overflow-hidden
        `}
      >
        {/* Logo - Compact on mobile, normal on desktop */}
        <div className="p-3 lg:p-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/provider`} className="flex flex-col">
              {/* Mobile logo - smaller */}
              <div className="lg:hidden">
                <EngeznaLogo size="sm" static showPen={false} />
              </div>
              {/* Desktop logo - normal size */}
              <div className="hidden lg:block">
                <EngeznaLogo size="md" static showPen={false} />
              </div>
              <p className="text-[10px] lg:text-xs text-slate-500 mt-0.5 lg:mt-1">
                {locale === 'ar' ? 'لوحة الشريك' : 'Partner Portal'}
              </p>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-500 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content - Store Info + Navigation */}
        <div className="flex-1 overflow-y-auto">
          {/* Store Info - Compact inline on mobile, card on desktop */}
          {provider && (
            <div className="p-2 lg:p-4 border-b border-slate-200">
              {/* Mobile: inline compact */}
              <div className="lg:hidden bg-slate-50 rounded-lg p-2 flex items-center gap-2">
                <p className="text-xs font-medium text-slate-900 truncate flex-1">
                  {locale === 'ar' ? provider.name_ar : provider.name_en}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(provider.status)}`} />
                  <span className="text-[10px] text-slate-600">
                    {getStatusLabel(provider.status)}
                  </span>
                </div>
              </div>
              {/* Desktop: full card */}
              <div className="hidden lg:block bg-slate-50 rounded-xl p-3">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {locale === 'ar' ? provider.name_ar : provider.name_en}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {provider.category.replace('_', ' ')}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(provider.status)}`} />
                  <span className="text-xs text-slate-600">
                    {getStatusLabel(provider.status)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation - Compact on mobile, normal on desktop */}
          <nav className="p-2 lg:p-3 pb-6 space-y-0.5 lg:space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path ||
              (item.path !== `/${locale}/provider` && pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={`
                  w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl transition-all
                  ${isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                <item.icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                <span className="font-medium text-xs lg:text-sm">
                  {locale === 'ar' ? item.label.ar : item.label.en}
                </span>
                {item.badge && (
                  <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5 rounded-full`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
          </nav>
        </div>
      </aside>
    </>
  )
}
