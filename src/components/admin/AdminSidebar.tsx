'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Mail,
  HeadphonesIcon,
  Layout,
} from 'lucide-react';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import { usePermissions } from '@/lib/permissions/use-permissions';
import type { ResourceCode } from '@/types/permissions';

interface NavItem {
  icon: React.ElementType;
  label: { ar: string; en: string };
  path: string;
  badge?: string;
  resource: ResourceCode; // للتحقق من الصلاحية
}

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pendingProviders?: number;
  openTickets?: number;
  pendingTasks?: number;
  pendingApprovals?: number;
  unreadMessages?: number;
  pendingBannerApprovals?: number;
  pendingRefunds?: number;
  contactFormMessages?: number;
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
  contactFormMessages = 0,
  hasMounted = false,
}: AdminSidebarProps & { hasMounted?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const isRTL = locale === 'ar';

  // استخدام نظام الصلاحيات
  const { loading, hasResource, isSuperAdmin, roles, legacyRole, accessibleResources } =
    usePermissions();

  // جلب الدور الرئيسي للعرض
  const primaryRole = roles.find((r) => r.is_primary) || roles[0];

  // التحقق من إمكانية الوصول للمورد
  const canAccess = (resource: ResourceCode): boolean => {
    // super_admin يرى كل شيء
    if (isSuperAdmin) return true;
    // التحقق من وجود صلاحية view للمورد
    return hasResource(resource);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION GROUPS - المجموعات المنظمة (5 مجموعات)
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. العمليات (Operations) - الأكثر استخداماً
  const operationsNavItems: NavItem[] = [
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
      icon: HeadphonesIcon,
      label: { ar: 'تذاكر الدعم', en: 'Support Tickets' },
      path: `/${locale}/admin/support`,
      badge:
        openTickets + contactFormMessages > 0
          ? (openTickets + contactFormMessages).toString()
          : undefined,
      resource: 'support',
    },
  ];

  // 2. المالية (Financial) - مجمعة معاً لأهميتها
  const financialNavItems: NavItem[] = [
    {
      icon: Wallet,
      label: { ar: 'الإدارة المالية', en: 'Financial Overview' },
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
      icon: Scale,
      label: { ar: 'مركز النزاعات', en: 'Resolution Center' },
      path: `/${locale}/admin/resolution-center`,
      badge:
        openTickets + pendingRefunds > 0 ? (openTickets + pendingRefunds).toString() : undefined,
      resource: 'disputes',
    },
  ];

  // 3. التسويق (Marketing & Growth)
  const marketingNavItems: NavItem[] = [
    {
      icon: BarChart3,
      label: { ar: 'التحليلات', en: 'Analytics' },
      path: `/${locale}/admin/analytics`,
      resource: 'analytics',
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
    {
      icon: Layout,
      label: { ar: 'تخطيط الصفحة الرئيسية', en: 'Homepage Layout' },
      path: `/${locale}/admin/homepage`,
      resource: 'promotions',
    },
    {
      icon: Tag,
      label: { ar: 'تخطيط صفحة العروض', en: 'Offers Page Layout' },
      path: `/${locale}/admin/offers`,
      resource: 'promotions',
    },
    {
      icon: Mail,
      label: { ar: 'قوالب الإيميل', en: 'Email Templates' },
      path: `/${locale}/admin/email-templates`,
      resource: 'email_templates',
    },
  ];

  // 4. الفريق والتواصل (Team & Communication)
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
  ];

  // 5. النظام (System)
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
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // تصفية العناصر حسب الصلاحيات
  // ═══════════════════════════════════════════════════════════════════════════
  const filteredOperationsNavItems = isSuperAdmin
    ? operationsNavItems
    : operationsNavItems.filter((item) => canAccess(item.resource));
  const filteredFinancialNavItems = isSuperAdmin
    ? financialNavItems
    : financialNavItems.filter((item) => canAccess(item.resource));
  const filteredMarketingNavItems = isSuperAdmin
    ? marketingNavItems
    : marketingNavItems.filter((item) => canAccess(item.resource));
  const filteredTeamNavItems = isSuperAdmin
    ? teamNavItems
    : teamNavItems.filter((item) => canAccess(item.resource));
  const filteredSystemNavItems = isSuperAdmin
    ? systemNavItems
    : systemNavItems.filter((item) => canAccess(item.resource));

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
    return (
      <Link
        key={item.path}
        href={item.path}
        onClick={onClose}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
          ${
            isActive
              ? 'bg-gradient-to-r from-[#009DE0] to-[#0077B6] text-white shadow-primary-glow'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }
        `}
      >
        <item.icon className="w-5 h-5" />
        <span className="font-medium text-sm">{item.label[locale === 'ar' ? 'ar' : 'en']}</span>
        {item.badge && (
          <span
            className={`${isRTL ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-numbers`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar - Glassmorphism Design */}
      <aside
        className={`
          fixed lg:static inset-y-0 z-50
          w-64 bg-white/95 backdrop-blur-md shadow-elegant
          transform flex flex-col overflow-hidden
          ${hasMounted ? 'transition-transform duration-300 ease-in-out' : ''}
          ${isRTL ? 'right-0 border-l border-slate-200/50' : 'left-0 border-r border-slate-200/50'}
          ${isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-100">
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
              aria-label={locale === 'ar' ? 'إغلاق القائمة الجانبية' : 'Close sidebar'}
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
                color: primaryRole.role?.color,
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
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto sidebar-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* 1. العمليات (Operations) */}
              {filteredOperationsNavItems.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {locale === 'ar' ? 'العمليات' : 'Operations'}
                  </p>
                  <div className="space-y-0.5">{filteredOperationsNavItems.map(renderNavItem)}</div>
                </div>
              )}

              {/* 2. المالية (Financial) */}
              {filteredFinancialNavItems.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                    {locale === 'ar' ? 'المالية' : 'Financial'}
                  </p>
                  <div className="space-y-0.5">{filteredFinancialNavItems.map(renderNavItem)}</div>
                </div>
              )}

              {/* 3. التسويق (Marketing) */}
              {filteredMarketingNavItems.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {locale === 'ar' ? 'التسويق' : 'Marketing'}
                  </p>
                  <div className="space-y-0.5">{filteredMarketingNavItems.map(renderNavItem)}</div>
                </div>
              )}

              {/* 4. الفريق والتواصل (Team & Communication) */}
              {filteredTeamNavItems.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {locale === 'ar' ? 'الفريق' : 'Team'}
                  </p>
                  <div className="space-y-0.5">{filteredTeamNavItems.map(renderNavItem)}</div>
                </div>
              )}

              {/* 5. النظام (System) */}
              {filteredSystemNavItems.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {locale === 'ar' ? 'النظام' : 'System'}
                  </p>
                  <div className="space-y-0.5">{filteredSystemNavItems.map(renderNavItem)}</div>
                </div>
              )}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
