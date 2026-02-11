'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getBusinessCategories, type BusinessCategory } from '@/lib/supabase/business-categories';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  Shield,
  Tag,
  Plus,
  Search,
  RefreshCw,
  Percent,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Gift,
  MapPin,
  Store,
  Users,
  ShoppingBag,
} from 'lucide-react';
import { GeoFilter, type GeoFilterValue } from '@/components/admin/GeoFilter';

interface PromoCode {
  id: string;
  code: string;
  description_ar: string | null;
  description_en: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  valid_from: string;
  valid_until: string;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  is_active: boolean;
  applicable_categories: string[] | null;
  applicable_providers: string[] | null;
  first_order_only: boolean;
  governorate_id: string | null;
  city_id: string | null;
  created_at: string;
}

interface ProviderOption {
  id: string;
  name_ar: string;
  name_en: string;
  category: string | null;
}

// Categories loaded dynamically from business_categories table

type FilterStatus = 'all' | 'active' | 'inactive' | 'expired';

export default function AdminPromotionsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [filteredPromoCodes, setFilteredPromoCodes] = useState<PromoCode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // P2: Edit state
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  // P4: Categories from database + Providers list for applicable_providers
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [providerSearch, setProviderSearch] = useState('');

  // Form state for create/edit (P1 + P4: expanded with new fields)
  const [formData, setFormData] = useState({
    code: '',
    description_ar: '',
    description_en: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    min_order_amount: 0,
    max_discount_amount: 0,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    usage_limit: 0,
    is_active: true,
    // P1: Geo-targeting
    governorate_id: null as string | null,
    city_id: null as string | null,
    // P4: Hidden fields
    first_order_only: false,
    per_user_limit: 1,
    applicable_categories: [] as string[],
    applicable_providers: [] as string[],
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    totalUsage: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterPromoCodes();
  }, [promoCodes, searchQuery, statusFilter]);

  async function checkAuth() {
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
        const [, , cats] = await Promise.all([
          loadPromoCodes(),
          loadProviders(),
          getBusinessCategories(),
        ]);
        setCategories(cats);
      }
    }

    setLoading(false);
  }

  async function loadPromoCodes() {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setPromoCodes([]);
        return;
      }

      setPromoCodes(data || []);

      // Calculate stats
      const now = new Date();
      const active = (data || []).filter(
        (p) => p.is_active && new Date(p.valid_until) >= now
      ).length;
      const expired = (data || []).filter((p) => new Date(p.valid_until) < now).length;
      const totalUsage = (data || []).reduce((sum, p) => sum + (p.usage_count || 0), 0);

      setStats({
        total: (data || []).length,
        active,
        expired,
        totalUsage,
      });
    } catch {
      setPromoCodes([]);
    }
  }

  // P4: Load providers for applicable_providers multi-select
  const loadProviders = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('providers')
      .select('id, name_ar, name_en, category')
      .eq('status', 'open')
      .order('name_ar');
    setProviders(data || []);
  }, []);

  function filterPromoCodes() {
    let filtered = [...promoCodes];
    const now = new Date();

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.code.toLowerCase().includes(query) ||
          p.description_ar?.toLowerCase().includes(query) ||
          p.description_en?.toLowerCase().includes(query)
      );
    }

    switch (statusFilter) {
      case 'active':
        filtered = filtered.filter((p) => p.is_active && new Date(p.valid_until) >= now);
        break;
      case 'inactive':
        filtered = filtered.filter((p) => !p.is_active);
        break;
      case 'expired':
        filtered = filtered.filter((p) => new Date(p.valid_until) < now);
        break;
    }

    setFilteredPromoCodes(filtered);
  }

  // P2: Combined create/update handler
  async function handleSavePromo() {
    const supabase = createClient();

    try {
      const validFromDate = new Date(formData.valid_from);
      validFromDate.setHours(0, 0, 0, 0);

      const validUntilDate = new Date(formData.valid_until);
      validUntilDate.setHours(23, 59, 59, 999);

      const promoData = {
        code: formData.code.toUpperCase(),
        description_ar: formData.description_ar || null,
        description_en: formData.description_en || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_order_amount: formData.min_order_amount,
        max_discount_amount: formData.max_discount_amount || null,
        valid_from: validFromDate.toISOString(),
        valid_until: validUntilDate.toISOString(),
        usage_limit: formData.usage_limit || null,
        is_active: formData.is_active,
        // P1: Geo-targeting
        governorate_id: formData.governorate_id || null,
        city_id: formData.city_id || null,
        // P4: Hidden fields
        first_order_only: formData.first_order_only,
        per_user_limit: formData.per_user_limit || 1,
        applicable_categories:
          formData.applicable_categories.length > 0 ? formData.applicable_categories : null,
        applicable_providers:
          formData.applicable_providers.length > 0 ? formData.applicable_providers : null,
      };

      if (editingPromoId) {
        // Update existing promo
        const { error } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingPromoId);

        if (error) throw error;
      } else {
        // Create new promo
        const { error } = await supabase.from('promo_codes').insert({
          ...promoData,
          usage_count: 0,
        });

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingPromoId(null);
      resetForm();
      await loadPromoCodes();
    } catch {
      alert(
        locale === 'ar'
          ? editingPromoId
            ? 'حدث خطأ أثناء تحديث كود الخصم'
            : 'حدث خطأ أثناء إنشاء كود الخصم'
          : editingPromoId
            ? 'Error updating promo code'
            : 'Error creating promo code'
      );
    }
  }

  // P2: Edit promo - populate form with existing data
  function handleEditPromo(promo: PromoCode) {
    setFormData({
      code: promo.code,
      description_ar: promo.description_ar || '',
      description_en: promo.description_en || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_order_amount: promo.min_order_amount,
      max_discount_amount: promo.max_discount_amount || 0,
      valid_from: promo.valid_from.split('T')[0],
      valid_until: promo.valid_until.split('T')[0],
      usage_limit: promo.usage_limit || 0,
      is_active: promo.is_active,
      // P1: Geo-targeting
      governorate_id: promo.governorate_id,
      city_id: promo.city_id,
      // P4: Hidden fields
      first_order_only: promo.first_order_only || false,
      per_user_limit: promo.per_user_limit || 1,
      applicable_categories: promo.applicable_categories || [],
      applicable_providers: promo.applicable_providers || [],
    });
    setEditingPromoId(promo.id);
    setShowCreateModal(true);
  }

  async function handleToggleActive(promo: PromoCode) {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);

      if (error) throw error;

      await loadPromoCodes();
    } catch {
      // Error handled silently
    }
  }

  async function handleDelete(promoId: string) {
    if (
      !confirm(
        locale === 'ar'
          ? 'هل أنت متأكد من حذف هذا الكود؟'
          : 'Are you sure you want to delete this promo code?'
      )
    ) {
      return;
    }

    const supabase = createClient();

    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', promoId);

      if (error) throw error;

      await loadPromoCodes();
    } catch {
      // Error handled silently
    }
  }

  function resetForm() {
    setFormData({
      code: '',
      description_ar: '',
      description_en: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_amount: 0,
      max_discount_amount: 0,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      usage_limit: 0,
      is_active: true,
      governorate_id: null,
      city_id: null,
      first_order_only: false,
      per_user_limit: 1,
      applicable_categories: [],
      applicable_providers: [],
    });
    setEditingPromoId(null);
  }

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
  }

  // P1: Geo filter change handler
  function handleGeoChange(geo: GeoFilterValue) {
    setFormData({
      ...formData,
      governorate_id: geo.governorate_id,
      city_id: geo.city_id,
    });
  }

  // P4: Toggle category in applicable_categories
  function toggleCategory(category: string) {
    setFormData((prev) => {
      const cats = prev.applicable_categories.includes(category)
        ? prev.applicable_categories.filter((c) => c !== category)
        : [...prev.applicable_categories, category];
      return { ...prev, applicable_categories: cats };
    });
  }

  // P4: Toggle provider in applicable_providers
  function toggleProvider(providerId: string) {
    setFormData((prev) => {
      const provs = prev.applicable_providers.includes(providerId)
        ? prev.applicable_providers.filter((p) => p !== providerId)
        : [...prev.applicable_providers, providerId];
      return { ...prev, applicable_providers: provs };
    });
  }

  // P4: Filtered providers for search
  const filteredProviders = providerSearch
    ? providers.filter(
        (p) =>
          p.name_ar.toLowerCase().includes(providerSearch.toLowerCase()) ||
          p.name_en.toLowerCase().includes(providerSearch.toLowerCase())
      )
    : providers;

  const getStatusBadge = (promo: PromoCode) => {
    const now = new Date();
    const isExpired = new Date(promo.valid_until) < now;

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          <Calendar className="w-3 h-3" />
          {locale === 'ar' ? 'منتهي' : 'Expired'}
        </span>
      );
    }

    if (!promo.is_active) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          {locale === 'ar' ? 'غير مفعل' : 'Inactive'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" />
        {locale === 'ar' ? 'مفعل' : 'Active'}
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="h-8 bg-slate-200 rounded animate-pulse w-48"></div>
        </div>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
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
              {locale === 'ar' ? 'العروض والخصومات' : 'Promotions & Discounts'}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/auth/login`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
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
        title={locale === 'ar' ? 'العروض والخصومات' : 'Promotions & Discounts'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Tag className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'إجمالي الأكواد' : 'Total Codes'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">{locale === 'ar' ? 'مفعل' : 'Active'}</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {formatNumber(stats.active, locale)}
            </p>
          </div>
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-300">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'منتهي' : 'Expired'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-700">
              {formatNumber(stats.expired, locale)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-purple-700">
                {locale === 'ar' ? 'مرات الاستخدام' : 'Total Usage'}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {formatNumber(stats.totalUsage, locale)}
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
              />
              <input
                type="text"
                placeholder={
                  locale === 'ar' ? 'بحث بالكود أو الوصف...' : 'Search by code or description...'
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
              <option value="active">{locale === 'ar' ? 'مفعل' : 'Active'}</option>
              <option value="inactive">{locale === 'ar' ? 'غير مفعل' : 'Inactive'}</option>
              <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
            </select>

            <Button
              variant="outline"
              onClick={() => loadPromoCodes()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>

            <Button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'كود جديد' : 'New Code'}
            </Button>
          </div>
        </div>

        {/* Promo Codes Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'الكود' : 'Code'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'الوصف' : 'Description'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'الخصم' : 'Discount'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'الحد الأدنى' : 'Min Order'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'الاستخدام' : 'Usage'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'صالح حتى' : 'Valid Until'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'القيود' : 'Targeting'}
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPromoCodes.length > 0 ? (
                  filteredPromoCodes.map((promo) => (
                    <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{promo.code}</span>
                          <button
                            onClick={() => copyToClipboard(promo.code)}
                            className="text-slate-400 hover:text-slate-600"
                            title={locale === 'ar' ? 'نسخ' : 'Copy'}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {locale === 'ar' ? promo.description_ar : promo.description_en || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {promo.discount_type === 'percentage' ? (
                            <>
                              <Percent className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-700">
                                {promo.discount_value}%
                              </span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-700">
                                {formatCurrency(promo.discount_value, locale)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {formatCurrency(promo.min_order_amount, locale)}{' '}
                          {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {promo.usage_count || 0}
                          {promo.usage_limit && ` / ${promo.usage_limit}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">
                          {formatDate(promo.valid_until, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(promo)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {promo.governorate_id && (
                            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                              <MapPin className="w-3 h-3" />
                              {locale === 'ar' ? 'جغرافي' : 'Geo'}
                            </span>
                          )}
                          {promo.first_order_only && (
                            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                              <Users className="w-3 h-3" />
                              {locale === 'ar' ? 'أول طلب' : '1st Order'}
                            </span>
                          )}
                          {promo.applicable_categories &&
                            promo.applicable_categories.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                                <ShoppingBag className="w-3 h-3" />
                                {promo.applicable_categories.length}
                              </span>
                            )}
                          {promo.applicable_providers && promo.applicable_providers.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">
                              <Store className="w-3 h-3" />
                              {promo.applicable_providers.length}
                            </span>
                          )}
                          {!promo.governorate_id &&
                            !promo.first_order_only &&
                            !promo.applicable_categories?.length &&
                            !promo.applicable_providers?.length && (
                              <span className="text-xs text-slate-400">
                                {locale === 'ar' ? 'بدون قيود' : 'None'}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* P2: Edit button */}
                          <button
                            onClick={() => handleEditPromo(promo)}
                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title={locale === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(promo)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            title={
                              promo.is_active
                                ? locale === 'ar'
                                  ? 'إلغاء التفعيل'
                                  : 'Deactivate'
                                : locale === 'ar'
                                  ? 'تفعيل'
                                  : 'Activate'
                            }
                          >
                            {promo.is_active ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(promo.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title={locale === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <Tag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">
                        {locale === 'ar' ? 'لا توجد أكواد خصم' : 'No promo codes found'}
                      </p>
                      <Button
                        onClick={() => {
                          resetForm();
                          setShowCreateModal(true);
                        }}
                        className="mt-4"
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {locale === 'ar' ? 'إنشاء كود جديد' : 'Create New Code'}
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create/Edit Modal (P1 + P2 + P4) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingPromoId
                  ? locale === 'ar'
                    ? 'تعديل كود الخصم'
                    : 'Edit Promo Code'
                  : locale === 'ar'
                    ? 'إنشاء كود خصم جديد'
                    : 'Create New Promo Code'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'كود الخصم' : 'Promo Code'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary font-mono uppercase"
                    placeholder="SAVE20"
                  />
                  <Button variant="outline" onClick={generateCode}>
                    {locale === 'ar' ? 'توليد' : 'Generate'}
                  </Button>
                </div>
              </div>

              {/* Description AR */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                </label>
                <input
                  type="text"
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="خصم 20% على جميع الطلبات"
                />
              </div>

              {/* Description EN */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                </label>
                <input
                  type="text"
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="20% off all orders"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'نوع الخصم' : 'Discount Type'}
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="percentage">
                      {locale === 'ar' ? 'نسبة مئوية' : 'Percentage'}
                    </option>
                    <option value="fixed">{locale === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'قيمة الخصم' : 'Discount Value'}
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'الحد الأدنى للطلب' : 'Min Order Amount'}
                  </label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_order_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'الحد الأقصى للخصم' : 'Max Discount'}
                  </label>
                  <input
                    type="number"
                    value={formData.max_discount_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_discount_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'صالح من' : 'Valid From'}
                  </label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'صالح حتى' : 'Valid Until'}
                  </label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Usage Limit & Per User Limit (P4) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar'
                      ? 'الحد الأقصى للاستخدام (0 = غير محدود)'
                      : 'Usage Limit (0 = unlimited)'}
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) =>
                      setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'الحد لكل مستخدم' : 'Per User Limit'}
                  </label>
                  <input
                    type="number"
                    value={formData.per_user_limit}
                    onChange={(e) =>
                      setFormData({ ...formData, per_user_limit: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                    min="1"
                  />
                </div>
              </div>

              {/* Toggles: Is Active + First Order Only (P4) */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="is_active" className="text-sm text-slate-700">
                    {locale === 'ar' ? 'تفعيل الكود' : 'Active'}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="first_order_only"
                    checked={formData.first_order_only}
                    onChange={(e) =>
                      setFormData({ ...formData, first_order_only: e.target.checked })
                    }
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="first_order_only" className="text-sm text-slate-700">
                    {locale === 'ar' ? 'للطلب الأول فقط' : 'First order only'}
                  </label>
                </div>
              </div>

              {/* P1: Geo-Targeting */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {locale === 'ar' ? 'الاستهداف الجغرافي' : 'Geo-Targeting'}
                  <span className="text-xs font-normal text-slate-400">
                    ({locale === 'ar' ? 'اختياري' : 'optional'})
                  </span>
                </h3>
                <GeoFilter
                  value={{
                    governorate_id: formData.governorate_id,
                    city_id: formData.city_id,
                    district_id: null,
                  }}
                  onChange={handleGeoChange}
                  inline={false}
                  showClearButton={true}
                />
              </div>

              {/* P4: Applicable Categories */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  {locale === 'ar' ? 'الفئات المستهدفة' : 'Applicable Categories'}
                  <span className="text-xs font-normal text-slate-400">
                    ({locale === 'ar' ? 'اترك فارغاً للكل' : 'leave empty for all'})
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => toggleCategory(cat.code)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        formData.applicable_categories.includes(cat.code)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-primary'
                      }`}
                    >
                      {cat.icon} {locale === 'ar' ? cat.name_ar : cat.name_en}
                    </button>
                  ))}
                </div>
              </div>

              {/* P4: Applicable Providers */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  {locale === 'ar' ? 'متاجر محددة' : 'Specific Providers'}
                  <span className="text-xs font-normal text-slate-400">
                    ({locale === 'ar' ? 'اترك فارغاً للكل' : 'leave empty for all'})
                  </span>
                </h3>
                {formData.applicable_providers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.applicable_providers.map((pid) => {
                      const prov = providers.find((p) => p.id === pid);
                      return (
                        <span
                          key={pid}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200"
                        >
                          {prov ? (locale === 'ar' ? prov.name_ar : prov.name_en) : pid.slice(0, 8)}
                          <button
                            type="button"
                            onClick={() => toggleProvider(pid)}
                            className="hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <input
                  type="text"
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary text-sm mb-2"
                  placeholder={locale === 'ar' ? 'ابحث عن متجر...' : 'Search providers...'}
                />
                {providerSearch && (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {filteredProviders.length > 0 ? (
                      filteredProviders.slice(0, 20).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            toggleProvider(p.id);
                            setProviderSearch('');
                          }}
                          className={`w-full text-start px-3 py-2 text-sm hover:bg-slate-50 ${
                            formData.applicable_providers.includes(p.id)
                              ? 'bg-teal-50 text-teal-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {locale === 'ar' ? p.name_ar : p.name_en}
                          {p.category && (
                            <span className="text-xs text-slate-400 ms-2">({p.category})</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-400">
                        {locale === 'ar' ? 'لا توجد نتائج' : 'No results'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSavePromo}
                disabled={!formData.code || !formData.valid_until}
                className="bg-primary hover:bg-primary/90"
              >
                {editingPromoId
                  ? locale === 'ar'
                    ? 'تحديث'
                    : 'Update'
                  : locale === 'ar'
                    ? 'إنشاء'
                    : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
