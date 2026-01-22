'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  Shield,
  ArrowLeftRight,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  DollarSign,
  User as UserIcon,
  Store,
  MapPin,
  MessageSquare,
  AlertTriangle,
  Filter,
  Scale,
} from 'lucide-react';


interface Refund {
  id: string;
  order_id: string;
  customer_id: string;
  provider_id: string;
  amount: number;
  reason: string;
  reason_ar: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed';
  refund_type: string | null;
  provider_action: string | null;
  escalated_to_admin: boolean;
  created_at: string;
  order?: { order_number: string; total: number };
  customer?: { full_name: string; phone: string };
  provider?: { name_ar: string; name_en: string; governorate_id?: string };
}

interface Complaint {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
  provider_id: string | null;
  user: { full_name: string; phone: string } | null;
  provider: { name_ar: string; name_en: string; governorate_id?: string } | null;
}

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
}

interface AdminUser {
  id: string;
  role: string;
  assigned_regions: Array<{ governorate_id?: string; city_id?: string; district_id?: string }>;
}

type TabType = 'all' | 'refunds' | 'complaints';
type FilterPriority = 'all' | 'escalated' | 'urgent' | 'pending';

export default function ResolutionCenterPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');

  // Geographic filtering
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('all');
  const isSuperAdmin = adminUser?.role === 'super_admin';

  const [stats, setStats] = useState({
    totalRefunds: 0,
    pendingRefunds: 0,
    escalatedRefunds: 0,
    totalComplaints: 0,
    urgentComplaints: 0,
    openComplaints: 0,
  });

  const loadData = useCallback(async () => {
    const supabase = createClient();

    // Load refunds
    const { data: refundsData } = await supabase
      .from('refunds')
      .select(
        `
        id, order_id, customer_id, provider_id, amount, reason, reason_ar,
        status, refund_type, provider_action, escalated_to_admin, created_at,
        order:orders(order_number, total),
        customer:profiles!customer_id(full_name, phone),
        provider:providers(name_ar, name_en, governorate_id)
      `
      )
      .order('created_at', { ascending: false });

    // Load complaints (support tickets related to providers)
    const { data: complaintsData } = await supabase
      .from('support_tickets')
      .select(
        `
        id, ticket_number, subject, description, status, priority, created_at, user_id, provider_id,
        user:profiles!support_tickets_user_id_fkey(full_name, phone),
        provider:providers(name_ar, name_en, governorate_id)
      `
      )
      .not('provider_id', 'is', null)
      .order('created_at', { ascending: false });

    // Transform refunds data to match interface
    let transformedRefunds: Refund[] = [];
    if (refundsData) {
      transformedRefunds = refundsData.map((r: Record<string, unknown>) => ({
        ...r,
        order: Array.isArray(r.order) ? r.order[0] : r.order,
        customer: Array.isArray(r.customer) ? r.customer[0] : r.customer,
        provider: Array.isArray(r.provider) ? r.provider[0] : r.provider,
      })) as Refund[];
      setRefunds(transformedRefunds);
    }

    // Transform complaints data to match interface
    let transformedComplaints: Complaint[] = [];
    if (complaintsData) {
      transformedComplaints = complaintsData.map((c: Record<string, unknown>) => ({
        ...c,
        user: Array.isArray(c.user) ? c.user[0] : c.user,
        provider: Array.isArray(c.provider) ? c.provider[0] : c.provider,
      })) as Complaint[];
      setComplaints(transformedComplaints);
    }

    // Apply regional filtering for stats calculation
    // Note: We recalculate the filtered data here to get accurate stats
    const filterForStats = <T extends { provider?: { governorate_id?: string } | null }>(
      items: T[],
      admin: AdminUser | null
    ): T[] => {
      if (!admin) return items;

      const assignedGovernorateIds = (admin.assigned_regions || [])
        .map((r) => r.governorate_id)
        .filter(Boolean) as string[];

      // Super admin sees everything
      if (admin.role === 'super_admin') {
        return items;
      }

      // Regional admin only sees their region
      if (assignedGovernorateIds.length > 0) {
        return items.filter(
          (item) =>
            item.provider?.governorate_id &&
            assignedGovernorateIds.includes(item.provider.governorate_id)
        );
      }

      return items;
    };

    // Get admin user for filtering stats
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    let currentAdminUser: AdminUser | null = null;
    if (currentUser) {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id, role, assigned_regions')
        .eq('user_id', currentUser.id)
        .single();
      if (adminData) {
        currentAdminUser = adminData as AdminUser;
      }
    }

    // Filter data for stats calculation
    const filteredRefundsForStats = filterForStats(transformedRefunds, currentAdminUser);
    const filteredComplaintsForStats = filterForStats(transformedComplaints, currentAdminUser);

    // Calculate stats from filtered data
    const pendingRefunds = filteredRefundsForStats.filter((r) => r.status === 'pending').length;
    const escalatedRefunds = filteredRefundsForStats.filter((r) => r.escalated_to_admin).length;
    const openComplaints = filteredComplaintsForStats.filter((c) => c.status === 'open').length;
    const urgentComplaints = filteredComplaintsForStats.filter(
      (c) => c.priority === 'urgent'
    ).length;

    setStats({
      totalRefunds: filteredRefundsForStats.length,
      pendingRefunds,
      escalatedRefunds,
      totalComplaints: filteredComplaintsForStats.length,
      openComplaints,
      urgentComplaints,
    });
  }, []);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);

        // Load admin user details
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('id, role, assigned_regions')
          .eq('user_id', user.id)
          .single();

        if (adminData) {
          setAdminUser(adminData as AdminUser);
        }

        // Load governorates
        const { data: govData } = await supabase
          .from('governorates')
          .select('id, name_ar, name_en')
          .eq('is_active', true)
          .order('name_ar');

        if (govData) {
          setGovernorates(govData);
        }

        await loadData();
      }
    }

    setLoading(false);
  }, [loadData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Filter items based on admin region
  const filterByRegion = <T extends { provider?: { governorate_id?: string } | null }>(
    items: T[]
  ): T[] => {
    if (!adminUser) return items;

    const assignedGovernorateIds = (adminUser.assigned_regions || [])
      .map((r) => r.governorate_id)
      .filter(Boolean) as string[];

    if (adminUser.role === 'super_admin') {
      if (selectedGovernorate !== 'all') {
        return items.filter((item) => item.provider?.governorate_id === selectedGovernorate);
      }
      return items;
    }

    if (assignedGovernorateIds.length > 0) {
      return items.filter(
        (item) =>
          item.provider?.governorate_id &&
          assignedGovernorateIds.includes(item.provider.governorate_id)
      );
    }

    return items;
  };

  // Filter and combine items
  const getFilteredItems = () => {
    let filteredRefunds = filterByRegion(refunds);
    let filteredComplaints = filterByRegion(complaints);

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredRefunds = filteredRefunds.filter(
        (r) =>
          r.order?.order_number?.toLowerCase().includes(query) ||
          r.customer?.full_name?.toLowerCase().includes(query) ||
          r.provider?.name_ar?.toLowerCase().includes(query)
      );
      filteredComplaints = filteredComplaints.filter(
        (c) =>
          c.ticket_number.toLowerCase().includes(query) ||
          c.subject.toLowerCase().includes(query) ||
          c.user?.full_name?.toLowerCase().includes(query)
      );
    }

    // Apply priority filter
    if (priorityFilter === 'escalated') {
      filteredRefunds = filteredRefunds.filter((r) => r.escalated_to_admin);
      filteredComplaints = [];
    } else if (priorityFilter === 'urgent') {
      filteredRefunds = [];
      filteredComplaints = filteredComplaints.filter((c) => c.priority === 'urgent');
    } else if (priorityFilter === 'pending') {
      filteredRefunds = filteredRefunds.filter((r) => r.status === 'pending');
      filteredComplaints = filteredComplaints.filter((c) => c.status === 'open');
    }

    // Apply tab filter
    if (activeTab === 'refunds') {
      return { refunds: filteredRefunds, complaints: [] };
    } else if (activeTab === 'complaints') {
      return { refunds: [], complaints: filteredComplaints };
    }

    return { refunds: filteredRefunds, complaints: filteredComplaints };
  };

  const { refunds: displayedRefunds, complaints: displayedComplaints } = getFilteredItems();

  // Combined and sorted items for "All" view
  const allItems = [
    ...displayedRefunds.map((r) => ({
      type: 'refund' as const,
      item: r,
      created_at: r.created_at,
    })),
    ...displayedComplaints.map((c) => ({
      type: 'complaint' as const,
      item: c,
      created_at: c.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Time elapsed helper
  const getTimeElapsed = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    } else {
      return formatDate(dateString, locale);
    }
  };

  const getGovernorateNameForProvider = (governorateId?: string) => {
    if (!governorateId) return null;
    const gov = governorates.find((g) => g.id === governorateId);
    return gov ? (locale === 'ar' ? gov.name_ar : gov.name_en) : null;
  };

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <main className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </main>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'مركز النزاعات' : 'Resolution Center'}
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/auth/login`}>
              <Button size="lg" className="bg-red-600 hover:bg-red-700">
                {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'مركز النزاعات' : 'Resolution Center'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Scale className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'إجمالي النزاعات' : 'Total Disputes'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats.totalRefunds + stats.totalComplaints}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">
                {locale === 'ar' ? 'مصعّد' : 'Escalated'}
              </span>
            </div>
            <p className="text-2xl font-bold text-red-700">{stats.escalatedRefunds}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-orange-700">{locale === 'ar' ? 'عاجل' : 'Urgent'}</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{stats.urgentComplaints}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-700">
                {locale === 'ar' ? 'مرتجعات معلقة' : 'Pending Refunds'}
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{stats.pendingRefunds}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">
                {locale === 'ar' ? 'شكاوى مفتوحة' : 'Open Complaints'}
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.openComplaints}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">
                {locale === 'ar' ? 'إجمالي المرتجعات' : 'Total Refunds'}
              </span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.totalRefunds}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'refunds', 'complaints'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab === 'all' && (locale === 'ar' ? 'الكل' : 'All')}
              {tab === 'refunds' && (locale === 'ar' ? 'المرتجعات' : 'Refunds')}
              {tab === 'complaints' && (locale === 'ar' ? 'الشكاوى' : 'Complaints')}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
              />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as FilterPriority)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="all">{locale === 'ar' ? 'كل الأولويات' : 'All Priority'}</option>
              <option value="escalated">{locale === 'ar' ? 'مصعّد' : 'Escalated'}</option>
              <option value="urgent">{locale === 'ar' ? 'عاجل' : 'Urgent'}</option>
              <option value="pending">{locale === 'ar' ? 'معلق/مفتوح' : 'Pending/Open'}</option>
            </select>

            {/* Governorate Filter */}
            {isSuperAdmin && governorates.length > 0 && (
              <div className="relative">
                <MapPin
                  className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`}
                />
                <select
                  value={selectedGovernorate}
                  onChange={(e) => setSelectedGovernorate(e.target.value)}
                  className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 min-w-[150px]`}
                >
                  <option value="all">
                    {locale === 'ar' ? 'كل المحافظات' : 'All Governorates'}
                  </option>
                  {governorates.map((gov) => (
                    <option key={gov.id} value={gov.id}>
                      {locale === 'ar' ? gov.name_ar : gov.name_en}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Region indicator for regional admins */}
            {!isSuperAdmin &&
              adminUser?.assigned_regions &&
              adminUser.assigned_regions.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {locale === 'ar' ? 'منطقتك: ' : 'Your Region: '}
                    {governorates.find(
                      (g) => g.id === adminUser.assigned_regions[0]?.governorate_id
                    )?.[locale === 'ar' ? 'name_ar' : 'name_en'] || '-'}
                  </span>
                </div>
              )}

            <Button
              variant="outline"
              onClick={() => loadData()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Combined List */}
        <div className="space-y-3">
          {allItems.length > 0 ? (
            allItems.map(({ type, item }) =>
              type === 'refund' ? (
                <div
                  key={`refund-${(item as Refund).id}`}
                  className={`bg-white rounded-xl p-4 border shadow-sm transition-colors ${
                    (item as Refund).escalated_to_admin
                      ? 'border-red-300 bg-red-50'
                      : (item as Refund).status === 'pending'
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium text-slate-900">
                          #{(item as Refund).order?.order_number}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          {locale === 'ar' ? 'مرتجع' : 'Refund'}
                        </span>
                        {(item as Refund).escalated_to_admin && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                            {locale === 'ar' ? '⚠️ مصعّد' : '⚠️ Escalated'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5" />
                          {(item as Refund).customer?.full_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5" />
                          {locale === 'ar'
                            ? (item as Refund).provider?.name_ar
                            : (item as Refund).provider?.name_en}
                        </span>
                        {getGovernorateNameForProvider(
                          (item as Refund).provider?.governorate_id
                        ) && (
                          <span className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3" />
                            {getGovernorateNameForProvider(
                              (item as Refund).provider?.governorate_id
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {(item as Refund).reason_ar || (item as Refund).reason}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-green-600">
                        {formatCurrency((item as Refund).amount, locale)}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {getTimeElapsed((item as Refund).created_at)}
                      </p>
                    </div>
                    <Link href={`/${locale}/admin/refunds`}>
                      <Button variant="outline" size="sm" className="flex-shrink-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div
                  key={`complaint-${(item as Complaint).id}`}
                  className={`bg-white rounded-xl p-4 border shadow-sm transition-colors ${
                    (item as Complaint).priority === 'urgent'
                      ? 'border-orange-300 bg-orange-50'
                      : (item as Complaint).status === 'open'
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium text-slate-900">
                          #{(item as Complaint).ticket_number}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {locale === 'ar' ? 'شكوى' : 'Complaint'}
                        </span>
                        {(item as Complaint).priority === 'urgent' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                            {locale === 'ar' ? '🔥 عاجل' : '🔥 Urgent'}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-800 line-clamp-1">
                        {(item as Complaint).subject}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5" />
                          {(item as Complaint).user?.full_name}
                        </span>
                        {(item as Complaint).provider && (
                          <span className="flex items-center gap-1">
                            <Store className="w-3.5 h-3.5" />
                            {locale === 'ar'
                              ? (item as Complaint).provider?.name_ar
                              : (item as Complaint).provider?.name_en}
                          </span>
                        )}
                        {getGovernorateNameForProvider(
                          (item as Complaint).provider?.governorate_id
                        ) && (
                          <span className="flex items-center gap-1 text-xs">
                            <MapPin className="w-3 h-3" />
                            {getGovernorateNameForProvider(
                              (item as Complaint).provider?.governorate_id
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          (item as Complaint).status === 'open'
                            ? 'bg-yellow-100 text-yellow-700'
                            : (item as Complaint).status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {(item as Complaint).status === 'open'
                          ? locale === 'ar'
                            ? 'مفتوح'
                            : 'Open'
                          : (item as Complaint).status === 'in_progress'
                            ? locale === 'ar'
                              ? 'قيد المعالجة'
                              : 'In Progress'
                            : locale === 'ar'
                              ? 'تم الحل'
                              : 'Resolved'}
                      </span>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {getTimeElapsed((item as Complaint).created_at)}
                      </p>
                    </div>
                    <Link href={`/${locale}/admin/support/${(item as Complaint).id}`}>
                      <Button variant="outline" size="sm" className="flex-shrink-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            )
          ) : (
            <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
              <Scale className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">
                {locale === 'ar' ? 'لا توجد نزاعات' : 'No disputes found'}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
