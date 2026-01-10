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
  Megaphone,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  Users,
  ClipboardList,
} from 'lucide-react'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface NavItem {
  icon: React.ElementType
  label: { ar: string; en: string }
  path: string
  badge?: string
  badgeColor?: 'red' | 'amber' | 'green'
}

interface NavGroup {
  title: { ar: string; en: string }
  items: NavItem[]
}

// Staff permissions interface
interface StaffPermissions {
  isOwner: boolean
  canManageOrders: boolean
  canManageMenu: boolean
  canManageCustomers: boolean
  canViewAnalytics: boolean
  canManageOffers: boolean
  canManageTeam: boolean
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
  pendingCustomOrders?: number // الطلبات المفتوحة المعلقة
  unreadNotifications?: number
  pendingRefunds?: number
  onHoldOrders?: number // الطلبات المعلقة - مرتبطة بالمحرك المالي
  pendingComplaints?: number
  permissions?: StaffPermissions
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function ProviderSidebar({
  isOpen,
  onClose,
  provider,
  pendingOrders = 0,
  pendingCustomOrders = 0,
  unreadNotifications = 0,
  pendingRefunds = 0,
  onHoldOrders = 0,
  pendingComplaints = 0,
  permissions,
}: ProviderSidebarProps) {
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === 'ar'

  // Default permissions (all true for backward compatibility if not provided)
  const perms = permissions || {
    isOwner: true,
    canManageOrders: true,
    canManageMenu: true,
    canManageCustomers: true,
    canViewAnalytics: true,
    canManageOffers: true,
    canManageTeam: true,
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Navigation Groups - المجموعات المنظمة
  // ═══════════════════════════════════════════════════════════════════════════

  // Build navigation groups based on permissions
  const buildNavGroups = (): NavGroup[] => {
    const groups: NavGroup[] = []

    // ─────────────────────────────────────────────────────────────────────────
    // مجموعة العمليات (Operations) - Dashboard always visible
    // ─────────────────────────────────────────────────────────────────────────
    const operationsItems: NavItem[] = [
      {
        icon: Home,
        label: { ar: 'الرئيسية', en: 'Dashboard' },
        path: `/${locale}/provider`,
      },
    ]

    // Orders - requires canManageOrders
    if (perms.canManageOrders) {
      operationsItems.push({
        icon: ShoppingBag,
        label: { ar: 'الطلبات', en: 'Orders' },
        path: `/${locale}/provider/orders`,
        badge: pendingOrders > 0 ? pendingOrders.toString() : undefined,
        badgeColor: 'red',
      })
      // Custom Orders - الطلبات المفتوحة (Red badge for high visibility)
      operationsItems.push({
        icon: ClipboardList,
        label: { ar: 'الطلبات المفتوحة', en: 'Custom Orders' },
        path: `/${locale}/provider/orders/custom`,
        badge: pendingCustomOrders > 0 ? pendingCustomOrders.toString() : undefined,
        badgeColor: 'red',
      })
      operationsItems.push({
        icon: RefreshCw,
        label: { ar: 'المرتجعات', en: 'Refunds' },
        path: `/${locale}/provider/refunds`,
        badge: (pendingRefunds + onHoldOrders) > 0
          ? (pendingRefunds + onHoldOrders).toString()
          : undefined,
        badgeColor: 'amber',
      })
    }

    groups.push({
      title: { ar: 'العمليات', en: 'Operations' },
      items: operationsItems,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // مجموعة المالية (Financials) - requires canViewAnalytics or isOwner
    // ─────────────────────────────────────────────────────────────────────────
    if (perms.canViewAnalytics || perms.isOwner) {
      const financialItems: NavItem[] = []

      if (perms.isOwner) {
        financialItems.push({
          icon: Wallet,
          label: { ar: 'التسويات', en: 'Settlements' },
          path: `/${locale}/provider/finance`,
        })
      }

      if (perms.canViewAnalytics) {
        financialItems.push({
          icon: TrendingUp,
          label: { ar: 'التحليلات', en: 'Analytics' },
          path: `/${locale}/provider/analytics`,
        })
      }

      if (financialItems.length > 0) {
        groups.push({
          title: { ar: 'المالية', en: 'Financials' },
          items: financialItems,
        })
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // مجموعة المتجر (Store Management)
    // ─────────────────────────────────────────────────────────────────────────
    const storeItems: NavItem[] = []

    // Products - requires canManageMenu
    if (perms.canManageMenu) {
      storeItems.push({
        icon: Package,
        label: { ar: 'المنتجات', en: 'Products' },
        path: `/${locale}/provider/products`,
      })
    }

    // Promotions & Banners - requires canManageOffers
    if (perms.canManageOffers) {
      storeItems.push({
        icon: Tag,
        label: { ar: 'العروض والخصومات', en: 'Promotions' },
        path: `/${locale}/provider/promotions`,
      })
      storeItems.push({
        icon: Megaphone,
        label: { ar: 'بانر العروض', en: 'Promo Banner' },
        path: `/${locale}/provider/banner`,
      })
    }

    // Reviews - visible to all (read-only for staff without specific permission)
    storeItems.push({
      icon: Star,
      label: { ar: 'تقييمات العملاء', en: 'Reviews' },
      path: `/${locale}/provider/reviews`,
    })

    if (storeItems.length > 0) {
      groups.push({
        title: { ar: 'المتجر', en: 'Store' },
        items: storeItems,
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // مجموعة الإعدادات (Settings)
    // ─────────────────────────────────────────────────────────────────────────
    const settingsItems: NavItem[] = [
      {
        icon: Clock,
        label: { ar: 'ساعات العمل', en: 'Working Hours' },
        path: `/${locale}/provider/store-hours`,
      },
      {
        icon: Settings,
        label: { ar: 'الملف الشخصي', en: 'Profile' },
        path: `/${locale}/provider/settings`,
      },
    ]

    // Team Management - only for owners
    if (perms.canManageTeam) {
      settingsItems.push({
        icon: Users,
        label: { ar: 'إدارة الفريق', en: 'Team Management' },
        path: `/${locale}/provider/team`,
      })
    }

    groups.push({
      title: { ar: 'الإعدادات', en: 'Settings' },
      items: settingsItems,
    })

    return groups
  }

  const navGroups = buildNavGroups()

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

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

  const getBadgeColor = (color?: 'red' | 'amber' | 'green') => {
    switch (color) {
      case 'amber':
        return 'bg-amber-500'
      case 'green':
        return 'bg-green-500'
      case 'red':
      default:
        return 'bg-red-500'
    }
  }

  const isItemActive = (itemPath: string) => {
    return pathname === itemPath ||
      (itemPath !== `/${locale}/provider` && pathname.startsWith(itemPath))
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

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
          w-64 bg-white/95 backdrop-blur-md border-${isRTL ? 'l' : 'r'} border-slate-100/80 shadow-elegant
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0
          flex flex-col h-screen max-h-screen overflow-hidden
        `}
      >
        {/* Logo - Compact on mobile, normal on desktop */}
        <div className="p-3 lg:p-4 border-b border-slate-100 flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          {/* Store Info - Compact inline on mobile, card on desktop */}
          {provider && (
            <div className="p-2 lg:p-4 border-b border-slate-100">
              {/* Mobile: inline compact */}
              <div className="lg:hidden bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-2.5 flex items-center gap-2 shadow-sm">
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
              <div className="hidden lg:block bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 shadow-sm">
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

          {/* Navigation - Organized in Groups */}
          <nav className="p-2 lg:p-3 pb-6">
            {navGroups.map((group, groupIndex) => (
              <div key={group.title.en} className={groupIndex > 0 ? 'mt-4 lg:mt-5' : ''}>
                {/* Group Title */}
                <div className="px-3 lg:px-4 mb-1.5 lg:mb-2">
                  <p className="text-[10px] lg:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {locale === 'ar' ? group.title.ar : group.title.en}
                  </p>
                </div>

                {/* Group Items */}
                <div className="space-y-0.5 lg:space-y-1">
                  {group.items.map((item) => {
                    const isActive = isItemActive(item.path)
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={onClose}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-xl transition-all duration-200
                          max-lg:gap-2 max-lg:px-3 max-lg:py-2 max-lg:rounded-lg
                          ${isActive
                            ? 'bg-gradient-to-r from-[#009DE0] to-[#0077B6] text-white shadow-primary-glow'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]'}
                        `}
                      >
                        <item.icon className="w-5 h-5 max-lg:w-4 max-lg:h-4 flex-shrink-0" />
                        <span className="font-medium text-sm max-lg:text-xs">
                          {locale === 'ar' ? item.label.ar : item.label.en}
                        </span>
                        {item.badge && (
                          <span
                            className={`
                              ${isRTL ? 'mr-auto' : 'ml-auto'}
                              ${isActive ? 'bg-white/20' : getBadgeColor(item.badgeColor)}
                              text-white text-xs max-lg:text-[10px] px-2 max-lg:px-1.5 py-0.5 rounded-full font-numbers
                            `}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}
