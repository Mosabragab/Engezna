'use client';

import React, { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import type { Role } from '@/types/permissions';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowUp,
  Bell,
  Lock,
  RefreshCw,
  Search,
  Check,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  DollarSign,
  Hash,
  FileText,
  Users,
  Crown,
  UserCog,
} from 'lucide-react';

interface EscalationRule {
  id: string;
  name_ar: string;
  name_en: string;
  description?: string | null;
  trigger_type: 'threshold' | 'count' | 'time' | 'pattern';
  trigger_conditions: {
    resource?: string;
    action?: string;
    condition?: string;
    amount?: number;
    count_per_day?: number;
    time_limit_minutes?: number;
  };
  escalate_to_role_id: string | null;
  escalate_to_admin_id: string | null;
  action_type: 'require_approval' | 'notify' | 'block';
  notification_message_ar?: string | null;
  notification_message_en?: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  escalate_to_role?: Role;
}

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

const TRIGGER_TYPES = [
  { value: 'threshold', label: { ar: 'حد مالي', en: 'Amount Threshold' }, icon: DollarSign },
  { value: 'count', label: { ar: 'عدد مرات', en: 'Count Based' }, icon: Hash },
  { value: 'time', label: { ar: 'وقت محدد', en: 'Time Based' }, icon: Clock },
  { value: 'pattern', label: { ar: 'نمط معين', en: 'Pattern Based' }, icon: FileText },
];

const ACTION_TYPES = [
  {
    value: 'require_approval',
    label: { ar: 'يتطلب موافقة', en: 'Require Approval' },
    icon: Lock,
    color: 'amber',
  },
  { value: 'notify', label: { ar: 'إشعار فقط', en: 'Notify Only' }, icon: Bell, color: 'blue' },
  { value: 'block', label: { ar: 'منع تماماً', en: 'Block' }, icon: X, color: 'red' },
];

const RESOURCES = [
  { value: 'orders', label: { ar: 'الطلبات', en: 'Orders' } },
  { value: 'providers', label: { ar: 'المتاجر', en: 'Providers' } },
  { value: 'customers', label: { ar: 'العملاء', en: 'Customers' } },
  { value: 'finance', label: { ar: 'المالية', en: 'Finance' } },
];

const ACTIONS = [
  { value: 'refund', label: { ar: 'استرداد', en: 'Refund' } },
  { value: 'approve', label: { ar: 'موافقة', en: 'Approve' } },
  { value: 'reject', label: { ar: 'رفض', en: 'Reject' } },
  { value: 'ban', label: { ar: 'حظر', en: 'Ban' } },
  { value: 'settle', label: { ar: 'تسوية', en: 'Settle' } },
  { value: 'delete', label: { ar: 'حذف', en: 'Delete' } },
];

