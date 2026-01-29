'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar, SearchableSelect } from '@/components/admin';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils/formatters';
import {
  Shield,
  CheckSquare,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  MessageSquare,
  Calendar,
  User as UserIcon,
  DollarSign,
  Ban,
  Store,
  ShoppingBag,
  Settings,
  X,
  Save,
  AlertCircle,
  Send,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
} from 'lucide-react';

type ApprovalStatus = 'pending' | 'approved' | 'approved_with_changes' | 'rejected' | 'cancelled';
type ApprovalPriority = 'urgent' | 'high' | 'medium' | 'low';
type ApprovalType =
  | 'refund'
  | 'customer_ban'
  | 'provider_suspend'
  | 'commission_change'
  | 'settlement_adjust'
  | 'promo_create'
  | 'other';

interface ApprovalRequest {
  id: string;
  request_number: string;
  type: ApprovalType;
  title: string;
  description: string | null;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  requested_by: string | null;
  decided_by: string | null;
  amount: number | null;
  related_order_id: string | null;
  related_provider_id: string | null;
  related_customer_id: string | null;
  related_ticket_id: string | null;
  justification: string;
  attachments: any | null;
  decision_notes: string | null;
  follow_up_task_id: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  requester?: { full_name: string | null; email: string | null } | null;
  decider?: { full_name: string | null; email: string | null } | null;
}

type FilterStatus = 'all' | ApprovalStatus;
type FilterType = 'all' | ApprovalType;

// Status config
const statusConfig: Record<
  ApprovalStatus,
  { label: { ar: string; en: string }; color: string; icon: React.ElementType }
