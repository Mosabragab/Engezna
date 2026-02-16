'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar, GeoFilter, GeoFilterValue } from '@/components/admin';
import { formatNumber, formatDate } from '@/lib/utils/formatters';
import {
  Shield,
  Users,
  Search,
  RefreshCw,
  UserCog,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Crown,
  Headphones,
  Wallet,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Save,
  AlertCircle,
  MapPin,
  Key,
  Store,
  ShoppingCart,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';

// Dynamic Role from database
interface Role {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  color: string;
  icon: string;
  is_system: boolean;
  is_active: boolean;
}

// Admin role assignment from admin_roles table
interface AdminRoleAssignment {
  id: string;
  admin_id: string;
  role_id: string;
  is_primary: boolean;
  role?: Role;
}

interface AssignedRegion {
  governorate_id: string | null;
  city_id: string | null;
  district_id: string | null;
}

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
}

interface City {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string;
}

interface District {
  id: string;
  name_ar: string;
  name_en: string;
  city_id: string | null;
  governorate_id: string;
}

interface Supervisor {
  id: string;
  user_id: string;
  role: string; // Legacy field - kept for backward compatibility
  assigned_regions: AssignedRegion[];
  is_active: boolean;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  // Profile info from join
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  // New: roles from admin_roles table
  admin_roles: AdminRoleAssignment[];
  // Computed: primary role for display
  primaryRole?: Role;
}

type FilterStatus = 'all' | 'active' | 'inactive';

// Icon mapping for dynamic roles
function getRoleIcon(iconName: string): React.ElementType {
  const iconMap: Record<string, React.ElementType> = {
    Crown: Crown,
    UserCog: UserCog,
    Headphones: Headphones,
    Wallet: Wallet,
    ShieldCheck: ShieldCheck,
    Store: Store,
    MapPin: MapPin,
    ShoppingCart: ShoppingCart,
    MessageCircle: MessageCircle,
    TrendingUp: TrendingUp,
    Eye: Eye,
    Shield: Shield,
  };
  return iconMap[iconName] || Shield;
}

