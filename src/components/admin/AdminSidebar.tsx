'use client'

import { useLocale } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield,
  Store,
  ShoppingBag,
  BarChart3,
  Settings,
  Home,
  Users,
  Wallet,
  X,
  Activity,
  MapPin,
  UserCog,
  ClipboardList,
  CheckSquare,
  MessageSquare,
  Megaphone,
  Tag,
  Loader2,
  AlertTriangle,
  Key,
  Receipt,
  Image,
  Scale,
} from 'lucide-react'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { usePermissions } from '@/lib/permissions/use-permissions'
import type { ResourceCode } from '@/types/permissions'

interface NavItem {
  icon: React.ElementType
  label: { ar: string; en: string }
  path: string
  badge?: string
  resource: ResourceCode // للتحقق من الصلاحية
}

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
  pendingProviders?: number
  openTickets?: number
  pendingTasks?: number
  pendingApprovals?: number
  unreadMessages?: number
  pendingBannerApprovals?: number
  pendingRefunds?: number
}

export function AdminSidebar({
  isOpen,
  onClose,
  pendingProviders = 0,
  openTickets = 0,
  pendingTasks = 0,
  pendingApprovals = 0,
  unreadMessages = 0,
  pendingBannerApprovals = 0,
  pendingRefunds = 0,
  hasMounted = false,
}: AdminSidebarProps & { hasMounted?: boolean }) {
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === 'ar'

  // استخدام نظام الصلاحيات
  const { loading, hasResource, isSuperAdmin, roles, legacyRole } = usePermissions()

  // جلب الدور الرئيسي للعرض
  const primaryRole = roles.find(r => r.is_primary) || roles[0]

  // التحقق من إمكانية الوصول للمورد
  const canAccess = (resource: ResourceCode): boolean => {
    // super_admin يرى كل شيء
    if (isSuperAdmin) return true
    // التحقق من وجود صلاحية view للمورد
    return hasResource(resource)
  }

  // Main navigation items
  const mainNavItems: NavItem[] = [
    {
      icon: Home,
      label: { ar: 'الرئيسية', en: 'Dashboard' },
      path: `/${locale}/admin`,
      resource: 'dashboard',
    },
    {
      icon: Store,
      label: { ar: 'المتاجر', en: 'Providers' },
      path: `/${locale}/admin/providers`,
      badge: pendingProviders > 0 ? pendingProviders.toString() : undefined,
      resource: 'providers',
    },
    {
      icon: ShoppingBag,
      label: { ar: 'الطلبات', en: 'Orders' },
      path: `/${locale}/admin/orders`,
      resource: 'orders',
    },
    {
      icon: Users,
      label: { ar: 'العملاء', en: 'Customers' },
      path: `/${locale}/admin/customers`,
      resource: 'customers',
    },
    {
      icon: Wallet,
      label: { ar: 'المالية', en: 'Finance' },
      path: `/${locale}/admin/finance`,
      resource: 'finance',
    },
    {
      icon: Receipt,
      label: { ar: 'التسويات', en: 'Settlements' },
      path: `/${locale}/admin/settlements`,
      resource: 'finance',
    },
    {
      icon: BarChart3,
      label: { ar: 'التحليلات', en: 'Analytics' },
      path: `/${locale}/admin/analytics`,
      resource: 'analytics',
    },
    {
      icon: Scale,
      label: { ar: 'مركز النزاعات', en: 'Resolution Center' },
      path: `/${locale}/admin/resolution-center`,
      badge: (openTickets + pendingRefunds) > 0 ? (openTickets + pendingRefunds).toString() : undefined,
      resource: 'support',
    },
    {
      icon: MapPin,
      label: { ar: 'المواقع', en: 'Locations' },
      path: `/${locale}/admin/locations`,
      resource: 'locations',
    },
    {
      icon: Tag,
      label: { ar: 'العروض', en: 'Promotions' },
      path: `/${locale}/admin/promotions`,
      resource: 'promotions',
    },
    {
      icon: Image,
      label: { ar: 'بانرات الرئيسية', en: 'Homepage Banners' },
      path: `/${locale}/admin/banners`,
      badge: pendingBannerApprovals > 0 ? pendingBannerApprovals.toString() : undefined,
      resource: 'promotions',
    },
  ]

  // Team & Communication navigation items
  const teamNavItems: NavItem[] = [
    {
      icon: UserCog,
      label: { ar: 'المشرفين', en: 'Supervisors' },
      path: `/${locale}/admin/supervisors`,
      resource: 'team',
    },
    {
      icon: ClipboardList,
      label: { ar: 'المهام', en: 'Tasks' },
      path: `/${locale}/admin/tasks`,
      badge: pendingTasks > 0 ? pendingTasks.toString() : undefined,
      resource: 'tasks',
    },
    {
      icon: CheckSquare,
      label: { ar: 'الموافقات', en: 'Approvals' },
      path: `/${locale}/admin/approvals`,
      badge: pendingApprovals > 0 ? pendingApprovals.toString() : undefined,
      resource: 'approvals',
    },
    {
      icon: MessageSquare,
      label: { ar: 'المراسلات الداخلية', en: 'Internal Messages' },
      path: `/${locale}/admin/messages`,
      badge: unreadMessages > 0 ? unreadMessages.toString() : undefined,
      resource: 'messages',
    },
    {
      icon: Megaphone,
      label: { ar: 'الإعلانات', en: 'Announcements' },
      path: `/${locale}/admin/announcements`,
      resource: 'announcements',
    },
  ]

  // System navigation items
  const systemNavItems: NavItem[] = [
    {
      icon: Key,
      label: { ar: 'الأدوار', en: 'Roles' },
      path: `/${locale}/admin/roles`,
      resource: 'roles',
    },
    {
      icon: AlertTriangle,
      label: { ar: 'قواعد التصعيد', en: 'Escalation Rules' },
      path: `/${locale}/admin/escalation-rules`,
      resource: 'escalation_rules',
    },
    {
      icon: Activity,
      label: { ar: 'سجل النشاط', en: 'Activity Log' },
      path: `/${locale}/admin/activity-log`,
      resource: 'activity_log',
    },
    {
      icon: Settings,
      label: { ar: 'الإعدادات', en: 'Settings' },
      path: `/${locale}/admin/settings`,
      resource: 'settings',
    },
  ]

  // تصفية العناصر حسب الصلاحيات
  // إذا كان isSuperAdmin، نعرض كل العناصر
  const filteredMainNavItems = isSuperAdmin ? mainNavItems : mainNavItems.filter(item => canAccess(item.resource))
  const filteredTeamNavItems = isSuperAdmin ? teamNavItems : teamNavItems.filter(item => canAccess(item.resource))
  const filteredSystemNavItems = isSuperAdmin ? systemNavItems : systemNavItems.filter(item => canAccess(item.resource))

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.path || pathname.startsWith(item.path + '/')
    return (
      <Link
        key={item.path}
        href={item.path}
        onClick={onClose}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all
          ${isActive
            ? 'bg-[#009DE0] text-white shadow-md'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
        `}
      >
        <item.icon className="w-5 h-5" />
        <span className="font-medium text-sm">{item.label[locale === 'ar' ? 'ar' : 'en']}</span>
        {item.badge && (
          <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-xs px-2 py-0.5 rounded-full`}>
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 z-50
          w-64 bg-white shadow-sm
          transform flex flex-col overflow-hidden
          ${hasMounted ? 'transition-transform duration-300 ease-in-out' : ''}
          ${isRTL ? 'right-0 border-l border-slate-200' : 'left-0 border-r border-slate-200'}
          ${isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/admin`} className="flex flex-col">
              <EngeznaLogo size="md" static showPen={false} />
              <p className="text-xs text-slate-500 mt-1">
                {locale === 'ar' ? 'لوحة المشرفين' : 'Admin Panel'}
              </p>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Role Badge */}
        {primaryRole && (
          <div className="px-4 py-2 border-b border-slate-100">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{
                backgroundColor: `${primaryRole.role?.color}15`,
                color: primaryRole.role?.color
              }}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="font-medium">
                {locale === 'ar' ? primaryRole.role?.name_ar : primaryRole.role?.name_en}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Main Navigation */}
              {filteredMainNavItems.length > 0 && (
                <div className="space-y-1">
                  {filteredMainNavItems.map(renderNavItem)}
                </div>
              )}

              {/* Team & Communication Section */}
              {filteredTeamNavItems.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {locale === 'ar' ? 'الفريق والتواصل' : 'Team & Communication'}
                  </p>
                  <div className="space-y-1">
                    {filteredTeamNavItems.map(renderNavItem)}
                  </div>
                </div>
              )}

              {/* System Section */}
              {filteredSystemNavItems.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {locale === 'ar' ? 'النظام' : 'System'}
                  </p>
                  <div className="space-y-1">
                    {filteredSystemNavItems.map(renderNavItem)}
                  </div>
                </div>
              )}
            </>
          )}
        </nav>
      </aside>
    </>
  )
}