> = {
  pending: {
    label: { ar: 'في الانتظار', en: 'Pending' },
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  approved: {
    label: { ar: 'موافق عليه', en: 'Approved' },
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  approved_with_changes: {
    label: { ar: 'موافق مع تعديل', en: 'Approved w/ Changes' },
    color: 'bg-blue-100 text-blue-700',
    icon: CheckCircle2,
  },
  rejected: {
    label: { ar: 'مرفوض', en: 'Rejected' },
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
  cancelled: {
    label: { ar: 'ملغى', en: 'Cancelled' },
    color: 'bg-slate-100 text-slate-700',
    icon: XCircle,
  },
};

const priorityConfig: Record<
  ApprovalPriority,
  { label: { ar: string; en: string }; color: string }
> = {
  urgent: { label: { ar: 'عاجل', en: 'Urgent' }, color: 'bg-red-500 text-white' },
  high: { label: { ar: 'عالي', en: 'High' }, color: 'bg-orange-500 text-white' },
  medium: { label: { ar: 'متوسط', en: 'Medium' }, color: 'bg-yellow-500 text-white' },
  low: { label: { ar: 'عادي', en: 'Normal' }, color: 'bg-green-500 text-white' },
};

const typeConfig: Record<
  ApprovalType,
  { label: { ar: string; en: string }; icon: React.ElementType; color: string }
> = {
  refund: {
    label: { ar: 'استرداد مالي', en: 'Refund' },
    icon: DollarSign,
    color: 'text-emerald-600',
  },
  customer_ban: { label: { ar: 'حظر عميل', en: 'Customer Ban' }, icon: Ban, color: 'text-red-600' },
  provider_suspend: {
    label: { ar: 'تعليق متجر', en: 'Provider Suspend' },
    icon: Store,
    color: 'text-orange-600',
  },
  commission_change: {
    label: { ar: 'تعديل عمولة', en: 'Commission Change' },
    icon: Settings,
    color: 'text-blue-600',
  },
  settlement_adjust: {
    label: { ar: 'تعديل تسوية', en: 'Settlement Adjust' },
    icon: FileText,
    color: 'text-purple-600',
  },
  promo_create: {
    label: { ar: 'إنشاء عرض', en: 'Create Promo' },
    icon: ShoppingBag,
    color: 'text-pink-600',
  },
  other: { label: { ar: 'أخرى', en: 'Other' }, icon: FileText, color: 'text-slate-600' },
};

export default function AdminApprovalsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<ApprovalRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'pending' | 'my' | 'all'>('pending');

  // Action modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    type: 'refund' as ApprovalType,
    title: '',
    description: '',
    priority: 'medium' as ApprovalPriority,
    justification: '',
    amount: '',
    // Dynamic fields based on type
    related_order_id: '',
    related_customer_id: '',
    related_provider_id: '',
    ban_reason: '',
    suspend_reason: '',
    new_commission_rate: '',
    promo_discount: '',
    promo_code: '',
  });

  // Related entities for selection
  const [orders, setOrders] = useState<
    { id: string; order_number: string; customer_name: string }[]
  >([]);
  const [customers, setCustomers] = useState<{ id: string; full_name: string; email: string }[]>(
    []
  );
  const [providers, setProviders] = useState<{ id: string; name_ar: string; name_en: string }[]>(
    []
  );
  const [loadingEntities, setLoadingEntities] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    myRequests: 0,
  });

  const calculateStats = useCallback((data: ApprovalRequest[], adminId: string | null) => {
    const stats = {
      total: data.length,
      pending: data.filter((a) => a.status === 'pending').length,
      approved: data.filter((a) => ['approved', 'approved_with_changes'].includes(a.status)).length,
      rejected: data.filter((a) => a.status === 'rejected').length,
      myRequests: adminId ? data.filter((a) => a.requested_by === adminId).length : 0,
    };
    setStats(stats);
  }, []);

  const loadApprovals = useCallback(
    async (supabase: ReturnType<typeof createClient>) => {
      const { data: approvalsData, error } = await supabase
        .from('approval_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        alert(locale === 'ar' ? 'خطأ في تحميل طلبات الموافقة' : 'Error loading approval requests');
        return;
      }

      if (!approvalsData || approvalsData.length === 0) {
        setApprovals([]);
        calculateStats([], currentAdminId);
        return;
      }

      // Collect unique admin IDs to fetch in batch
      const adminIds = new Set<string>();
      approvalsData.forEach((approval) => {
        if (approval.requested_by) adminIds.add(approval.requested_by);
        if (approval.decided_by) adminIds.add(approval.decided_by);
      });

      // Batch fetch admin users (single query instead of N queries)
      const adminIdArray = Array.from(adminIds);
      const adminUsersMap: Record<string, string> = {}; // admin_id -> user_id

      if (adminIdArray.length > 0) {
        const { data: adminUsers } = await supabase
          .from('admin_users')
          .select('id, user_id')
          .in('id', adminIdArray);

        if (adminUsers) {
          adminUsers.forEach((admin) => {
            adminUsersMap[admin.id] = admin.user_id;
          });
        }
      }

      // Collect user IDs for profiles batch fetch
      const userIds = new Set<string>(Object.values(adminUsersMap));

      // Batch fetch profiles (single query instead of N queries)
      const profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};

      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(userIds));

        if (profiles) {
          profiles.forEach((profile) => {
            profilesMap[profile.id] = { full_name: profile.full_name, email: profile.email };
          });
        }
      }

      // Map approvals with user data (in memory, no additional queries)
      const approvalsWithUsers = approvalsData.map((approval) => {
        let requester = null;
        let decider = null;

        if (approval.requested_by) {
          const userId = adminUsersMap[approval.requested_by];
          if (userId && profilesMap[userId]) {
            requester = profilesMap[userId];
          }
        }

        if (approval.decided_by) {
          const userId = adminUsersMap[approval.decided_by];
          if (userId && profilesMap[userId]) {
            decider = profilesMap[userId];
          }
        }

        return { ...approval, requester, decider };
      });

      setApprovals(approvalsWithUsers);
      calculateStats(approvalsWithUsers, currentAdminId);
    },
    [locale, currentAdminId, calculateStats]
  );

  const filterApprovals = useCallback(() => {
    let filtered = [...approvals];

    // View mode filter
    if (viewMode === 'pending') {
      filtered = filtered.filter((a) => a.status === 'pending');
    } else if (viewMode === 'my' && currentAdminId) {
      filtered = filtered.filter((a) => a.requested_by === currentAdminId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title?.toLowerCase().includes(query) ||
          a.request_number?.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((a) => a.type === typeFilter);
    }

    setFilteredApprovals(filtered);
  }, [approvals, searchQuery, statusFilter, typeFilter, viewMode, currentAdminId]);

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

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id, role')
          .eq('user_id', user.id)
          .single();

        if (adminUser) {
          setCurrentAdminId(adminUser.id);
          if (adminUser.role === 'super_admin') {
            setIsSuperAdmin(true);
          }
        }

        await loadApprovals(supabase);
      }
    }

    setLoading(false);
  }, [loadApprovals]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    filterApprovals();
  }, [filterApprovals]);

  function getTimeSince(date: string): string {
    const now = new Date();
    const created = new Date(date);
    const diff = now.getTime() - created.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return locale === 'ar' ? `منذ ${days} يوم` : `${days} days ago`;
    }
    if (hours > 0) {
      return locale === 'ar' ? `منذ ${hours} ساعة` : `${hours} hours ago`;
    }
    return locale === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes} minutes ago`;
  }

  async function handleDecision() {
    if (!selectedApproval) return;

    setFormLoading(true);
    const supabase = createClient();

    const newStatus = actionType === 'approve' ? 'approved' : 'rejected';

    const { error } = await supabase
      .from('approval_requests')
      .update({
        status: newStatus,
        decided_by: currentAdminId,
        decision_notes: decisionNotes,
        decided_at: new Date().toISOString(),
      })
      .eq('id', selectedApproval.id);

    if (error) {
      alert(
        locale === 'ar'
          ? 'خطأ في تحديث حالة الطلب: ' + error.message
          : 'Error updating approval status: ' + error.message
      );
      setFormLoading(false);
      return;
    }

    // Show success message
    alert(
      locale === 'ar'
        ? actionType === 'approve'
          ? 'تمت الموافقة على الطلب بنجاح'
          : 'تم رفض الطلب'
        : actionType === 'approve'
          ? 'Request approved successfully'
          : 'Request rejected'
    );

    await loadApprovals(supabase);
    setShowActionModal(false);
    setSelectedApproval(null);
    setDecisionNotes('');
    setFormLoading(false);
  }

  async function handleCreateRequest() {
    // Validate based on type
    const title = formData.title || getAutoTitle();
    if (!title) {
      setFormError(locale === 'ar' ? 'العنوان مطلوب' : 'Title is required');
      return;
    }

    if (!formData.justification) {
      setFormError(locale === 'ar' ? 'المبرر مطلوب' : 'Justification is required');
      return;
    }

    // Type-specific validation
    if (formData.type === 'refund' && !formData.related_order_id) {
      setFormError(
        locale === 'ar' ? 'يجب اختيار الطلب المراد استرداده' : 'Please select the order for refund'
      );
      return;
    }

    if (formData.type === 'customer_ban' && !formData.related_customer_id) {
      setFormError(locale === 'ar' ? 'يجب اختيار العميل' : 'Please select the customer');
      return;
    }

    if (
      (formData.type === 'provider_suspend' || formData.type === 'commission_change') &&
      !formData.related_provider_id
    ) {
      setFormError(locale === 'ar' ? 'يجب اختيار المتجر' : 'Please select the provider');
      return;
    }

    // Validate commission rate range
    if (formData.type === 'commission_change') {
      const rate = parseFloat(formData.new_commission_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        setFormError(
          locale === 'ar'
            ? 'نسبة العمولة يجب أن تكون بين 0 و 100'
            : 'Commission rate must be between 0 and 100'
        );
        return;
      }
    }

    // Validate promo discount range
    if (formData.type === 'promo_create') {
      const discount = parseFloat(formData.promo_discount);
      if (isNaN(discount) || discount < 1 || discount > 100) {
        setFormError(
          locale === 'ar'
            ? 'نسبة الخصم يجب أن تكون بين 1 و 100'
            : 'Discount must be between 1 and 100'
        );
        return;
      }
      if (!formData.promo_code.trim()) {
        setFormError(locale === 'ar' ? 'كود العرض مطلوب' : 'Promo code is required');
        return;
      }
    }

    setFormLoading(true);
    setFormError('');
    const supabase = createClient();

    // Build description with dynamic fields
    let description = formData.description || '';
    if (formData.type === 'customer_ban' && formData.ban_reason) {
      description = `${locale === 'ar' ? 'سبب الحظر:' : 'Ban reason:'} ${formData.ban_reason}\n${description}`;
    }
    if (formData.type === 'provider_suspend' && formData.suspend_reason) {
      description = `${locale === 'ar' ? 'سبب التعليق:' : 'Suspend reason:'} ${formData.suspend_reason}\n${description}`;
    }
    if (formData.type === 'commission_change' && formData.new_commission_rate) {
      description = `${locale === 'ar' ? 'النسبة الجديدة:' : 'New rate:'} ${formData.new_commission_rate}%\n${description}`;
    }
    if (formData.type === 'promo_create') {
      description = `${locale === 'ar' ? 'كود العرض:' : 'Promo code:'} ${formData.promo_code}\n${locale === 'ar' ? 'نسبة الخصم:' : 'Discount:'} ${formData.promo_discount}%\n${description}`;
    }

    const { error } = await supabase.from('approval_requests').insert({
      type: formData.type,
      title: title,
      description: description || null,
      priority: formData.priority,
      justification: formData.justification,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      requested_by: currentAdminId,
      status: 'pending',
      related_order_id: formData.related_order_id || null,
      related_customer_id: formData.related_customer_id || null,
      related_provider_id: formData.related_provider_id || null,
    });

    if (error) {
      setFormError(locale === 'ar' ? 'حدث خطأ أثناء إنشاء الطلب' : 'Error creating request');
      setFormLoading(false);
      return;
    }

    await loadApprovals(supabase);
    setShowCreateModal(false);
    setFormData({
      type: 'refund',
      title: '',
      description: '',
      priority: 'medium',
      justification: '',
      amount: '',
      related_order_id: '',
      related_customer_id: '',
      related_provider_id: '',
      ban_reason: '',
      suspend_reason: '',
      new_commission_rate: '',
      promo_discount: '',
      promo_code: '',
    });
    setFormLoading(false);
  }

  function openActionModal(approval: ApprovalRequest, action: 'approve' | 'reject') {
    setSelectedApproval(approval);
    setActionType(action);
    setDecisionNotes('');
    setShowActionModal(true);
  }

  async function openCreateModal() {
    setShowCreateModal(true);
    setLoadingEntities(true);
    const supabase = createClient();

    try {
      // Load orders with customer names using join (single query instead of N+1)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, order_number, customer_id, profiles!customer_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (ordersData) {
        const ordersWithNames = ordersData.map((order) => {
          // Handle join result which may be array or object
          const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
          return {
            id: order.id,
            order_number: order.order_number,
            customer_name: profile?.full_name || 'N/A',
          };
        });
        setOrders(ordersWithNames);
      }

      // Load customers
      const { data: customersData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'customer')
        .order('full_name')
        .limit(100);

      if (customersData) {
        setCustomers(customersData);
      }

      // Load providers
      const { data: providersData } = await supabase
        .from('providers')
        .select('id, name_ar, name_en')
        .order('name_ar')
        .limit(100);

      if (providersData) {
        setProviders(providersData);
      }
    } catch {
      // Error handled silently
    }

    setLoadingEntities(false);
  }

  function getAutoTitle() {
    switch (formData.type) {
      case 'refund':
        const order = orders.find((o) => o.id === formData.related_order_id);
        return order
          ? locale === 'ar'
            ? `استرداد للطلب ${order.order_number}`
            : `Refund for order ${order.order_number}`
          : '';
      case 'customer_ban':
        const customer = customers.find((c) => c.id === formData.related_customer_id);
        return customer
          ? locale === 'ar'
            ? `حظر العميل: ${customer.full_name}`
            : `Ban customer: ${customer.full_name}`
          : '';
      case 'provider_suspend':
        const provider = providers.find((p) => p.id === formData.related_provider_id);
        return provider
          ? locale === 'ar'
            ? `تعليق المتجر: ${provider.name_ar}`
            : `Suspend provider: ${provider.name_en}`
          : '';
      case 'commission_change':
        const providerComm = providers.find((p) => p.id === formData.related_provider_id);
        return providerComm
          ? locale === 'ar'
            ? `تعديل عمولة: ${providerComm.name_ar}`
            : `Commission change: ${providerComm.name_en}`
          : '';
      case 'promo_create':
        return formData.promo_code
          ? locale === 'ar'
            ? `إنشاء عرض: ${formData.promo_code}`
            : `Create promo: ${formData.promo_code}`
          : '';
      default:
        return '';
    }
  }

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse"></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
        </div>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'طلبات الموافقة' : 'Approval Requests'}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/auth/login`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'طلبات الموافقة' : 'Approval Requests'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <CheckSquare className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'الإجمالي' : 'Total'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
          </div>
          <div className="bg-card-bg-warning rounded-xl p-4 border border-warning/30">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-warning" />
              <span className="text-sm text-warning">
                {locale === 'ar' ? 'في الانتظار' : 'Pending'}
              </span>
            </div>
            <p className="text-2xl font-bold text-warning">{formatNumber(stats.pending, locale)}</p>
          </div>
          <div className="bg-card-bg-success rounded-xl p-4 border border-success/30">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-sm text-success">
                {locale === 'ar' ? 'موافق عليها' : 'Approved'}
              </span>
            </div>
            <p className="text-2xl font-bold text-success">
              {formatNumber(stats.approved, locale)}
            </p>
          </div>
          <div className="bg-card-bg-error rounded-xl p-4 border border-error/30">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-5 h-5 text-error" />
              <span className="text-sm text-error">{locale === 'ar' ? 'مرفوضة' : 'Rejected'}</span>
            </div>
            <p className="text-2xl font-bold text-error">{formatNumber(stats.rejected, locale)}</p>
          </div>
          <div className="bg-card-bg-primary rounded-xl p-4 border border-primary/30">
            <div className="flex items-center gap-3 mb-2">
              <UserIcon className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary">
                {locale === 'ar' ? 'طلباتي' : 'My Requests'}
              </span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatNumber(stats.myRequests, locale)}
            </p>
          </div>
        </div>

        {/* View Toggle & Filters */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
          {/* View Toggle */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={viewMode === 'pending' ? 'default' : 'outline'}
              onClick={() => setViewMode('pending')}
              className={viewMode === 'pending' ? 'bg-primary hover:bg-primary/90' : ''}
            >
              {locale === 'ar' ? 'في انتظار قراري' : 'Pending My Decision'}
              {stats.pending > 0 && (
                <span className="ms-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {stats.pending}
                </span>
              )}
            </Button>
            <Button
              variant={viewMode === 'my' ? 'default' : 'outline'}
              onClick={() => setViewMode('my')}
              className={viewMode === 'my' ? 'bg-primary hover:bg-primary/90' : ''}
            >
              {locale === 'ar' ? 'طلباتي' : 'My Requests'}
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              onClick={() => setViewMode('all')}
              className={viewMode === 'all' ? 'bg-primary hover:bg-primary/90' : ''}
            >
              {locale === 'ar' ? 'الكل' : 'All'}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
              />
              <input
                type="text"
                placeholder={
                  locale === 'ar' ? 'بحث بالعنوان أو الرقم...' : 'Search by title or number...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="pending">{locale === 'ar' ? 'في الانتظار' : 'Pending'}</option>
              <option value="approved">{locale === 'ar' ? 'موافق عليه' : 'Approved'}</option>
              <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
              {Object.entries(typeConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label[locale === 'ar' ? 'ar' : 'en']}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => {
                const supabase = createClient();
                loadApprovals(supabase);
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>

            <Button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'طلب موافقة' : 'New Request'}
            </Button>
          </div>
        </div>

        {/* Approvals List */}
        <div className="space-y-4">
          {filteredApprovals.length > 0 ? (
            filteredApprovals.map((approval) => {
              const StatusIcon = statusConfig[approval.status]?.icon || Clock;
              const TypeIcon = typeConfig[approval.type]?.icon || FileText;

              return (
                <div
                  key={approval.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-slate-500">
                            #{approval.request_number}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[approval.priority]?.color}`}
                          >
                            {
                              priorityConfig[approval.priority]?.label[
                                locale === 'ar' ? 'ar' : 'en'
                              ]
                            }
                          </span>
                          <span className="text-xs text-slate-400">
                            {getTimeSince(approval.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`w-5 h-5 ${typeConfig[approval.type]?.color}`} />
                          <h3 className="font-semibold text-slate-900">{approval.title}</h3>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {typeConfig[approval.type]?.label[locale === 'ar' ? 'ar' : 'en']}
                          {approval.amount && (
                            <span className="ms-2 font-medium text-slate-700">
                              | {formatCurrency(approval.amount, locale)}{' '}
                              {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          )}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[approval.status]?.color}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[approval.status]?.label[locale === 'ar' ? 'ar' : 'en']}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 bg-slate-50">
                    {/* Requester */}
                    {approval.requester && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>{locale === 'ar' ? 'مقدم الطلب:' : 'Requested by:'}</span>
                        <span className="font-medium text-slate-900">
                          {approval.requester.full_name}
                        </span>
                      </div>
                    )}

                    {/* Justification */}
                    <div className="bg-white rounded-lg p-3 border border-slate-200 mb-3">
                      <p className="text-sm text-slate-600 font-medium mb-1">
                        {locale === 'ar' ? 'المبرر:' : 'Justification:'}
                      </p>
                      <p className="text-sm text-slate-700">{approval.justification}</p>
                    </div>

                    {/* Decision notes if decided */}
                    {approval.decision_notes && (
                      <div
                        className={`rounded-lg p-3 border mb-3 ${approval.status === 'approved' || approval.status === 'approved_with_changes' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                      >
                        <p
                          className={`text-sm font-medium mb-1 ${approval.status === 'approved' || approval.status === 'approved_with_changes' ? 'text-green-700' : 'text-red-700'}`}
                        >
                          {locale === 'ar' ? 'قرار المدير:' : 'Manager Decision:'}
                        </p>
                        <p
                          className={`text-sm ${approval.status === 'approved' || approval.status === 'approved_with_changes' ? 'text-green-700' : 'text-red-700'}`}
                        >
                          {approval.decision_notes}
                        </p>
                        {approval.decider && (
                          <p className="text-xs mt-2 text-slate-500">
                            - {approval.decider.full_name},{' '}
                            {formatDate(approval.decided_at!, locale)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link href={`/${locale}/admin/approvals/${approval.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          {locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        </Button>
                      </Link>
                      {approval.status === 'pending' && isSuperAdmin && (
                        <>
                          <Button
                            size="sm"
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                            onClick={() => openActionModal(approval, 'approve')}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            {locale === 'ar' ? 'موافقة' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => openActionModal(approval, 'reject')}
                          >
                            <ThumbsDown className="w-4 h-4" />
                            {locale === 'ar' ? 'رفض' : 'Reject'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CheckSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">
                {locale === 'ar' ? 'لا توجد طلبات مطابقة' : 'No matching requests found'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Action Modal (Approve/Reject) */}
      {showActionModal && selectedApproval && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {actionType === 'approve'
                  ? locale === 'ar'
                    ? 'الموافقة على الطلب'
                    : 'Approve Request'
                  : locale === 'ar'
                    ? 'رفض الطلب'
                    : 'Reject Request'}
              </h2>
              <button
                onClick={() => setShowActionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">#{selectedApproval.request_number}</p>
              <p className="font-medium text-slate-900">{selectedApproval.title}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'ملاحظات القرار' : 'Decision Notes'}
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder={
                  locale === 'ar' ? 'أضف ملاحظات على قرارك...' : 'Add notes to your decision...'
                }
                rows={4}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowActionModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleDecision}
                className={`flex-1 ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : actionType === 'approve' ? (
                  <>
                    <ThumbsUp className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'موافقة' : 'Approve'}
                  </>
                ) : (
                  <>
                    <ThumbsDown className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'رفض' : 'Reject'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'إنشاء طلب موافقة' : 'Create Approval Request'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{formError}</span>
              </div>
            )}

            {loadingEntities ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'نوع الطلب' : 'Request Type'} *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as ApprovalType, title: '' })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(typeConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label[locale === 'ar' ? 'ar' : 'en']}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Fields based on Type */}
                {formData.type === 'refund' && (
                  <>
                    <SearchableSelect
                      type="order"
                      value={formData.related_order_id}
                      onChange={(value) => setFormData({ ...formData, related_order_id: value })}
                      label={locale === 'ar' ? 'الطلب المراد استرداده' : 'Order to Refund'}
                      required
                      showGeoFilter={false}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'مبلغ الاسترداد' : 'Refund Amount'} *
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}

                {formData.type === 'customer_ban' && (
                  <>
                    <SearchableSelect
                      type="customer"
                      value={formData.related_customer_id}
                      onChange={(value) => setFormData({ ...formData, related_customer_id: value })}
                      label={locale === 'ar' ? 'العميل' : 'Customer'}
                      required
                      showGeoFilter={true}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'سبب الحظر' : 'Ban Reason'} *
                      </label>
                      <select
                        value={formData.ban_reason}
                        onChange={(e) => setFormData({ ...formData, ban_reason: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        <option value="">{locale === 'ar' ? 'اختر السبب' : 'Select reason'}</option>
                        <option value="fraud">
                          {locale === 'ar'
                            ? 'احتيال أو نشاط مشبوه'
                            : 'Fraud or suspicious activity'}
                        </option>
                        <option value="abuse">{locale === 'ar' ? 'إساءة استخدام' : 'Abuse'}</option>
                        <option value="fake_orders">
                          {locale === 'ar' ? 'طلبات وهمية متكررة' : 'Repeated fake orders'}
                        </option>
                        <option value="harassment">
                          {locale === 'ar' ? 'مضايقة المتاجر' : 'Harassing providers'}
                        </option>
                        <option value="other">
                          {locale === 'ar' ? 'سبب آخر' : 'Other reason'}
                        </option>
                      </select>
                    </div>
                  </>
                )}

                {formData.type === 'provider_suspend' && (
                  <>
                    <SearchableSelect
                      type="provider"
                      value={formData.related_provider_id}
                      onChange={(value) => setFormData({ ...formData, related_provider_id: value })}
                      label={locale === 'ar' ? 'المتجر' : 'Provider'}
                      required
                      showGeoFilter={true}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'سبب التعليق' : 'Suspend Reason'} *
                      </label>
                      <select
                        value={formData.suspend_reason}
                        onChange={(e) =>
                          setFormData({ ...formData, suspend_reason: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        <option value="">{locale === 'ar' ? 'اختر السبب' : 'Select reason'}</option>
                        <option value="quality">
                          {locale === 'ar' ? 'مشاكل في الجودة' : 'Quality issues'}
                        </option>
                        <option value="complaints">
                          {locale === 'ar' ? 'شكاوى متكررة' : 'Repeated complaints'}
                        </option>
                        <option value="policy">
                          {locale === 'ar' ? 'مخالفة السياسات' : 'Policy violation'}
                        </option>
                        <option value="fraud">{locale === 'ar' ? 'احتيال' : 'Fraud'}</option>
                        <option value="other">
                          {locale === 'ar' ? 'سبب آخر' : 'Other reason'}
                        </option>
                      </select>
                    </div>
                  </>
                )}

                {formData.type === 'commission_change' && (
                  <>
                    <SearchableSelect
                      type="provider"
                      value={formData.related_provider_id}
                      onChange={(value) => setFormData({ ...formData, related_provider_id: value })}
                      label={locale === 'ar' ? 'المتجر' : 'Provider'}
                      required
                      showGeoFilter={true}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'نسبة العمولة الجديدة (%)' : 'New Commission Rate (%)'} *
                      </label>
                      <input
                        type="number"
                        value={formData.new_commission_rate}
                        onChange={(e) =>
                          setFormData({ ...formData, new_commission_rate: e.target.value })
                        }
                        placeholder="0"
                        min="0"
                        max="100"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}

                {formData.type === 'promo_create' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {locale === 'ar' ? 'كود العرض' : 'Promo Code'} *
                        </label>
                        <input
                          type="text"
                          value={formData.promo_code}
                          onChange={(e) =>
                            setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })
                          }
                          placeholder="PROMO20"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {locale === 'ar' ? 'نسبة الخصم (%)' : 'Discount (%)'} *
                        </label>
                        <input
                          type="number"
                          value={formData.promo_discount}
                          onChange={(e) =>
                            setFormData({ ...formData, promo_discount: e.target.value })
                          }
                          placeholder="10"
                          min="1"
                          max="100"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </>
                )}

                {formData.type === 'settlement_adjust' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'مبلغ التعديل' : 'Adjustment Amount'} *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Title - auto-generated or custom */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'العنوان' : 'Title'}
                    <span className="text-slate-400 text-xs ms-1">
                      (
                      {locale === 'ar'
                        ? 'يُنشأ تلقائياً إذا تُرك فارغاً'
                        : 'auto-generated if left empty'}
                      )
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={
                      getAutoTitle() || (locale === 'ar' ? 'عنوان الطلب' : 'Request title')
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'الأولوية' : 'Priority'}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value as ApprovalPriority })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label[locale === 'ar' ? 'ar' : 'en']}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'تفاصيل إضافية' : 'Additional Details'}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={
                      locale === 'ar' ? 'أي معلومات إضافية...' : 'Any additional information...'
                    }
                    rows={2}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Justification */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'المبرر' : 'Justification'} *
                  </label>
                  <textarea
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    placeholder={
                      locale === 'ar'
                        ? 'لماذا تحتاج هذه الموافقة؟'
                        : 'Why do you need this approval?'
                    }
                    rows={4}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleCreateRequest}
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'إرسال' : 'Submit'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
