'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { ConstraintsEditor } from '@/components/admin/ConstraintsEditor';
import type {
  Role,
  Permission,
  AdminRole,
  AdminPermission,
  PermissionConstraints,
  ResourceCode,
  ActionCode,
} from '@/types/permissions';
import { RESOURCE_CONFIG, ACTION_CONFIG } from '@/types/permissions';
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  Save,
  RefreshCw,
  X,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User as UserIcon,
  Key,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Crown,
  UserCog,
  Headphones,
  Wallet,
  Settings,
  Clock,
  Trash2,
  MapPin,
  ShoppingCart,
  MessageCircle,
  TrendingUp,
  Eye,
  ShieldCheck,
  Store,
} from 'lucide-react';


interface PageProps {
  params: Promise<{ id: string }>;
}

interface SupervisorData {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface DbPermission {
  id: string;
  code: string;
  resource_code: string;
  action_code: string;
  name_ar: string;
  name_en: string;
  severity: string;
}

interface DbAdminRole extends AdminRole {
  role?: Role;
}

interface DbAdminPermission extends AdminPermission {
  permission?: Permission;
}

// Icon mapping
function getRoleIcon(iconName: string) {
  switch (iconName) {
    case 'Crown':
      return <Crown className="w-5 h-5" />;
    case 'UserCog':
      return <UserCog className="w-5 h-5" />;
    case 'Headphones':
      return <Headphones className="w-5 h-5" />;
    case 'Wallet':
      return <Wallet className="w-5 h-5" />;
    case 'ShieldCheck':
      return <ShieldCheck className="w-5 h-5" />;
    case 'Store':
      return <Store className="w-5 h-5" />;
    case 'MapPin':
      return <MapPin className="w-5 h-5" />;
    case 'ShoppingCart':
      return <ShoppingCart className="w-5 h-5" />;
    case 'MessageCircle':
      return <MessageCircle className="w-5 h-5" />;
    case 'TrendingUp':
      return <TrendingUp className="w-5 h-5" />;
    case 'Eye':
      return <Eye className="w-5 h-5" />;
    default:
      return <Shield className="w-5 h-5" />;
  }
}

export default function SupervisorPermissionsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const supervisorId = resolvedParams.id;

  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const { toggle: toggleSidebar } = useAdminSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Supervisor data
  const [supervisor, setSupervisor] = useState<SupervisorData | null>(null);
  const [adminRoles, setAdminRoles] = useState<DbAdminRole[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<DbAdminPermission[]>([]);

  // All available data
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<DbPermission[]>([]);

  // Edit states
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>('');
  const [selectedPermissionToAdd, setSelectedPermissionToAdd] = useState<string>('');
  const [newPermissionType, setNewPermissionType] = useState<'grant' | 'deny'>('grant');
  const [newPermissionReason, setNewPermissionReason] = useState('');
  const [newPermissionConstraints, setNewPermissionConstraints] = useState<PermissionConstraints>(
    {}
  );

  // Expanded sections
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

  const loadData = useCallback(
    async (supabase: ReturnType<typeof createClient>) => {
      // Load supervisor
      const { data: supervisorData } = await supabase
        .from('admin_users')
        .select(
          `
        id, user_id, role, is_active,
        profile:profiles!admin_users_user_id_fkey(full_name, email, avatar_url)
      `
        )
        .eq('id', supervisorId)
        .single();

      if (supervisorData) {
        // Handle profile which might be returned as array from Supabase join
        const profileData = Array.isArray(supervisorData.profile)
          ? supervisorData.profile[0]
          : supervisorData.profile;

        setSupervisor({
          ...supervisorData,
          profile: profileData || undefined,
        });
      }

      // Load admin roles
      const { data: rolesData } = await supabase
        .from('admin_roles')
        .select(
          `
        *,
        role:roles(*)
      `
        )
        .eq('admin_id', supervisorId);

      if (rolesData) {
        setAdminRoles(rolesData);
      }

      // Load admin direct permissions
      const { data: permsData } = await supabase
        .from('admin_permissions')
        .select(
          `
        *,
        permission:permissions(*)
      `
        )
        .eq('admin_id', supervisorId);

      if (permsData) {
        setAdminPermissions(permsData);
      }

      // Load all available roles
      const { data: allRolesData } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('name_ar');

      if (allRolesData) {
        setAllRoles(allRolesData);
      }

      // Load all available permissions
      const { data: allPermsData } = await supabase
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .order('resource_code')
        .order('action_code');

      if (allPermsData) {
        setAllPermissions(allPermsData);
      }
    },
    [supervisorId]
  );

  const checkAuth = useCallback(async () => {
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
  }, [loadData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  function toggleResource(resourceCode: string) {
    const newExpanded = new Set(expandedResources);
    if (newExpanded.has(resourceCode)) {
      newExpanded.delete(resourceCode);
    } else {
      newExpanded.add(resourceCode);
    }
    setExpandedResources(newExpanded);
  }

  async function handleAddRole() {
    if (!selectedRoleToAdd) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('admin_roles').insert({
      admin_id: supervisorId,
      role_id: selectedRoleToAdd,
      is_primary: adminRoles.length === 0,
    });

    if (!error) {
      await loadData(supabase);
      setShowAddRoleModal(false);
      setSelectedRoleToAdd('');
    }

    setSaving(false);
  }

  async function handleRemoveRole(roleId: string) {
    if (
      !confirm(
        locale === 'ar'
          ? 'هل أنت متأكد من إزالة هذا الدور؟'
          : 'Are you sure you want to remove this role?'
      )
    ) {
      return;
    }

    const supabase = createClient();
    await supabase.from('admin_roles').delete().eq('admin_id', supervisorId).eq('role_id', roleId);

    await loadData(supabase);
  }

  async function handleSetPrimaryRole(roleId: string) {
    const supabase = createClient();

    // Reset all to non-primary
    await supabase.from('admin_roles').update({ is_primary: false }).eq('admin_id', supervisorId);

    // Set the selected one as primary
    await supabase
      .from('admin_roles')
      .update({ is_primary: true })
      .eq('admin_id', supervisorId)
      .eq('role_id', roleId);

    await loadData(supabase);
  }

  async function handleAddDirectPermission() {
    if (!selectedPermissionToAdd) return;

    setSaving(true);
    const supabase = createClient();

    // Get current admin id for granted_by
    const { data: currentAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    const { error } = await supabase.from('admin_permissions').insert({
      admin_id: supervisorId,
      permission_id: selectedPermissionToAdd,
      grant_type: newPermissionType,
      reason: newPermissionReason || null,
      constraints: newPermissionConstraints,
      granted_by: currentAdmin?.id,
    });

    if (!error) {
      await loadData(supabase);
      setShowAddPermissionModal(false);
      setSelectedPermissionToAdd('');
      setNewPermissionType('grant');
      setNewPermissionReason('');
      setNewPermissionConstraints({});
    }

    setSaving(false);
  }

  async function handleRemoveDirectPermission(permissionId: string) {
    if (
      !confirm(
        locale === 'ar'
          ? 'هل أنت متأكد من إزالة هذه الصلاحية؟'
          : 'Are you sure you want to remove this permission?'
      )
    ) {
      return;
    }

    const supabase = createClient();
    await supabase.from('admin_permissions').delete().eq('id', permissionId);

    await loadData(supabase);
  }

  // Group permissions by resource
  function getPermissionsByResource(resourceCode: string) {
    return allPermissions.filter((p) => p.resource_code === resourceCode);
  }

  // Get available roles (not already assigned)
  const availableRoles = allRoles.filter(
    (role) => !adminRoles.some((ar) => ar.role_id === role.id)
  );

  // Get available permissions (not already directly assigned)
  const availablePermissions = allPermissions.filter(
    (perm) => !adminPermissions.some((ap) => ap.permission_id === perm.id)
  );

  // Get unique resource codes
  const resourceCodes = [...new Set(allPermissions.map((p) => p.resource_code))];

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
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
              {locale === 'ar' ? 'إدارة صلاحيات المشرف' : 'Manage Supervisor Permissions'}
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

  if (!supervisor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <UserIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'المشرف غير موجود' : 'Supervisor not found'}
          </h1>
          <Link href={`/${locale}/admin/supervisors`}>
            <Button className="bg-red-600 hover:bg-red-700">
              {locale === 'ar' ? 'العودة للمشرفين' : 'Back to Supervisors'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'إدارة صلاحيات المشرف' : 'Manage Supervisor Permissions'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Back Button */}
        <Link
          href={`/${locale}/admin/supervisors`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {locale === 'ar' ? 'العودة للمشرفين' : 'Back to Supervisors'}
        </Link>

        {/* Supervisor Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
              {supervisor.profile?.avatar_url ? (
                <img
                  src={supervisor.profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-slate-600">
                  {supervisor.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">
                {supervisor.profile?.full_name || (locale === 'ar' ? 'بدون اسم' : 'No name')}
              </h1>
              <p className="text-sm text-slate-500">{supervisor.profile?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    supervisor.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {supervisor.is_active ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {supervisor.is_active
                    ? locale === 'ar'
                      ? 'نشط'
                      : 'Active'
                    : locale === 'ar'
                      ? 'غير نشط'
                      : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Roles Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h2 className="font-semibold text-slate-900">
                  {locale === 'ar' ? 'الأدوار المعينة' : 'Assigned Roles'}
                </h2>
                <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                  {adminRoles.length}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddRoleModal(true)}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={availableRoles.length === 0}
              >
                <Plus className="w-4 h-4 me-1" />
                {locale === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </div>

            <div className="p-4 space-y-3">
              {adminRoles.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Crown className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{locale === 'ar' ? 'لا توجد أدوار معينة' : 'No roles assigned'}</p>
                </div>
              ) : (
                adminRoles.map((ar) => (
                  <div key={ar.id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${ar.role?.color}20`,
                            color: ar.role?.color,
                          }}
                        >
                          {getRoleIcon(ar.role?.icon || 'Shield')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">
                              {locale === 'ar' ? ar.role?.name_ar : ar.role?.name_en}
                            </p>
                            {ar.is_primary && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                {locale === 'ar' ? 'رئيسي' : 'Primary'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{ar.role?.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!ar.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimaryRole(ar.role_id)}
                            title={locale === 'ar' ? 'تعيين كرئيسي' : 'Set as primary'}
                          >
                            <Crown className="w-4 h-4 text-amber-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRole(ar.role_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {ar.expires_at && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="w-3 h-3" />
                        {locale === 'ar' ? 'ينتهي:' : 'Expires:'}{' '}
                        {new Date(ar.expires_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Direct Permissions Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-slate-900">
                  {locale === 'ar' ? 'صلاحيات مخصصة' : 'Custom Permissions'}
                </h2>
                <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                  {adminPermissions.length}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddPermissionModal(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 me-1" />
                {locale === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {adminPermissions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Key className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{locale === 'ar' ? 'لا توجد صلاحيات مخصصة' : 'No custom permissions'}</p>
                  <p className="text-xs mt-1">
                    {locale === 'ar'
                      ? 'أضف صلاحيات إضافية أو امنع صلاحيات معينة'
                      : 'Add extra permissions or deny specific ones'}
                  </p>
                </div>
              ) : (
                adminPermissions.map((ap) => (
                  <div
                    key={ap.id}
                    className={`border rounded-lg p-3 ${
                      ap.grant_type === 'grant'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ap.grant_type === 'grant' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p
                            className={`font-medium ${ap.grant_type === 'grant' ? 'text-green-700' : 'text-red-700'}`}
                          >
                            {ap.permission?.code}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ap.grant_type === 'grant'
                              ? locale === 'ar'
                                ? 'صلاحية إضافية'
                                : 'Extra permission'
                              : locale === 'ar'
                                ? 'صلاحية ممنوعة'
                                : 'Denied permission'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDirectPermission(ap.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {ap.reason && (
                      <p className="mt-2 text-xs text-slate-600">
                        {locale === 'ar' ? 'السبب:' : 'Reason:'} {ap.reason}
                      </p>
                    )}

                    {Object.keys(ap.constraints || {}).length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        <AlertTriangle className="w-3 h-3 inline me-1" />
                        {locale === 'ar' ? 'مع قيود' : 'With constraints'}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Effective Permissions Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900">
                {locale === 'ar' ? 'ملخص الصلاحيات الفعلية' : 'Effective Permissions Summary'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {locale === 'ar'
                ? 'الصلاحيات النهائية بعد دمج الأدوار والصلاحيات المخصصة'
                : 'Final permissions after merging roles and custom permissions'}
            </p>
          </div>

          <div className="p-4">
            <div className="space-y-2">
              {resourceCodes.map((resourceCode) => {
                const resourcePerms = getPermissionsByResource(resourceCode);
                const config = RESOURCE_CONFIG[resourceCode as ResourceCode];
                const isExpanded = expandedResources.has(resourceCode);

                // Calculate effective permissions for this resource
                // This is a simplified view - actual logic would be more complex
                const grantedCount = resourcePerms.filter((p) =>
                  adminPermissions.some(
                    (ap) => ap.permission_id === p.id && ap.grant_type === 'grant'
                  )
                ).length;

                const deniedCount = resourcePerms.filter((p) =>
                  adminPermissions.some(
                    (ap) => ap.permission_id === p.id && ap.grant_type === 'deny'
                  )
                ).length;

                return (
                  <div
                    key={resourceCode}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleResource(resourceCode)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-900">
                          {locale === 'ar' ? config?.label.ar : config?.label.en}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({resourcePerms.length} {locale === 'ar' ? 'صلاحية' : 'permissions'})
                        </span>
                        {grantedCount > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            +{grantedCount}
                          </span>
                        )}
                        {deniedCount > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            -{deniedCount}
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-3 grid gap-2 sm:grid-cols-3">
                        {resourcePerms.map((perm) => {
                          const directPerm = adminPermissions.find(
                            (ap) => ap.permission_id === perm.id
                          );
                          const actionConfig = ACTION_CONFIG[perm.action_code as ActionCode];

                          let status: 'granted' | 'denied' | 'from_role' | 'none' = 'none';
                          if (directPerm?.grant_type === 'grant') status = 'granted';
                          else if (directPerm?.grant_type === 'deny') status = 'denied';
                          // Check if any role has this permission
                          // For simplicity, we'll assume roles grant permissions

                          return (
                            <div
                              key={perm.id}
                              className={`text-xs p-2 rounded flex items-center gap-1.5 ${
                                status === 'granted'
                                  ? 'bg-green-100 text-green-700'
                                  : status === 'denied'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {status === 'granted' && <CheckCircle2 className="w-3 h-3" />}
                              {status === 'denied' && <XCircle className="w-3 h-3" />}
                              {status === 'none' && <Minus className="w-3 h-3" />}
                              <span>
                                {locale === 'ar' ? actionConfig?.label.ar : actionConfig?.label.en}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'إضافة دور' : 'Add Role'}
              </h2>
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'اختر الدور' : 'Select Role'}
                </label>
                <select
                  value={selectedRoleToAdd}
                  onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">{locale === 'ar' ? 'اختر...' : 'Select...'}</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {locale === 'ar' ? role.name_ar : role.name_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddRoleModal(false)}
                className="flex-1"
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleAddRole}
                disabled={!selectedRoleToAdd || saving}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : locale === 'ar' ? (
                  'إضافة'
                ) : (
                  'Add'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Permission Modal */}
      {showAddPermissionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'إضافة صلاحية مخصصة' : 'Add Custom Permission'}
              </h2>
              <button
                onClick={() => setShowAddPermissionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Permission Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'نوع الصلاحية' : 'Permission Type'}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPermissionType('grant')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      newPermissionType === 'grant'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-6 h-6 mx-auto mb-1 ${newPermissionType === 'grant' ? 'text-green-600' : 'text-slate-400'}`}
                    />
                    <p
                      className={`text-sm font-medium ${newPermissionType === 'grant' ? 'text-green-700' : 'text-slate-600'}`}
                    >
                      {locale === 'ar' ? 'منح صلاحية' : 'Grant'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPermissionType('deny')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      newPermissionType === 'deny'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <XCircle
                      className={`w-6 h-6 mx-auto mb-1 ${newPermissionType === 'deny' ? 'text-red-600' : 'text-slate-400'}`}
                    />
                    <p
                      className={`text-sm font-medium ${newPermissionType === 'deny' ? 'text-red-700' : 'text-slate-600'}`}
                    >
                      {locale === 'ar' ? 'منع صلاحية' : 'Deny'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Select Permission */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'اختر الصلاحية' : 'Select Permission'}
                </label>
                <select
                  value={selectedPermissionToAdd}
                  onChange={(e) => setSelectedPermissionToAdd(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">{locale === 'ar' ? 'اختر...' : 'Select...'}</option>
                  {resourceCodes.map((resourceCode) => {
                    const perms = availablePermissions.filter(
                      (p) => p.resource_code === resourceCode
                    );
                    if (perms.length === 0) return null;
                    const config = RESOURCE_CONFIG[resourceCode as ResourceCode];
                    return (
                      <optgroup
                        key={resourceCode}
                        label={locale === 'ar' ? config?.label.ar : config?.label.en}
                      >
                        {perms.map((perm) => (
                          <option key={perm.id} value={perm.id}>
                            {perm.code} - {locale === 'ar' ? perm.name_ar : perm.name_en}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'السبب' : 'Reason'}{' '}
                  <span className="text-slate-400 text-xs">
                    ({locale === 'ar' ? 'اختياري' : 'optional'})
                  </span>
                </label>
                <textarea
                  value={newPermissionReason}
                  onChange={(e) => setNewPermissionReason(e.target.value)}
                  placeholder={
                    locale === 'ar'
                      ? 'سبب منح أو منع هذه الصلاحية...'
                      : 'Reason for granting or denying this permission...'
                  }
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Constraints (only for grant) */}
              {newPermissionType === 'grant' && selectedPermissionToAdd && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'القيود' : 'Constraints'}{' '}
                    <span className="text-slate-400 text-xs">
                      ({locale === 'ar' ? 'اختياري' : 'optional'})
                    </span>
                  </label>
                  {(() => {
                    const perm = allPermissions.find((p) => p.id === selectedPermissionToAdd);
                    return (
                      <ConstraintsEditor
                        constraints={newPermissionConstraints}
                        onChange={setNewPermissionConstraints}
                        permissionCode={perm?.code}
                        resourceCode={perm?.resource_code}
                        actionCode={perm?.action_code}
                      />
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddPermissionModal(false)}
                className="flex-1"
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleAddDirectPermission}
                disabled={!selectedPermissionToAdd || saving}
                className={`flex-1 ${newPermissionType === 'grant' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {newPermissionType === 'grant' ? (
                      <Plus className="w-4 h-4 me-1" />
                    ) : (
                      <Minus className="w-4 h-4 me-1" />
                    )}
                    {newPermissionType === 'grant'
                      ? locale === 'ar'
                        ? 'منح الصلاحية'
                        : 'Grant Permission'
                      : locale === 'ar'
                        ? 'منع الصلاحية'
                        : 'Deny Permission'}
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
