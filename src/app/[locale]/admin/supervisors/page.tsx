'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, AdminSidebar, GeoFilter, GeoFilterValue } from '@/components/admin'
import { formatNumber, formatDate } from '@/lib/utils/formatters'
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
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// Admin role types matching the database enum
type AdminRole = 'super_admin' | 'general_moderator' | 'support' | 'finance'

interface Permissions {
  providers: { view: boolean; approve: boolean; edit: boolean; delete: boolean }
  orders: { view: boolean; cancel: boolean; refund: boolean }
  customers: { view: boolean; ban: boolean; edit: boolean }
  finance: { view: boolean; settlements: boolean; reports: boolean }
  support: { view: boolean; assign: boolean; resolve: boolean }
  team: { view: boolean; manage: boolean }
  settings: { view: boolean; edit: boolean }
  analytics: { view: boolean }
}

interface AssignedRegion {
  governorate_id: string | null
  city_id: string | null
  district_id: string | null
}

interface Governorate {
  id: string
  name_ar: string
  name_en: string
}

interface City {
  id: string
  name_ar: string
  name_en: string
  governorate_id: string
}

interface District {
  id: string
  name_ar: string
  name_en: string
  city_id: string | null
  governorate_id: string
}

interface Supervisor {
  id: string
  user_id: string
  role: AdminRole
  permissions: Permissions
  assigned_regions: AssignedRegion[]
  is_active: boolean
  last_active_at: string | null
  created_at: string
  updated_at: string
  // Profile info from join
  profile: {
    full_name: string | null
    email: string | null
    phone: string | null
    avatar_url: string | null
  }
}

type FilterStatus = 'all' | 'active' | 'inactive'
type FilterRole = 'all' | AdminRole

// Default permissions by role
const getDefaultPermissions = (role: AdminRole): Permissions => {
  switch (role) {
    case 'super_admin':
      return {
        providers: { view: true, approve: true, edit: true, delete: true },
        orders: { view: true, cancel: true, refund: true },
        customers: { view: true, ban: true, edit: true },
        finance: { view: true, settlements: true, reports: true },
        support: { view: true, assign: true, resolve: true },
        team: { view: true, manage: true },
        settings: { view: true, edit: true },
        analytics: { view: true },
      }
    case 'general_moderator':
      return {
        providers: { view: true, approve: true, edit: true, delete: false },
        orders: { view: true, cancel: true, refund: false },
        customers: { view: true, ban: true, edit: false },
        finance: { view: false, settlements: false, reports: false },
        support: { view: true, assign: false, resolve: false },
        team: { view: false, manage: false },
        settings: { view: false, edit: false },
        analytics: { view: true },
      }
    case 'support':
      return {
        providers: { view: true, approve: false, edit: false, delete: false },
        orders: { view: true, cancel: false, refund: false },
        customers: { view: true, ban: false, edit: false },
        finance: { view: false, settlements: false, reports: false },
        support: { view: true, assign: true, resolve: true },
        team: { view: false, manage: false },
        settings: { view: false, edit: false },
        analytics: { view: false },
      }
    case 'finance':
      return {
        providers: { view: true, approve: false, edit: false, delete: false },
        orders: { view: true, cancel: false, refund: true },
        customers: { view: true, ban: false, edit: false },
        finance: { view: true, settlements: true, reports: true },
        support: { view: false, assign: false, resolve: false },
        team: { view: false, manage: false },
        settings: { view: false, edit: false },
        analytics: { view: true },
      }
    default:
      return {
        providers: { view: true, approve: false, edit: false, delete: false },
        orders: { view: true, cancel: false, refund: false },
        customers: { view: true, ban: false, edit: false },
        finance: { view: false, settlements: false, reports: false },
        support: { view: true, assign: false, resolve: false },
        team: { view: false, manage: false },
        settings: { view: false, edit: false },
        analytics: { view: true },
      }
  }
}