export default function EscalationRulesPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    trigger_type: 'threshold' as 'threshold' | 'count' | 'time' | 'pattern',
    resource: '',
    action: '',
    amount: 0,
    count_per_day: 0,
    escalate_to_role_id: '',
    escalate_to_admin_id: '',
    action_type: 'require_approval' as 'require_approval' | 'notify' | 'block',
    notification_message_ar: '',
    notification_message_en: '',
    priority: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (adminUser?.role === 'super_admin') {
        setIsSuperAdmin(true);
        await loadData(supabase);
      }
    }

    setLoading(false);
  }

  async function loadData(supabase: ReturnType<typeof createClient>) {
    // Load escalation rules
    const { data: rulesData } = await supabase
      .from('escalation_rules')
      .select(
        `
        *,
        escalate_to_role:roles(id, code, name_ar, name_en, color, icon)
      `
      )
      .order('priority', { ascending: true });

    if (rulesData) {
      setRules(rulesData);
    }

    // Load roles
    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('name_ar');

    if (rolesData) {
      setRoles(rolesData);
    }

    // Load admins (super admins and managers)
    const { data: adminsData } = await supabase
      .from('admin_users')
      .select(
        `
        id, user_id, role,
        profile:profiles!admin_users_user_id_fkey(full_name, email)
      `
      )
      .in('role', ['super_admin', 'general_moderator']);

    if (adminsData) {
      const processedAdmins = adminsData.map((admin) => ({
        ...admin,
        profile: Array.isArray(admin.profile) ? admin.profile[0] : admin.profile,
      }));
      setAdmins(processedAdmins);
    }
  }

  function openCreateModal() {
    setEditingRule(null);
    setFormData({
      name_ar: '',
      name_en: '',
      trigger_type: 'threshold',
      resource: '',
      action: '',
      amount: 0,
      count_per_day: 0,
      escalate_to_role_id: '',
      escalate_to_admin_id: '',
      action_type: 'require_approval',
      notification_message_ar: '',
      notification_message_en: '',
      priority: rules.length,
    });
    setFormError('');
    setShowModal(true);
  }

  function openEditModal(rule: EscalationRule) {
    setEditingRule(rule);
    setFormData({
      name_ar: rule.name_ar,
      name_en: rule.name_en,
      trigger_type: rule.trigger_type,
      resource: rule.trigger_conditions.resource || '',
      action: rule.trigger_conditions.action || '',
      amount: rule.trigger_conditions.amount || 0,
      count_per_day: rule.trigger_conditions.count_per_day || 0,
      escalate_to_role_id: rule.escalate_to_role_id || '',
      escalate_to_admin_id: rule.escalate_to_admin_id || '',
      action_type: rule.action_type,
      notification_message_ar: rule.notification_message_ar || '',
      notification_message_en: rule.notification_message_en || '',
      priority: rule.priority,
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name_ar || !formData.name_en) {
      setFormError(locale === 'ar' ? 'الاسم مطلوب' : 'Name is required');
      return;
    }

    setFormLoading(true);
    setFormError('');
    const supabase = createClient();

    try {
      const trigger_conditions: Record<string, unknown> = {};
      if (formData.resource) trigger_conditions.resource = formData.resource;
      if (formData.action) trigger_conditions.action = formData.action;

      if (formData.trigger_type === 'threshold' && formData.amount > 0) {
        trigger_conditions.amount = formData.amount;
        trigger_conditions.condition = `amount > ${formData.amount}`;
      } else if (formData.trigger_type === 'count' && formData.count_per_day > 0) {
        trigger_conditions.count_per_day = formData.count_per_day;
      }

      const ruleData = {
        name_ar: formData.name_ar,
        name_en: formData.name_en,
        trigger_type: formData.trigger_type,
        trigger_conditions,
        escalate_to_role_id: formData.escalate_to_role_id || null,
        escalate_to_admin_id: formData.escalate_to_admin_id || null,
        action_type: formData.action_type,
        notification_message_ar: formData.notification_message_ar || null,
        notification_message_en: formData.notification_message_en || null,
        priority: formData.priority,
        is_active: true,
      };

      if (editingRule) {
        const { error } = await supabase
          .from('escalation_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('escalation_rules').insert(ruleData);

        if (error) throw error;
      }

      await loadData(supabase);
      setShowModal(false);
    } catch (error: any) {
      setFormError(error.message || (locale === 'ar' ? 'حدث خطأ' : 'An error occurred'));
    }

    setFormLoading(false);
  }

  async function handleDelete(ruleId: string) {
    if (
      !confirm(
        locale === 'ar'
          ? 'هل أنت متأكد من حذف هذه القاعدة؟'
          : 'Are you sure you want to delete this rule?'
      )
    ) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('escalation_rules').delete().eq('id', ruleId);

    if (!error) {
      await loadData(supabase);
    }
  }

  async function toggleRuleStatus(ruleId: string, currentStatus: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from('escalation_rules')
      .update({ is_active: !currentStatus })
      .eq('id', ruleId);

    if (!error) {
      await loadData(supabase);
    }
  }

  const filteredRules = rules.filter((rule) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return rule.name_ar.toLowerCase().includes(query) || rule.name_en.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </div>
      </>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'قواعد التصعيد' : 'Escalation Rules'}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/admin`}>
              <Button className="bg-red-600 hover:bg-red-700">
                {locale === 'ar' ? 'العودة' : 'Go Back'}
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
        title={locale === 'ar' ? 'قواعد التصعيد' : 'Escalation Rules'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {locale === 'ar' ? 'قواعد التصعيد' : 'Escalation Rules'}
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              {locale === 'ar'
                ? 'إدارة قواعد التصعيد التلقائي للعمليات الحساسة'
                : 'Manage automatic escalation rules for sensitive operations'}
            </p>
          </div>
          <Button onClick={openCreateModal} className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 me-2" />
            {locale === 'ar' ? 'قاعدة جديدة' : 'New Rule'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{rules.length}</p>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'إجمالي القواعد' : 'Total Rules'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {rules.filter((r) => r.is_active).length}
                </p>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'قواعد نشطة' : 'Active Rules'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {rules.filter((r) => r.action_type === 'require_approval').length}
                </p>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'تتطلب موافقة' : 'Require Approval'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {rules.filter((r) => r.action_type === 'block').length}
                </p>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'قواعد المنع' : 'Block Rules'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'ar' ? 'بحث عن قاعدة...' : 'Search for a rule...'}
              className="w-full ps-10 pe-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          {filteredRules.map((rule, index) => {
            const triggerType = TRIGGER_TYPES.find((t) => t.value === rule.trigger_type);
            const actionType = ACTION_TYPES.find((a) => a.value === rule.action_type);
            const TriggerIcon = triggerType?.icon || Zap;
            const ActionIcon = actionType?.icon || Bell;

            return (
              <div
                key={rule.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  rule.is_active ? 'border-slate-200' : 'border-slate-300 opacity-60'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-lg text-slate-500 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {locale === 'ar' ? rule.name_ar : rule.name_en}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* Trigger Type */}
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            <TriggerIcon className="w-3 h-3" />
                            {locale === 'ar' ? triggerType?.label.ar : triggerType?.label.en}
                          </span>

                          {/* Resource & Action */}
                          {rule.trigger_conditions.resource && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {RESOURCES.find(
                                (r) => r.value === rule.trigger_conditions.resource
                              )?.[`label`][locale === 'ar' ? 'ar' : 'en'] ||
                                rule.trigger_conditions.resource}
                            </span>
                          )}
                          {rule.trigger_conditions.action && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {ACTIONS.find((a) => a.value === rule.trigger_conditions.action)?.[
                                `label`
                              ][locale === 'ar' ? 'ar' : 'en'] || rule.trigger_conditions.action}
                            </span>
                          )}

                          {/* Condition Value */}
                          {rule.trigger_conditions.amount && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {locale === 'ar' ? '>' : '>'} {rule.trigger_conditions.amount}{' '}
                              {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          )}
                          {rule.trigger_conditions.count_per_day && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                              {locale === 'ar' ? '>' : '>'} {rule.trigger_conditions.count_per_day}{' '}
                              {locale === 'ar' ? '/يوم' : '/day'}
                            </span>
                          )}

                          {/* Action Type */}
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                              actionType?.color === 'amber'
                                ? 'bg-amber-100 text-amber-700'
                                : actionType?.color === 'blue'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            <ActionIcon className="w-3 h-3" />
                            {locale === 'ar' ? actionType?.label.ar : actionType?.label.en}
                          </span>
                        </div>

                        {/* Escalate To */}
                        {rule.escalate_to_role && (
                          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                            <ArrowUp className="w-4 h-4" />
                            <span>{locale === 'ar' ? 'تصعيد إلى:' : 'Escalate to:'}</span>
                            <span
                              className="font-medium px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${rule.escalate_to_role.color}20`,
                                color: rule.escalate_to_role.color,
                              }}
                            >
                              {locale === 'ar'
                                ? rule.escalate_to_role.name_ar
                                : rule.escalate_to_role.name_en}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                        className={rule.is_active ? 'text-green-600' : 'text-slate-400'}
                      >
                        {rule.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(rule)}
                        className="text-slate-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredRules.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {locale === 'ar' ? 'لا توجد قواعد' : 'No rules found'}
            </h3>
            <p className="text-slate-500">
              {searchQuery
                ? locale === 'ar'
                  ? 'جرب كلمات بحث أخرى'
                  : 'Try different search terms'
                : locale === 'ar'
                  ? 'ابدأ بإنشاء قاعدة جديدة'
                  : 'Start by creating a new rule'}
            </p>
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingRule
                  ? locale === 'ar'
                    ? 'تعديل القاعدة'
                    : 'Edit Rule'
                  : locale === 'ar'
                    ? 'إنشاء قاعدة جديدة'
                    : 'Create New Rule'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'} *
                  </label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    placeholder="استرداد مبلغ كبير"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'} *
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="Large Refund"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Trigger Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'نوع المشغل' : 'Trigger Type'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TRIGGER_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, trigger_type: type.value as any })
                        }
                        className={`p-3 rounded-lg border-2 transition-colors text-center ${
                          formData.trigger_type === type.value
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 mx-auto mb-1 ${
                            formData.trigger_type === type.value ? 'text-red-600' : 'text-slate-400'
                          }`}
                        />
                        <p
                          className={`text-xs font-medium ${
                            formData.trigger_type === type.value ? 'text-red-700' : 'text-slate-600'
                          }`}
                        >
                          {locale === 'ar' ? type.label.ar : type.label.en}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resource & Action */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'المورد' : 'Resource'}
                  </label>
                  <select
                    value={formData.resource}
                    onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">{locale === 'ar' ? 'اختر...' : 'Select...'}</option>
                    {RESOURCES.map((res) => (
                      <option key={res.value} value={res.value}>
                        {locale === 'ar' ? res.label.ar : res.label.en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'الإجراء' : 'Action'}
                  </label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">{locale === 'ar' ? 'اختر...' : 'Select...'}</option>
                    {ACTIONS.map((act) => (
                      <option key={act.value} value={act.value}>
                        {locale === 'ar' ? act.label.ar : act.label.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Condition Value */}
              {formData.trigger_type === 'threshold' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'الحد المالي (ج.م)' : 'Amount Threshold (EGP)'}
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    placeholder="500"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              {formData.trigger_type === 'count' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'العدد في اليوم' : 'Count per Day'}
                  </label>
                  <input
                    type="number"
                    value={formData.count_per_day}
                    onChange={(e) =>
                      setFormData({ ...formData, count_per_day: Number(e.target.value) })
                    }
                    placeholder="5"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              {/* Action Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الإجراء عند التصعيد' : 'Escalation Action'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ACTION_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, action_type: type.value as any })}
                        className={`p-3 rounded-lg border-2 transition-colors text-center ${
                          formData.action_type === type.value
                            ? `border-${type.color}-500 bg-${type.color}-50`
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={{
                          borderColor:
                            formData.action_type === type.value
                              ? type.color === 'amber'
                                ? '#f59e0b'
                                : type.color === 'blue'
                                  ? '#3b82f6'
                                  : '#ef4444'
                              : undefined,
                          backgroundColor:
                            formData.action_type === type.value
                              ? type.color === 'amber'
                                ? '#fef3c7'
                                : type.color === 'blue'
                                  ? '#dbeafe'
                                  : '#fee2e2'
                              : undefined,
                        }}
                      >
                        <Icon
                          className="w-5 h-5 mx-auto mb-1"
                          style={{
                            color:
                              formData.action_type === type.value
                                ? type.color === 'amber'
                                  ? '#d97706'
                                  : type.color === 'blue'
                                    ? '#2563eb'
                                    : '#dc2626'
                                : '#94a3b8',
                          }}
                        />
                        <p
                          className="text-xs font-medium"
                          style={{
                            color:
                              formData.action_type === type.value
                                ? type.color === 'amber'
                                  ? '#b45309'
                                  : type.color === 'blue'
                                    ? '#1d4ed8'
                                    : '#b91c1c'
                                : '#475569',
                          }}
                        >
                          {locale === 'ar' ? type.label.ar : type.label.en}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Escalate To */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'تصعيد إلى دور' : 'Escalate to Role'}
                </label>
                <select
                  value={formData.escalate_to_role_id}
                  onChange={(e) =>
                    setFormData({ ...formData, escalate_to_role_id: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">{locale === 'ar' ? 'اختر دور...' : 'Select role...'}</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {locale === 'ar' ? role.name_ar : role.name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الأولوية' : 'Priority'}
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                  min="0"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {locale === 'ar'
                    ? 'الأرقام الأصغر تُنفذ أولاً'
                    : 'Lower numbers are executed first'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'حفظ' : 'Save'}
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
