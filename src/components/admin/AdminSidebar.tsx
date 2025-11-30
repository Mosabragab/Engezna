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
  HeadphonesIcon,
  Activity,
  MapPin,
  UserCog,
  ClipboardList,
  CheckSquare,
  MessageSquare,
  Megaphone,
} from 'lucide-react'

interface NavItem {
  icon: React.ElementType
  label: { ar: string; en: string }
  path: string
  badge?: string
}

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
  pendingProviders?: number
  openTickets?: number
  pendingTasks?: number
  pendingApprovals?: number
  unreadMessages?: number
}

export function AdminSidebar({
  isOpen,
  onClose,
  pendingProviders = 0,
  openTickets = 0,
  pendingTasks = 0,
  pendingApprovals = 0,
  unreadMessages = 0,
}: AdminSidebarProps) {
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === 'ar'

  // Main navigation items
  const mainNavItems: NavItem[] = [
    {
      icon: Home,
      label: { ar: 'الرئيسية', en: 'Dashboard' },
      path: `/${locale}/admin`,
    },
    {
      icon: Store,
      label: { ar: 'المتاجر', en: 'Providers' },
      path: `/${locale}/admin/providers`,
      badge: pendingProviders > 0 ? pendingProviders.toString() : undefined,
    },
    {
      icon: ShoppingBag,
      label: { ar: 'الطلبات', en: 'Orders' },
      path: `/${locale}/admin/orders`,
    },
    {
      icon: Users,
      label: { ar: 'العملاء', en: 'Customers' },
      path: `/${locale}/admin/customers`,
    },
    {
      icon: Wallet,
      label: { ar: 'المالية', en: 'Finance' },
      path: `/${locale}/admin/finance`,
    },
    {
      icon: BarChart3,
      label: { ar: 'التحليلات', en: 'Analytics' },
      path: `/${locale}/admin/analytics`,
    },
    {
      icon: HeadphonesIcon,
      label: { ar: 'الدعم', en: 'Support' },
      path: `/${locale}/admin/support`,
      badge: openTickets > 0 ? openTickets.toString() : undefined,
    },
    {
      icon: MapPin,
      label: { ar: 'المواقع', en: 'Locations' },
      path: `/${locale}/admin/locations`,
    },
  ]

  // Team & Communication navigation items
  const teamNavItems: NavItem[] = [
    {
      icon: UserCog,
      label: { ar: 'المشرفين', en: 'Supervisors' },
      path: `/${locale}/admin/supervisors`,
    },
    {
      icon: ClipboardList,
      label: { ar: 'المهام', en: 'Tasks' },
      path: `/${locale}/admin/tasks`,
      badge: pendingTasks > 0 ? pendingTasks.toString() : undefined,
    },
    {
      icon: CheckSquare,
      label: { ar: 'الموافقات', en: 'Approvals' },
      path: `/${locale}/admin/approvals`,
      badge: pendingApprovals > 0 ? pendingApprovals.toString() : undefined,
    },
    {
      icon: MessageSquare,
      label: { ar: 'الرسائل', en: 'Messages' },
      path: `/${locale}/admin/messages`,
      badge: unreadMessages > 0 ? unreadMessages.toString() : undefined,
    },
    {
      icon: Megaphone,
      label: { ar: 'الإعلانات', en: 'Announcements' },
      path: `/${locale}/admin/announcements`,
    },
  ]

  // System navigation items
  const systemNavItems: NavItem[] = [
    {
      icon: Activity,
      label: { ar: 'سجل النشاط', en: 'Activity Log' },
      path: `/${locale}/admin/activity-log`,
    },
    {
      icon: Settings,
      label: { ar: 'الإعدادات', en: 'Settings' },
      path: `/${locale}/admin/settings`,
    },
  ]

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
            ? 'bg-red-600 text-white shadow-md'
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
      <aside className={`
        fixed lg:static inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50
        w-64 bg-white border-${isRTL ? 'l' : 'r'} border-slate-200 shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0
        flex flex-col overflow-hidden
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/admin`} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">
                  {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
                </h1>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'لوحة المشرفين' : 'Admin Panel'}
                </p>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            {mainNavItems.map(renderNavItem)}
          </div>

          {/* Team & Communication Section */}
          <div>
            <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {locale === 'ar' ? 'الفريق والتواصل' : 'Team & Communication'}
            </p>
            <div className="space-y-1">
              {teamNavItems.map(renderNavItem)}
            </div>
          </div>

          {/* System Section */}
          <div>
            <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {locale === 'ar' ? 'النظام' : 'System'}
            </p>
            <div className="space-y-1">
              {systemNavItems.map(renderNavItem)}
            </div>
          </div>
        </nav>
      </aside>
    </>
  )
}