export default function AdminSupervisorsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const { toggle: toggleSidebar } = useAdminSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [filteredSupervisors, setFilteredSupervisors] = useState<Supervisor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all'); // Dynamic role ID or 'all'
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Available roles from database
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);

  // Form states for add/edit
  const [formData, setFormData] = useState({
    email: '',
    role_id: '', // Role ID from roles table
    is_active: true,
    assigned_regions: [] as AssignedRegion[],
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Geography data
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [tempRegion, setTempRegion] = useState<GeoFilterValue>({
    governorate_id: null,
    city_id: null,
    district_id: null,
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byRole: {} as Record<string, number>, // Dynamic role counts
  });

  const loadGeoData = useCallback(async () => {
    const supabase = createClient();

    // Load governorates
    const { data: govData } = await supabase
      .from('governorates')
      .select('id, name_ar, name_en')
      .order('name_ar');

    if (govData) {
      setGovernorates(govData);
    }

    // Load cities
    const { data: cityData } = await supabase
      .from('cities')
      .select('id, name_ar, name_en, governorate_id')
      .order('name_ar');

    if (cityData) {
      setCities(cityData);
    }

    // Load districts
    const { data: districtData } = await supabase
      .from('districts')
      .select('id, name_ar, name_en, city_id, governorate_id')
      .order('name_ar');

    if (districtData) {
      setDistricts(districtData);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    const supabase = createClient();
    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('name_ar');

    if (rolesData) {
      setAvailableRoles(rolesData);
      // Set default role_id if empty - use functional update to check current state
      setFormData((prev) => {
        if (!prev.role_id && rolesData.length > 0) {
          const defaultRole = rolesData.find((r) => r.code === 'general_moderator') || rolesData[0];
          return { ...prev, role_id: defaultRole.id };
        }
        return prev;
      });
    }
  }, []);

  // Helper functions - defined before useCallback that uses them
  function calculateStats(data: Supervisor[]) {
    // Calculate stats by role using admin_roles
    const byRole: Record<string, number> = {};

    data.forEach((s) => {
      // Use primaryRole from admin_roles if available, otherwise fall back to legacy role
      const roleCode = s.primaryRole?.code || s.role;
      if (roleCode) {
        byRole[roleCode] = (byRole[roleCode] || 0) + 1;
      }
    });

    setStats({
      total: data.length,
      active: data.filter((s) => s.is_active).length,
      inactive: data.filter((s) => !s.is_active).length,
      byRole,
    });
  }

  async function loadSupervisors(supabase: ReturnType<typeof createClient>) {
    // Get admin_users with their profile data
    const { data: adminUsers, error } = await supabase
      .from('admin_users')
      .select(
        `
        *,
        profile:profiles!admin_users_user_id_fkey(
          full_name,
          email,
          phone,
          avatar_url
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading supervisors:', error);
      return;
    }

    // Load admin_roles for all supervisors
    const adminIds = (adminUsers || []).map((a) => a.id);
    const { data: allAdminRoles } = await supabase
      .from('admin_roles')
      .select(
        `
        *,
        role:roles(*)
      `
      )
      .in('admin_id', adminIds);

    // Map admin_roles to each supervisor
    const supervisorsData: Supervisor[] = (adminUsers || []).map(
      (admin: Record<string, unknown>) => {
        const adminRoles = (allAdminRoles || []).filter(
          (ar) => ar.admin_id === admin.id
        ) as AdminRoleAssignment[];
        const primaryRoleAssignment = adminRoles.find((ar) => ar.is_primary) || adminRoles[0];
        const profileData = Array.isArray(admin.profile) ? admin.profile[0] : admin.profile;

        return {
          ...admin,
          assigned_regions: (admin.assigned_regions as AssignedRegion[]) || [],
          profile: profileData || {
            full_name: null,
            email: null,
            phone: null,
            avatar_url: null,
          },
          admin_roles: adminRoles,
          primaryRole: primaryRoleAssignment?.role,
        } as Supervisor;
      }
    );

    setSupervisors(supervisorsData);
    calculateStats(supervisorsData);
  }

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

        // Get admin_user record
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id, role')
          .eq('user_id', user.id)
          .single();

        if (adminUser) {
          // Check if user is super_admin - check both legacy field AND admin_roles
          if (adminUser.role === 'super_admin') {
            setIsSuperAdmin(true);
          } else {
            // Also check admin_roles for super_admin role
            const { data: adminRoles } = await supabase
              .from('admin_roles')
              .select('role:roles!inner(code)')
              .eq('admin_id', adminUser.id);

            const hasSuperAdminRole = adminRoles?.some((ar: Record<string, unknown>) => {
              const role = ar.role as { code: string } | { code: string }[] | null;
              const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
              return roleCode === 'super_admin';
            });
            if (hasSuperAdminRole) {
              setIsSuperAdmin(true);
            }
          }
        }

        await loadSupervisors(supabase);
      }
    }

    setLoading(false);
  }, []);

  const filterSupervisors = useCallback(() => {
    let filtered = [...supervisors];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.profile?.full_name?.toLowerCase().includes(query) ||
          s.profile?.phone?.includes(query) ||
          s.profile?.email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => (statusFilter === 'active' ? s.is_active : !s.is_active));
    }

    if (roleFilter !== 'all') {
      // Filter by role_id from admin_roles, or fall back to legacy role code
      filtered = filtered.filter((s) => {
        // Check if any admin_role matches the filter
        const hasRole = s.admin_roles?.some(
          (ar) => ar.role_id === roleFilter || ar.role?.code === roleFilter
        );
        // Also check legacy role field
        return hasRole || s.role === roleFilter;
      });
    }

    setFilteredSupervisors(filtered);
  }, [supervisors, searchQuery, statusFilter, roleFilter]);

  useEffect(() => {
    checkAuth();
    loadGeoData();
    loadRoles();
  }, [checkAuth, loadGeoData, loadRoles]);

  useEffect(() => {
    filterSupervisors();
  }, [filterSupervisors]);

  async function handleToggleActive(supervisor: Supervisor) {
    setActionLoading(supervisor.id);
    const supabase = createClient();

    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: !supervisor.is_active })
      .eq('id', supervisor.id);

    if (!error) {
      setSupervisors((prev) =>
        prev.map((s) => (s.id === supervisor.id ? { ...s, is_active: !s.is_active } : s))
      );
    }

    setActionLoading(null);
  }

  async function handleAddSupervisor() {
    if (!formData.email) {
      setFormError(locale === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required');
      return;
    }

    if (!formData.role_id) {
      setFormError(locale === 'ar' ? 'يرجى اختيار دور' : 'Please select a role');
      return;
    }

    setFormLoading(true);
    setFormError('');
    const supabase = createClient();

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', formData.email)
      .single();

    if (profileError || !profile) {
      setFormError(locale === 'ar' ? 'المستخدم غير موجود' : 'User not found');
      setFormLoading(false);
      return;
    }

    // Check if already an admin
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (existingAdmin) {
      setFormError(
        locale === 'ar' ? 'هذا المستخدم مشرف بالفعل' : 'This user is already a supervisor'
      );
      setFormLoading(false);
      return;
    }

    // Get the selected role for legacy field sync
    const selectedRole = availableRoles.find((r) => r.id === formData.role_id);

    // Update profile role to admin
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', profile.id);

    // Create admin_user record (with legacy role field for backward compatibility)
    const { data: newAdmin, error: createError } = await supabase
      .from('admin_users')
      .insert({
        user_id: profile.id,
        role: selectedRole?.code || 'general_moderator', // Legacy field
        assigned_regions: formData.assigned_regions,
        is_active: formData.is_active,
      })
      .select('id')
      .single();

    if (createError || !newAdmin) {
      setFormError(locale === 'ar' ? 'حدث خطأ أثناء إضافة المشرف' : 'Error adding supervisor');
      setFormLoading(false);
      return;
    }

    // Create admin_role entry (new system)
    const { error: roleError } = await supabase.from('admin_roles').insert({
      admin_id: newAdmin.id,
      role_id: formData.role_id,
      is_primary: true,
    });

    if (roleError) {
      console.error('Error creating admin_role:', roleError);
      // Continue anyway - admin was created, role can be added later
    }

    // Reload supervisors
    await loadSupervisors(supabase);
    setShowAddModal(false);

    // Reset form with default role
    const defaultRole =
      availableRoles.find((r) => r.code === 'general_moderator') || availableRoles[0];
    setFormData({
      email: '',
      role_id: defaultRole?.id || '',
      is_active: true,
      assigned_regions: [],
    });
    setFormLoading(false);
  }

  async function handleEditSupervisor() {
    if (!selectedSupervisor) return;

    if (!formData.role_id) {
      setFormError(locale === 'ar' ? 'يرجى اختيار دور' : 'Please select a role');
      return;
    }

    setFormLoading(true);
    setFormError('');
    const supabase = createClient();

    // Get the selected role for legacy field sync
    const selectedRole = availableRoles.find((r) => r.id === formData.role_id);

    // Update admin_users (with legacy role field)
    const { error } = await supabase
      .from('admin_users')
      .update({
        role: selectedRole?.code || selectedSupervisor.role, // Sync legacy field
        assigned_regions: formData.assigned_regions,
        is_active: formData.is_active,
      })
      .eq('id', selectedSupervisor.id);

    if (error) {
      setFormError(locale === 'ar' ? 'حدث خطأ أثناء تحديث المشرف' : 'Error updating supervisor');
      setFormLoading(false);
      return;
    }

    // Update admin_roles - remove old primary and add new
    // First, check if there's an existing primary role
    const existingPrimaryRole = selectedSupervisor.admin_roles?.find((ar) => ar.is_primary);

    if (existingPrimaryRole && existingPrimaryRole.role_id !== formData.role_id) {
      // Update existing primary role
      await supabase
        .from('admin_roles')
        .update({ role_id: formData.role_id })
        .eq('id', existingPrimaryRole.id);
    } else if (!existingPrimaryRole) {
      // No existing role, create new one
      await supabase.from('admin_roles').insert({
        admin_id: selectedSupervisor.id,
        role_id: formData.role_id,
        is_primary: true,
      });
    }
    // If same role, no change needed

    // Reload supervisors
    await loadSupervisors(supabase);
    setShowEditModal(false);
    setSelectedSupervisor(null);
    setFormLoading(false);
  }

  async function handleDeleteSupervisor() {
    if (!selectedSupervisor) return;

    setFormLoading(true);
    setFormError('');
    const supabase = createClient();

    // Get session token for API call
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setFormError(
        locale === 'ar'
          ? 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'
          : 'Session expired. Please login again.'
      );
      setFormLoading(false);
      return;
    }

    // Call server-side API to completely delete the admin from all tables
    // (auth.users, profiles, admin_users, admin_roles, admin_permissions, etc.)
    const response = await fetch('/api/auth/delete-admin', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        adminId: selectedSupervisor.id,
        userId: selectedSupervisor.user_id,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setFormError(
        result.error || (locale === 'ar' ? 'فشل في حذف المشرف' : 'Failed to delete supervisor')
      );
      setFormLoading(false);
      return;
    }

    // Reload supervisors
    await loadSupervisors(supabase);
    setShowDeleteModal(false);
    setSelectedSupervisor(null);
    setFormLoading(false);
  }

  function openEditModal(supervisor: Supervisor) {
    setSelectedSupervisor(supervisor);
    // Get primary role_id from admin_roles
    const primaryRole =
      supervisor.admin_roles?.find((ar) => ar.is_primary) || supervisor.admin_roles?.[0];
    setFormData({
      email: supervisor.profile?.email || '',
      role_id: primaryRole?.role_id || '',
      is_active: supervisor.is_active,
      assigned_regions: supervisor.assigned_regions || [],
    });
    setTempRegion({ governorate_id: null, city_id: null, district_id: null });
    setFormError('');
    setShowEditModal(true);
  }

  function openDeleteModal(supervisor: Supervisor) {
    setSelectedSupervisor(supervisor);
    setFormError('');
    setShowDeleteModal(true);
  }

  function addRegion() {
    if (!tempRegion.governorate_id) return;

    // Check if region already exists
    const exists = formData.assigned_regions.some(
      (r) => r.governorate_id === tempRegion.governorate_id && r.city_id === tempRegion.city_id
    );

    if (!exists) {
      setFormData({
        ...formData,
        assigned_regions: [...formData.assigned_regions, { ...tempRegion }],
      });
    }

    setTempRegion({ governorate_id: null, city_id: null, district_id: null });
  }

  function removeRegion(index: number) {
    setFormData({
      ...formData,
      assigned_regions: formData.assigned_regions.filter((_, i) => i !== index),
    });
  }

  function getRegionLabel(region: AssignedRegion): string {
    const gov = governorates.find((g) => g.id === region.governorate_id);
    const city = cities.find((c) => c.id === region.city_id);
    const district = districts.find((d) => d.id === region.district_id);

    const govName = gov ? (locale === 'ar' ? gov.name_ar : gov.name_en) : '';
    const cityName = city ? (locale === 'ar' ? city.name_ar : city.name_en) : '';
    const districtName = district ? (locale === 'ar' ? district.name_ar : district.name_en) : '';

    if (districtName) {
      return `${districtName} - ${cityName || govName}`;
    }
    if (cityName) {
      return `${cityName} - ${govName}`;
    }
    return govName || (locale === 'ar' ? 'غير محدد' : 'Not specified');
  }

  function getSupervisorRegionsLabel(supervisor: Supervisor): string {
    if (!supervisor.assigned_regions || supervisor.assigned_regions.length === 0) {
      return locale === 'ar' ? 'كل المناطق' : 'All Regions';
    }

    return (
      supervisor.assigned_regions
        .map((r) => getRegionLabel(r))
        .slice(0, 2)
        .join(', ') +
      (supervisor.assigned_regions.length > 2 ? ` +${supervisor.assigned_regions.length - 2}` : '')
    );
  }

  // Loading and unauthorized states render inside the layout (sidebar stays visible)
  if (loading) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          </div>
        </main>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h2 className="text-lg font-semibold text-slate-800">
              {locale === 'ar' ? 'إدارة المشرفين' : 'Supervisors Management'}
            </h2>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="flex items-center justify-center h-64">
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
        </main>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'إدارة المشرفين' : 'Supervisors Management'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'الإجمالي' : 'Total'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
          </div>
          <div className="bg-card-bg-success rounded-xl p-4 border border-success/30">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-sm text-success">{locale === 'ar' ? 'نشط' : 'Active'}</span>
            </div>
            <p className="text-2xl font-bold text-success">{formatNumber(stats.active, locale)}</p>
          </div>
          <div className="bg-card-bg-error rounded-xl p-4 border border-error/30">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-5 h-5 text-error" />
              <span className="text-sm text-error">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</span>
            </div>
            <p className="text-2xl font-bold text-error">{formatNumber(stats.inactive, locale)}</p>
          </div>
          {/* Dynamic role stats */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'الأدوار' : 'By Role'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableRoles.slice(0, 4).map((role) => {
                const count = stats.byRole[role.code] || 0;
                if (count === 0) return null;
                return (
                  <span
                    key={role.id}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${role.color}20`, color: role.color }}
                  >
                    {count} {locale === 'ar' ? role.name_ar : role.name_en}
                  </span>
                );
              })}
            </div>
          </div>
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
                placeholder={
                  locale === 'ar'
                    ? 'بحث بالاسم أو الهاتف أو البريد الإلكتروني...'
                    : 'Search by name, phone or email...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="all">{locale === 'ar' ? 'كل الأدوار' : 'All Roles'}</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.code}>
                  {locale === 'ar' ? role.name_ar : role.name_en}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => {
                const supabase = createClient();
                loadSupervisors(supabase);
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>

            {isSuperAdmin && (
              <Link href={`/${locale}/admin/supervisors/invite`}>
                <Button className="flex items-center gap-2 bg-[#009DE0] hover:bg-[#0080b8]">
                  <UserPlus className="w-4 h-4" />
                  {locale === 'ar' ? 'دعوة مشرف جديد' : 'Invite Supervisor'}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Supervisors Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'المشرف' : 'Supervisor'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'البريد' : 'Email'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'الهاتف' : 'Phone'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'الدور' : 'Role'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'المناطق' : 'Regions'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'آخر نشاط' : 'Last Active'}
                  </th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                    {locale === 'ar' ? 'تاريخ الإضافة' : 'Added'}
                  </th>
                  {isSuperAdmin && (
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSupervisors.length > 0 ? (
                  filteredSupervisors.map((supervisor) => {
                    // Use primaryRole from admin_roles, fall back to legacy role
                    const displayRole = supervisor.primaryRole;
                    const RoleIcon = displayRole ? getRoleIcon(displayRole.icon) : UserCog;
                    const roleColor = displayRole?.color || '#64748b';

                    return (
                      <tr key={supervisor.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                              {supervisor.profile?.avatar_url ? (
                                <img
                                  src={supervisor.profile.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="font-semibold text-slate-600">
                                  {supervisor.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {supervisor.profile?.full_name ||
                                  (locale === 'ar' ? 'بدون اسم' : 'No name')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="truncate max-w-[180px]">
                              {supervisor.profile?.email || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {supervisor.profile?.phone || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: `${roleColor}20`, color: roleColor }}
                          >
                            <RoleIcon className="w-3.5 h-3.5" />
                            {displayRole
                              ? locale === 'ar'
                                ? displayRole.name_ar
                                : displayRole.name_en
                              : supervisor.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600 max-w-[180px]">
                            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span
                              className="truncate"
                              title={getSupervisorRegionsLabel(supervisor)}
                            >
                              {getSupervisorRegionsLabel(supervisor)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {supervisor.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              {locale === 'ar' ? 'نشط' : 'Active'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3" />
                              {locale === 'ar' ? 'غير نشط' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">
                            {supervisor.last_active_at
                              ? formatDate(supervisor.last_active_at, locale)
                              : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {formatDate(supervisor.created_at, locale)}
                          </div>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleToggleActive(supervisor)}
                                disabled={actionLoading === supervisor.id}
                                title={
                                  supervisor.is_active
                                    ? locale === 'ar'
                                      ? 'إلغاء التفعيل'
                                      : 'Deactivate'
                                    : locale === 'ar'
                                      ? 'تفعيل'
                                      : 'Activate'
                                }
                              >
                                {actionLoading === supervisor.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : supervisor.is_active ? (
                                  <EyeOff className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <Eye className="w-4 h-4 text-green-500" />
                                )}
                              </Button>
                              <Link
                                href={`/${locale}/admin/supervisors/${supervisor.id}/permissions`}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title={locale === 'ar' ? 'إدارة الصلاحيات' : 'Manage Permissions'}
                                >
                                  <Key className="w-4 h-4 text-purple-500" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditModal(supervisor)}
                              >
                                <Edit className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openDeleteModal(supervisor)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isSuperAdmin ? 9 : 8} className="px-4 py-12 text-center">
                      <UserCog className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">
                        {locale === 'ar'
                          ? 'لا يوجد مشرفين مطابقين'
                          : 'No matching supervisors found'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Supervisor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'إضافة مشرف جديد' : 'Add New Supervisor'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'البريد الإلكتروني للمستخدم' : 'User Email'}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={locale === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter email address'}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {locale === 'ar'
                    ? 'يجب أن يكون المستخدم مسجل بالفعل'
                    : 'User must be already registered'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الدور' : 'Role'}
                </label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">{locale === 'ar' ? 'اختر الدور...' : 'Select role...'}</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {locale === 'ar' ? role.name_ar : role.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">
                  {locale === 'ar' ? 'نشط' : 'Active'}
                </label>
              </div>

              {/* Assigned Regions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'المناطق المخصصة' : 'Assigned Regions'}
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  {locale === 'ar'
                    ? 'اختر المناطق التي يمكن للمشرف الوصول إليها. اتركها فارغة للوصول الكامل.'
                    : 'Select regions this supervisor can access. Leave empty for full access.'}
                </p>

                {/* Region selector */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <GeoFilter
                      value={tempRegion}
                      onChange={setTempRegion}
                      showDistrict={true}
                      inline={false}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addRegion}
                    disabled={!tempRegion.governorate_id}
                    className="self-end"
                  >
                    {locale === 'ar' ? 'إضافة' : 'Add'}
                  </Button>
                </div>

                {/* Assigned regions list */}
                {formData.assigned_regions.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {formData.assigned_regions.map((region, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{getRegionLabel(region)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRegion(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleAddSupervisor}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'إضافة' : 'Add'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supervisor Modal */}
      {showEditModal && selectedSupervisor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'تعديل المشرف' : 'Edit Supervisor'}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
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

            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                {locale === 'ar' ? 'المشرف:' : 'Supervisor:'}
              </p>
              <p className="font-medium text-slate-900">
                {selectedSupervisor.profile?.full_name || selectedSupervisor.profile?.email}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الدور' : 'Role'}
                </label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">{locale === 'ar' ? 'اختر الدور...' : 'Select role...'}</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {locale === 'ar' ? role.name_ar : role.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                />
                <label htmlFor="edit_is_active" className="text-sm text-slate-700">
                  {locale === 'ar' ? 'نشط' : 'Active'}
                </label>
              </div>

              {/* Assigned Regions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'المناطق المخصصة' : 'Assigned Regions'}
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  {locale === 'ar'
                    ? 'اختر المناطق التي يمكن للمشرف الوصول إليها. اتركها فارغة للوصول الكامل.'
                    : 'Select regions this supervisor can access. Leave empty for full access.'}
                </p>

                {/* Region selector */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <GeoFilter
                      value={tempRegion}
                      onChange={setTempRegion}
                      showDistrict={true}
                      inline={false}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addRegion}
                    disabled={!tempRegion.governorate_id}
                    className="self-end"
                  >
                    {locale === 'ar' ? 'إضافة' : 'Add'}
                  </Button>
                </div>

                {/* Assigned regions list */}
                {formData.assigned_regions.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {formData.assigned_regions.map((region, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{getRegionLabel(region)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRegion(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleEditSupervisor}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSupervisor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'حذف المشرف' : 'Delete Supervisor'}
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-center text-slate-600">
                {locale === 'ar'
                  ? `هل أنت متأكد من حذف المشرف "${selectedSupervisor.profile?.full_name || selectedSupervisor.profile?.email}"؟`
                  : `Are you sure you want to delete supervisor "${selectedSupervisor.profile?.full_name || selectedSupervisor.profile?.email}"?`}
              </p>
              <p className="text-center text-sm text-slate-500 mt-2">
                {locale === 'ar'
                  ? 'سيتم حذف هذا المشرف نهائياً من النظام بالكامل'
                  : 'This supervisor will be permanently deleted from the system'}
              </p>
              {formError && (
                <p className="text-center text-sm text-red-600 mt-3 bg-red-50 rounded-lg p-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleDeleteSupervisor}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'حذف' : 'Delete'}
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
