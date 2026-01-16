'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import type { User } from '@supabase/supabase-js';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Store,
  CheckCircle,
  XCircle,
  Users,
  Shield,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface SettlementGroup {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  frequency: 'daily' | '3_days' | 'weekly';
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  provider_count?: number;
}

interface Provider {
  id: string;
  name_ar: string;
  name_en: string;
  logo_url: string | null;
  settlement_group_id: string | null;
}

export default function SettlementGroupsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const { toggle: toggleSidebar } = useAdminSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [groups, setGroups] = useState<SettlementGroup[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SettlementGroup | null>(null);
  const [editingGroup, setEditingGroup] = useState<SettlementGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Form states
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formDescAr, setFormDescAr] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formFrequency, setFormFrequency] = useState<'daily' | '3_days' | 'weekly'>('3_days');
  const [formIsDefault, setFormIsDefault] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();

    // Fetch groups
    const { data: groupsData, error: groupsError } = await supabase
      .from('settlement_groups')
      .select('*')
      .order('created_at', { ascending: true });

    // Fetch all providers for assignment
    const { data: providersData } = await supabase
      .from('providers')
      .select('id, name_ar, name_en, logo_url, settlement_group_id')
      .order('name_ar');

    if (groupsData) {
      const groupsWithCount = groupsData.map((group) => ({
        ...group,
        provider_count:
          providersData?.filter((p) => p.settlement_group_id === group.id).length || 0,
      }));
      setGroups(groupsWithCount);
    }

    if (providersData) {
      setProviders(providersData);
    }
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
        await loadData();
      }
    }

    setLoading(false);
  }, [loadData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function handleSaveGroup() {
    setSaving(true);
    setActionMessage(null);
    const supabase = createClient();

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from('settlement_groups')
          .update({
            name_ar: formNameAr,
            name_en: formNameEn,
            description_ar: formDescAr || null,
            description_en: formDescEn || null,
            frequency: formFrequency,
            is_default: formIsDefault,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingGroup.id);

        if (error) throw error;

        if (formIsDefault) {
          await supabase
            .from('settlement_groups')
            .update({ is_default: false })
            .neq('id', editingGroup.id);
        }

        setActionMessage({
          type: 'success',
          text: isRTL ? 'تم تحديث المجموعة بنجاح' : 'Group updated successfully',
        });
        loadData();
        resetForm();
      } else {
        const { error } = await supabase.from('settlement_groups').insert({
          name_ar: formNameAr,
          name_en: formNameEn,
          description_ar: formDescAr || null,
          description_en: formDescEn || null,
          frequency: formFrequency,
          is_default: formIsDefault,
        });

        if (error) throw error;

        if (formIsDefault) {
          await supabase
            .from('settlement_groups')
            .update({ is_default: false })
            .neq('name_ar', formNameAr);
        }

        setActionMessage({
          type: 'success',
          text: isRTL ? 'تم إضافة المجموعة بنجاح' : 'Group added successfully',
        });
        loadData();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving group:', error);
      setActionMessage({
        type: 'error',
        text: isRTL ? 'حدث خطأ أثناء حفظ المجموعة' : 'Error saving group',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    if (
      !confirm(
        isRTL ? 'هل أنت متأكد من حذف هذه المجموعة؟' : 'Are you sure you want to delete this group?'
      )
    ) {
      return;
    }

    const supabase = createClient();
    await supabase.from('settlement_groups').delete().eq('id', groupId);
    loadData();
  }

  async function handleAssignProvider(providerId: string, groupId: string | null) {
    const supabase = createClient();
    await supabase.from('providers').update({ settlement_group_id: groupId }).eq('id', providerId);
    loadData();
  }

  async function handleToggleActive(group: SettlementGroup) {
    const supabase = createClient();
    await supabase
      .from('settlement_groups')
      .update({ is_active: !group.is_active })
      .eq('id', group.id);
    loadData();
  }

  function resetForm() {
    setShowAddModal(false);
    setEditingGroup(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormDescAr('');
    setFormDescEn('');
    setFormFrequency('3_days');
    setFormIsDefault(false);
  }

  function openEditModal(group: SettlementGroup) {
    setEditingGroup(group);
    setFormNameAr(group.name_ar);
    setFormNameEn(group.name_en);
    setFormDescAr(group.description_ar || '');
    setFormDescEn(group.description_en || '');
    setFormFrequency(group.frequency);
    setFormIsDefault(group.is_default);
    setShowAddModal(true);
  }

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'daily':
        return isRTL ? 'يومي' : 'Daily';
      case '3_days':
        return isRTL ? 'كل ٣ أيام' : 'Every 3 Days';
      case 'weekly':
        return isRTL ? 'أسبوعي (السبت)' : 'Weekly (Saturday)';
      default:
        return freq;
    }
  };

  const getFrequencyColor = (freq: string) => {
    switch (freq) {
      case 'daily':
        return 'bg-green-100 text-green-800';
      case '3_days':
        return 'bg-blue-100 text-blue-800';
      case 'weekly':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
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
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
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
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={isRTL ? 'مجموعات التسوية' : 'Settlement Groups'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="space-y-6">
          {/* Back Button */}
          <Link href={`/${locale}/admin/settlements`}>
            <Button variant="ghost" className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {isRTL ? 'العودة للتسويات' : 'Back to Settlements'}
            </Button>
          </Link>

          {/* Header Actions */}
          <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-sm text-slate-600">
                {isRTL ? `${groups.length} مجموعات` : `${groups.length} groups`}
              </span>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'إضافة مجموعة' : 'Add Group'}
            </Button>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`bg-white rounded-xl border p-4 ${!group.is_active ? 'opacity-60' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {isRTL ? group.name_ar : group.name_en}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {isRTL ? group.description_ar : group.description_en}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(group)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(group.frequency)}`}
                  >
                    <Clock className="w-3 h-3 inline mr-1" />
                    {getFrequencyLabel(group.frequency)}
                  </span>
                  {group.is_default && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {isRTL ? 'افتراضي' : 'Default'}
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${
                      group.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                    onClick={() => handleToggleActive(group)}
                  >
                    {group.is_active ? (
                      <>
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        {isRTL ? 'نشط' : 'Active'}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 inline mr-1" />
                        {isRTL ? 'معطل' : 'Inactive'}
                      </>
                    )}
                  </span>
                </div>

                {/* Provider Count */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Store className="w-4 h-4" />
                    <span>
                      {group.provider_count} {isRTL ? 'متجر' : 'providers'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedGroup(group);
                      setShowAssignModal(true);
                    }}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    {isRTL ? 'إدارة' : 'Manage'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Unassigned Providers */}
          {providers.filter((p) => !p.settlement_group_id).length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <Store className="w-5 h-5" />
                {isRTL ? 'متاجر بدون مجموعة' : 'Unassigned Providers'}
                <span className="bg-amber-200 px-2 py-0.5 rounded-full text-xs">
                  {providers.filter((p) => !p.settlement_group_id).length}
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {providers
                  .filter((p) => !p.settlement_group_id)
                  .map((provider) => (
                    <span
                      key={provider.id}
                      className="bg-white px-3 py-1.5 rounded-lg text-sm border border-amber-200"
                    >
                      {isRTL ? provider.name_ar : provider.name_en}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4">
              {editingGroup
                ? isRTL
                  ? 'تعديل المجموعة'
                  : 'Edit Group'
                : isRTL
                  ? 'إضافة مجموعة جديدة'
                  : 'Add New Group'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="تسوية يومية"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {isRTL ? 'الاسم بالإنجليزية' : 'Name (English)'}
                </label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Daily Settlement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {isRTL ? 'الوصف بالعربية (اختياري)' : 'Description (Arabic) - Optional'}
                </label>
                <input
                  type="text"
                  value={formDescAr}
                  onChange={(e) => setFormDescAr(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="وصف المجموعة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {isRTL ? 'الوصف بالإنجليزية (اختياري)' : 'Description (English) - Optional'}
                </label>
                <input
                  type="text"
                  value={formDescEn}
                  onChange={(e) => setFormDescEn(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Group description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {isRTL ? 'دورة التسوية' : 'Settlement Frequency'}
                </label>
                <select
                  value={formFrequency}
                  onChange={(e) =>
                    setFormFrequency(e.target.value as 'daily' | '3_days' | 'weekly')
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="daily">{isRTL ? 'يومياً' : 'Daily'}</option>
                  <option value="3_days">{isRTL ? 'كل ٣ أيام' : 'Every 3 Days'}</option>
                  <option value="weekly">{isRTL ? 'أسبوعياً (السبت)' : 'Weekly (Saturday)'}</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="is_default" className="text-sm">
                  {isRTL
                    ? 'المجموعة الافتراضية للمتاجر الجديدة'
                    : 'Default group for new providers'}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={resetForm} className="flex-1" disabled={saving}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSaveGroup}
                className="flex-1"
                disabled={!formNameAr || !formNameEn || saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    {isRTL ? 'جاري الحفظ...' : 'Saving...'}
                  </span>
                ) : isRTL ? (
                  'حفظ'
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
            actionMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          {actionMessage.text}
        </div>
      )}

      {/* Assign Providers Modal */}
      {showAssignModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {isRTL
                ? `إدارة متاجر "${selectedGroup.name_ar}"`
                : `Manage "${selectedGroup.name_en}" Providers`}
            </h2>

            {providers.length === 0 ? (
              <div className="text-center py-8">
                <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">
                  {isRTL ? 'لا توجد متاجر معتمدة بعد' : 'No approved providers yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Providers in this group */}
                {providers.filter((p) => p.settlement_group_id === selectedGroup.id).length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-600 mb-2">
                      {isRTL ? 'المتاجر في هذه المجموعة:' : 'Providers in this group:'}
                    </p>
                    {providers
                      .filter((p) => p.settlement_group_id === selectedGroup.id)
                      .map((provider) => (
                        <div
                          key={provider.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50 border-emerald-200 mb-2"
                        >
                          <span className="font-medium text-emerald-800">
                            {isRTL ? provider.name_ar : provider.name_en}
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleAssignProvider(provider.id, null)}
                          >
                            {isRTL ? 'إزالة' : 'Remove'}
                          </Button>
                        </div>
                      ))}
                  </div>
                )}

                {/* Providers not in this group */}
                {providers.filter((p) => p.settlement_group_id !== selectedGroup.id).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">
                      {isRTL ? 'متاجر أخرى:' : 'Other providers:'}
                    </p>
                    {providers
                      .filter((p) => p.settlement_group_id !== selectedGroup.id)
                      .map((provider) => {
                        const currentGroupName = groups.find(
                          (g) => g.id === provider.settlement_group_id
                        );
                        return (
                          <div
                            key={provider.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 mb-2"
                          >
                            <div>
                              <span className="font-medium">
                                {isRTL ? provider.name_ar : provider.name_en}
                              </span>
                              {currentGroupName && (
                                <span className="text-xs text-slate-500 block">
                                  {isRTL
                                    ? `حالياً في: ${currentGroupName.name_ar}`
                                    : `Currently in: ${currentGroupName.name_en}`}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAssignProvider(provider.id, selectedGroup.id)}
                            >
                              {isRTL ? 'إضافة' : 'Add'}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(false)}
                className="w-full"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