// Role labels and icons
const roleConfig: Record<AdminRole, { label: { ar: string; en: string }; icon: React.ElementType; color: string }> = {
  super_admin: {
    label: { ar: 'المدير التنفيذي', en: 'Super Admin' },
    icon: Crown,
    color: 'text-amber-600 bg-amber-100',
  },
  general_moderator: {
    label: { ar: 'مشرف عام', en: 'General Moderator' },
    icon: ShieldCheck,
    color: 'text-blue-600 bg-blue-100',
  },
  support: {
    label: { ar: 'مشرف دعم', en: 'Support' },
    icon: Headphones,
    color: 'text-purple-600 bg-purple-100',
  },
  finance: {
    label: { ar: 'مشرف مالي', en: 'Finance' },
    icon: Wallet,
    color: 'text-emerald-600 bg-emerald-100',
  },
}

export default function AdminSupervisorsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [filteredSupervisors, setFilteredSupervisors] = useState<Supervisor[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null)

  // Form states for add/edit
  const [formData, setFormData] = useState({
    email: '',
    role: 'general_moderator' as AdminRole,
    is_active: true,
    assigned_regions: [] as AssignedRegion[],
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Geography data
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [tempRegion, setTempRegion] = useState<GeoFilterValue>({
    governorate_id: null,
    city_id: null,
    district_id: null,
  })

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    superAdmins: 0,
    moderators: 0,
    support: 0,
    finance: 0,
  })

  useEffect(() => {
    checkAuth()
    loadGeoData()
  }, [])

  useEffect(() => {
    filterSupervisors()
  }, [supervisors, searchQuery, statusFilter, roleFilter])

  async function loadGeoData() {
    const supabase = createClient()

    // Load governorates
    const { data: govData } = await supabase
      .from('governorates')
      .select('id, name_ar, name_en')
      .order('name_ar')

    if (govData) {
      setGovernorates(govData)
    }

    // Load cities
    const { data: cityData } = await supabase
      .from('cities')
      .select('id, name_ar, name_en, governorate_id')
      .order('name_ar')

    if (cityData) {
      setCities(cityData)
    }

    // Load districts
    const { data: districtData } = await supabase
      .from('districts')
      .select('id, name_ar, name_en, city_id, governorate_id')
      .order('name_ar')

    if (districtData) {
      setDistricts(districtData)
    }
  }

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setIsAdmin(true)

        // Check if user is super_admin
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (adminUser?.role === 'super_admin') {
          setIsSuperAdmin(true)
        }

        await loadSupervisors(supabase)
      }
    }

    setLoading(false)
  }

  async function loadSupervisors(supabase: ReturnType<typeof createClient>) {
    // Get admin_users with their profile data
    const { data: adminUsers, error } = await supabase
      .from('admin_users')
      .select(`
        *,
        profile:profiles!admin_users_user_id_fkey(
          full_name,
          email,
          phone,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading supervisors:', error)
      // Try alternative query without join
      const { data: adminUsersAlt, error: altError } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (altError) {
        console.error('Alternative query also failed:', altError)
        return
      }

      // Manually fetch profiles
      const supervisorsWithProfiles: Supervisor[] = await Promise.all(
        (adminUsersAlt || []).map(async (admin) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email, phone, avatar_url')
            .eq('id', admin.user_id)
            .single()

          return {
            ...admin,
            assigned_regions: admin.assigned_regions || [],
            profile: profileData || {
              full_name: null,
              email: null,
              phone: null,
              avatar_url: null,
            },
          }
        })
      )

      setSupervisors(supervisorsWithProfiles)
      calculateStats(supervisorsWithProfiles)
      return
    }

    const supervisorsData = (adminUsers || []).map((admin: any) => ({
      ...admin,
      assigned_regions: admin.assigned_regions || [],
      profile: admin.profile || {
        full_name: null,
        email: null,
        phone: null,
        avatar_url: null,
      },
    }))

    setSupervisors(supervisorsData)
    calculateStats(supervisorsData)
  }

  function calculateStats(data: Supervisor[]) {
    const stats = {
      total: data.length,
      active: data.filter(s => s.is_active).length,
      inactive: data.filter(s => !s.is_active).length,
      superAdmins: data.filter(s => s.role === 'super_admin').length,
      moderators: data.filter(s => s.role === 'general_moderator').length,
      support: data.filter(s => s.role === 'support').length,
      finance: data.filter(s => s.role === 'finance').length,
    }
    setStats(stats)
  }

  function filterSupervisors() {
    let filtered = [...supervisors]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s =>
        s.profile?.full_name?.toLowerCase().includes(query) ||
        s.profile?.phone?.includes(query) ||
        s.profile?.email?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s =>
        statusFilter === 'active' ? s.is_active : !s.is_active
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(s => s.role === roleFilter)
    }

    setFilteredSupervisors(filtered)
  }

  async function handleToggleActive(supervisor: Supervisor) {
    setActionLoading(supervisor.id)
    const supabase = createClient()

    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: !supervisor.is_active })
      .eq('id', supervisor.id)

    if (!error) {
      setSupervisors(prev => prev.map(s =>
        s.id === supervisor.id ? { ...s, is_active: !s.is_active } : s
      ))
    }

    setActionLoading(null)
  }

  async function handleAddSupervisor() {
    if (!formData.email) {
      setFormError(locale === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required')
      return
    }

    setFormLoading(true)
    setFormError('')
    const supabase = createClient()

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', formData.email)
      .single()

    if (profileError || !profile) {
      setFormError(locale === 'ar' ? 'المستخدم غير موجود' : 'User not found')
      setFormLoading(false)
      return
    }

    // Check if already an admin
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', profile.id)
      .single()

    if (existingAdmin) {
      setFormError(locale === 'ar' ? 'هذا المستخدم مشرف بالفعل' : 'This user is already a supervisor')
      setFormLoading(false)
      return
    }

    // Update profile role to admin
    await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', profile.id)

    // Create admin_user record
    const { error: createError } = await supabase
      .from('admin_users')
      .insert({
        user_id: profile.id,
        role: formData.role,
        permissions: getDefaultPermissions(formData.role),
        assigned_regions: formData.assigned_regions,
        is_active: formData.is_active,
      })

    if (createError) {
      console.error('Error creating supervisor:', createError)
      setFormError(locale === 'ar' ? 'حدث خطأ أثناء إضافة المشرف' : 'Error adding supervisor')
      setFormLoading(false)
      return
    }

    // Reload supervisors
    await loadSupervisors(supabase)
    setShowAddModal(false)
    setFormData({ email: '', role: 'general_moderator', is_active: true, assigned_regions: [] })
    setFormLoading(false)
  }

  async function handleEditSupervisor() {
    if (!selectedSupervisor) return

    setFormLoading(true)
    setFormError('')
    const supabase = createClient()

    const { error } = await supabase
      .from('admin_users')
      .update({
        role: formData.role,
        permissions: getDefaultPermissions(formData.role),
        assigned_regions: formData.assigned_regions,
        is_active: formData.is_active,
      })
      .eq('id', selectedSupervisor.id)

    if (error) {
      console.error('Error updating supervisor:', error)
      setFormError(locale === 'ar' ? 'حدث خطأ أثناء تحديث المشرف' : 'Error updating supervisor')
      setFormLoading(false)
      return
    }

    // Reload supervisors
    await loadSupervisors(supabase)
    setShowEditModal(false)
    setSelectedSupervisor(null)
    setFormLoading(false)
  }

  async function handleDeleteSupervisor() {
    if (!selectedSupervisor) return

    setFormLoading(true)
    const supabase = createClient()

    // Remove from admin_users
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', selectedSupervisor.id)

    if (error) {
      console.error('Error deleting supervisor:', error)
      setFormLoading(false)
      return
    }

    // Update profile role back to customer
    await supabase
      .from('profiles')
      .update({ role: 'customer' })
      .eq('id', selectedSupervisor.user_id)

    // Reload supervisors
    await loadSupervisors(supabase)
    setShowDeleteModal(false)
    setSelectedSupervisor(null)
    setFormLoading(false)
  }

  function openEditModal(supervisor: Supervisor) {
    setSelectedSupervisor(supervisor)
    setFormData({
      email: supervisor.profile?.email || '',
      role: supervisor.role,
      is_active: supervisor.is_active,
      assigned_regions: supervisor.assigned_regions || [],
    })
    setTempRegion({ governorate_id: null, city_id: null, district_id: null })
    setFormError('')
    setShowEditModal(true)
  }

  function openDeleteModal(supervisor: Supervisor) {
    setSelectedSupervisor(supervisor)
    setShowDeleteModal(true)
  }

  function addRegion() {
    if (!tempRegion.governorate_id) return

    // Check if region already exists
    const exists = formData.assigned_regions.some(r =>
      r.governorate_id === tempRegion.governorate_id &&
      r.city_id === tempRegion.city_id
    )

    if (!exists) {
      setFormData({
        ...formData,
        assigned_regions: [...formData.assigned_regions, { ...tempRegion }],
      })
    }

    setTempRegion({ governorate_id: null, city_id: null, district_id: null })
  }

  function removeRegion(index: number) {
    setFormData({
      ...formData,
      assigned_regions: formData.assigned_regions.filter((_, i) => i !== index),
    })
  }

  function getRegionLabel(region: AssignedRegion): string {
    const gov = governorates.find(g => g.id === region.governorate_id)
    const city = cities.find(c => c.id === region.city_id)
    const district = districts.find(d => d.id === region.district_id)

    const govName = gov ? (locale === 'ar' ? gov.name_ar : gov.name_en) : ''
    const cityName = city ? (locale === 'ar' ? city.name_ar : city.name_en) : ''
    const districtName = district ? (locale === 'ar' ? district.name_ar : district.name_en) : ''

    if (districtName) {
      return `${districtName} - ${cityName || govName}`
    }
    if (cityName) {
      return `${cityName} - ${govName}`
    }
    return govName || (locale === 'ar' ? 'غير محدد' : 'Not specified')
  }

  function getSupervisorRegionsLabel(supervisor: Supervisor): string {
    if (!supervisor.assigned_regions || supervisor.assigned_regions.length === 0) {
      return locale === 'ar' ? 'كل المناطق' : 'All Regions'
    }

    return supervisor.assigned_regions
      .map(r => getRegionLabel(r))
      .slice(0, 2)
      .join(', ') + (supervisor.assigned_regions.length > 2 ? ` +${supervisor.assigned_regions.length - 2}` : '')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'إدارة المشرفين' : 'Supervisors Management'}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">{locale === 'ar' ? 'نشط' : 'Active'}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatNumber(stats.active, locale)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{formatNumber(stats.inactive, locale)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-700">{locale === 'ar' ? 'مدراء' : 'Super Admins'}</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{formatNumber(stats.superAdmins, locale)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-700">{locale === 'ar' ? 'مشرفين' : 'Moderators'}</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{formatNumber(stats.moderators, locale)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <Headphones className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-purple-700">{locale === 'ar' ? 'دعم' : 'Support'}</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{formatNumber(stats.support, locale)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-emerald-700">{locale === 'ar' ? 'مالية' : 'Finance'}</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatNumber(stats.finance, locale)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث بالاسم أو الهاتف أو البريد الإلكتروني...' : 'Search by name, phone or email...'}
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
                onChange={(e) => setRoleFilter(e.target.value as FilterRole)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الأدوار' : 'All Roles'}</option>
                <option value="super_admin">{locale === 'ar' ? 'المدير التنفيذي' : 'Super Admin'}</option>
                <option value="general_moderator">{locale === 'ar' ? 'مشرف عام' : 'General Moderator'}</option>
                <option value="support">{locale === 'ar' ? 'مشرف دعم' : 'Support'}</option>
                <option value="finance">{locale === 'ar' ? 'مشرف مالي' : 'Finance'}</option>
              </select>

              <Button
                variant="outline"
                onClick={() => {
                  const supabase = createClient()
                  loadSupervisors(supabase)
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
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المشرف' : 'Supervisor'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'البريد' : 'Email'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الهاتف' : 'Phone'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الدور' : 'Role'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المناطق' : 'Regions'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'آخر نشاط' : 'Last Active'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'تاريخ الإضافة' : 'Added'}</th>
                    {isSuperAdmin && (
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSupervisors.length > 0 ? (
                    filteredSupervisors.map((supervisor) => {
                      const RoleIcon = roleConfig[supervisor.role]?.icon || UserCog
                      const roleColor = roleConfig[supervisor.role]?.color || 'text-slate-600 bg-slate-100'

                      return (
                        <tr key={supervisor.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                                {supervisor.profile?.avatar_url ? (
                                  <img src={supervisor.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-semibold text-slate-600">
                                    {supervisor.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {supervisor.profile?.full_name || (locale === 'ar' ? 'بدون اسم' : 'No name')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <span className="truncate max-w-[180px]">{supervisor.profile?.email || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="w-4 h-4 text-slate-400" />
                              {supervisor.profile?.phone || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${roleColor}`}>
                              <RoleIcon className="w-3.5 h-3.5" />
                              {roleConfig[supervisor.role]?.label[locale === 'ar' ? 'ar' : 'en']}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600 max-w-[180px]">
                              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="truncate" title={getSupervisorRegionsLabel(supervisor)}>
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
                              {supervisor.last_active_at ? formatDate(supervisor.last_active_at, locale) : '-'}
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
                                  title={supervisor.is_active
                                    ? (locale === 'ar' ? 'إلغاء التفعيل' : 'Deactivate')
                                    : (locale === 'ar' ? 'تفعيل' : 'Activate')
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
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={isSuperAdmin ? 9 : 8} className="px-4 py-12 text-center">
                        <UserCog className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا يوجد مشرفين مطابقين' : 'No matching supervisors found'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

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
                  {locale === 'ar' ? 'يجب أن يكون المستخدم مسجل بالفعل' : 'User must be already registered'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الدور' : 'Role'}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminRole })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="general_moderator">{locale === 'ar' ? 'مشرف عام' : 'General Moderator'}</option>
                  <option value="support">{locale === 'ar' ? 'مشرف دعم' : 'Support'}</option>
                  <option value="finance">{locale === 'ar' ? 'مشرف مالي' : 'Finance'}</option>
                  <option value="super_admin">{locale === 'ar' ? 'المدير التنفيذي' : 'Super Admin'}</option>
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
                  {locale === 'ar' ? 'اختر المناطق التي يمكن للمشرف الوصول إليها. اتركها فارغة للوصول الكامل.' : 'Select regions this supervisor can access. Leave empty for full access.'}
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
                      <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
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
              <p className="text-sm text-slate-600">{locale === 'ar' ? 'المشرف:' : 'Supervisor:'}</p>
              <p className="font-medium text-slate-900">{selectedSupervisor.profile?.full_name || selectedSupervisor.profile?.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الدور' : 'Role'}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminRole })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="general_moderator">{locale === 'ar' ? 'مشرف عام' : 'General Moderator'}</option>
                  <option value="support">{locale === 'ar' ? 'مشرف دعم' : 'Support'}</option>
                  <option value="finance">{locale === 'ar' ? 'مشرف مالي' : 'Finance'}</option>
                  <option value="super_admin">{locale === 'ar' ? 'المدير التنفيذي' : 'Super Admin'}</option>
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
                  {locale === 'ar' ? 'اختر المناطق التي يمكن للمشرف الوصول إليها. اتركها فارغة للوصول الكامل.' : 'Select regions this supervisor can access. Leave empty for full access.'}
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
                      <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
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
                  : `Are you sure you want to delete supervisor "${selectedSupervisor.profile?.full_name || selectedSupervisor.profile?.email}"?`
                }
              </p>
              <p className="text-center text-sm text-slate-500 mt-2">
                {locale === 'ar'
                  ? 'سيتم إزالة صلاحيات الإدارة من هذا المستخدم'
                  : 'Admin privileges will be removed from this user'
                }
              </p>
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
    </div>
  )
}
