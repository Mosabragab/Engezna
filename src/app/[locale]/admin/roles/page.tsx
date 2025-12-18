'use client'

import React from 'react'
import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatDate } from '@/lib/utils/formatters'
import type { Role, Resource, Action, Permission, RolePermission, ResourceCode, ActionCode } from '@/types/permissions'
import { RESOURCE_CONFIG, ACTION_CONFIG } from '@/types/permissions'
import {
  Shield,
  Users,
  Search,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  Key,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Save,
  X,
  AlertTriangle,
  Crown,
  UserCog,
  Headphones,
  Wallet,
  Settings,
  Copy,
  MapPin,
  ShoppingCart,
  MessageCircle,
  TrendingUp,
  ShieldCheck,
  Store,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// Database permission with joined relations
interface DbPermission {
  id: string
  code: string
  resource_id: string
  action_id: string
  resource?: { id: string; code: string; name_ar: string; name_en: string }
  action?: { id: string; code: string; name_ar: string; name_en: string; severity: string }
}

// Database role permission with joined relations (for viewing)
interface DbRolePermission {
  id: string
  role_id: string
  permission_id: string
  constraints: Record<string, unknown>
  permission?: {
    id: string
    code: string
    resource?: { code: string; name_ar: string; name_en: string }
    action?: { code: string; name_ar: string; name_en: string; severity: string }
  }
}

interface ExtendedRole extends Role {
  permissions_count: number
  admins_count: number
}

export default function AdminRolesPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [roles, setRoles] = useState<ExtendedRole[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [permissions, setPermissions] = useState<DbPermission[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRoles, setFilteredRoles] = useState<ExtendedRole[]>([])

  // Edit/Create modal
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<ExtendedRole | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    color: '#3b82f6',
    icon: 'UserCog',
  })
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // View permissions modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingRole, setViewingRole] = useState<ExtendedRole | null>(null)
  const [rolePermissions, setRolePermissions] = useState<DbRolePermission[]>([])
  const [viewLoading, setViewLoading] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterRoles()
  }, [roles, searchQuery])

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

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id, role')
          .eq('user_id', user.id)
          .single()

        if (adminUser) {
          setCurrentAdminId(adminUser.id)
          if (adminUser.role === 'super_admin') {
            setIsSuperAdmin(true)
          }
        }

        await loadData(supabase)
      }
    }

    setLoading(false)
  }

  async function loadData(supabase: ReturnType<typeof createClient>) {
    // Load roles with counts
    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name_ar')

    if (rolesData) {
      // Get permission counts for each role
      const rolesWithCounts = await Promise.all(
        rolesData.map(async (role) => {
          const { count: permCount } = await supabase
            .from('role_permissions')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.id)

          const { count: adminCount } = await supabase
            .from('admin_roles')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.id)

          return {
            ...role,
            permissions_count: permCount || 0,
            admins_count: adminCount || 0,
          }
        })
      )
      setRoles(rolesWithCounts)
    }

    // Load resources
    const { data: resourcesData } = await supabase
      .from('resources')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (resourcesData) {
      setResources(resourcesData)
    }

    // Load actions
    const { data: actionsData } = await supabase
      .from('actions')
      .select('*')
      .order('code')

    if (actionsData) {
      setActions(actionsData)
    }

    // Load all permissions
    const { data: permissionsData } = await supabase
      .from('permissions')
      .select(`
        *,
        resource:resources (id, code, name_ar, name_en),
        action:actions (id, code, name_ar, name_en, severity)
      `)

    if (permissionsData) {
      setPermissions(permissionsData)
    }
  }

  function filterRoles() {
    let filtered = [...roles]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        r.name_ar.toLowerCase().includes(query) ||
        r.name_en.toLowerCase().includes(query) ||
        r.code.toLowerCase().includes(query)
      )
    }

    setFilteredRoles(filtered)
  }

  function openCreateModal() {
    setEditingRole(null)
    setFormData({
      code: '',
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      color: '#3b82f6',
      icon: 'UserCog',
    })
    setSelectedPermissions(new Set())
    setExpandedResources(new Set())
    setFormError('')
    setShowModal(true)
  }

  async function openEditModal(role: ExtendedRole) {
    setEditingRole(role)
    setFormData({
      code: role.code,
      name_ar: role.name_ar,
      name_en: role.name_en,
      description_ar: role.description_ar || '',
      description_en: role.description_en || '',
      color: role.color,
      icon: role.icon,
    })

    // Load role's permissions
    const supabase = createClient()
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', role.id)

    if (rolePerms) {
      setSelectedPermissions(new Set(rolePerms.map(rp => rp.permission_id)))
    }

    setExpandedResources(new Set())
    setFormError('')
    setShowModal(true)
  }

  async function openViewModal(role: ExtendedRole) {
    setViewingRole(role)
    setRolePermissions([]) // Reset permissions before loading
    setViewLoading(true)
    setShowViewModal(true) // Show modal immediately

    const supabase = createClient()
    const { data: rolePerms, error } = await supabase
      .from('role_permissions')
      .select(`
        *,
        permission:permissions (
          id,
          code,
          resource:resources (code, name_ar, name_en),
          action:actions (code, name_ar, name_en, severity)
        )
      `)
      .eq('role_id', role.id)

    setRolePermissions(rolePerms || [])
    setViewLoading(false)
  }

  function toggleResource(resourceId: string) {
    const newExpanded = new Set(expandedResources)
    if (newExpanded.has(resourceId)) {
      newExpanded.delete(resourceId)
    } else {
      newExpanded.add(resourceId)
    }
    setExpandedResources(newExpanded)
  }

  function togglePermission(permissionId: string) {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId)
    } else {
      newSelected.add(permissionId)
    }
    setSelectedPermissions(newSelected)
  }

  function selectAllResourcePermissions(resourceId: string, select: boolean) {
    const resourcePerms = permissions.filter(p => p.resource_id === resourceId)
    const newSelected = new Set(selectedPermissions)

    resourcePerms.forEach(p => {
      if (select) {
        newSelected.add(p.id)
      } else {
        newSelected.delete(p.id)
      }
    })

    setSelectedPermissions(newSelected)
  }

  async function handleSave() {
    if (!formData.code || !formData.name_ar || !formData.name_en) {
      setFormError(locale === 'ar' ? 'الكود والاسم مطلوبان' : 'Code and name are required')
      return
    }

    setFormLoading(true)
    setFormError('')
    const supabase = createClient()

    try {
      if (editingRole) {
        // Update existing role
        const { error: roleError } = await supabase
          .from('roles')
          .update({
            code: formData.code,
            name_ar: formData.name_ar,
            name_en: formData.name_en,
            description_ar: formData.description_ar || null,
            description_en: formData.description_en || null,
            color: formData.color,
            icon: formData.icon,
          })
          .eq('id', editingRole.id)

        if (roleError) throw roleError

        // Update permissions - delete old and insert new
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', editingRole.id)

        if (selectedPermissions.size > 0) {
          const permInserts = Array.from(selectedPermissions).map(permId => ({
            role_id: editingRole.id,
            permission_id: permId,
            constraints: {},
          }))

          const { error: permError } = await supabase
            .from('role_permissions')
            .insert(permInserts)

          if (permError) throw permError
        }
      } else {
        // Create new role
        const { data: newRole, error: roleError } = await supabase
          .from('roles')
          .insert({
            code: formData.code,
            name_ar: formData.name_ar,
            name_en: formData.name_en,
            description_ar: formData.description_ar || null,
            description_en: formData.description_en || null,
            color: formData.color,
            icon: formData.icon,
            is_system: false,
            is_active: true,
          })
          .select()
          .single()

        if (roleError) throw roleError

        // Insert permissions
        if (selectedPermissions.size > 0 && newRole) {
          const permInserts = Array.from(selectedPermissions).map(permId => ({
            role_id: newRole.id,
            permission_id: permId,
            constraints: {},
          }))

          const { error: permError } = await supabase
            .from('role_permissions')
            .insert(permInserts)

          if (permError) throw permError
        }
      }

      await loadData(supabase)
      setShowModal(false)
    } catch (error: any) {
      setFormError(error.message || (locale === 'ar' ? 'حدث خطأ' : 'An error occurred'))
    }

    setFormLoading(false)
  }

  async function handleDelete(role: ExtendedRole) {
    if (role.is_system) {
      alert(locale === 'ar' ? 'لا يمكن حذف دور النظام' : 'Cannot delete system role')
      return
    }

    if (role.admins_count > 0) {
      alert(locale === 'ar'
        ? 'لا يمكن حذف دور مُستخدم. قم بإزالة المشرفين أولاً'
        : 'Cannot delete role in use. Remove admins first')
      return
    }

    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا الدور؟' : 'Are you sure you want to delete this role?')) {
      return
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', role.id)

    if (error) {
      alert(locale === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting role')
      return
    }

    await loadData(supabase)
  }

  async function handleDuplicate(role: ExtendedRole) {
    const newCode = `${role.code}_copy`
    const newNameAr = `${role.name_ar} (نسخة)`
    const newNameEn = `${role.name_en} (Copy)`

    setEditingRole(null)
    setFormData({
      code: newCode,
      name_ar: newNameAr,
      name_en: newNameEn,
      description_ar: role.description_ar || '',
      description_en: role.description_en || '',
      color: role.color,
      icon: role.icon,
    })

    // Load role's permissions
    const supabase = createClient()
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', role.id)

    if (rolePerms) {
      setSelectedPermissions(new Set(rolePerms.map(rp => rp.permission_id)))
    }

    setExpandedResources(new Set())
    setFormError('')
    setShowModal(true)
  }

  function getRoleIcon(iconName: string) {
    switch (iconName) {
      case 'Crown': return <Crown className="w-5 h-5" />
      case 'UserCog': return <UserCog className="w-5 h-5" />
      case 'Headphones': return <Headphones className="w-5 h-5" />
      case 'Wallet': return <Wallet className="w-5 h-5" />
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5" />
      case 'Store': return <Store className="w-5 h-5" />
      case 'MapPin': return <MapPin className="w-5 h-5" />
      case 'ShoppingCart': return <ShoppingCart className="w-5 h-5" />
      case 'MessageCircle': return <MessageCircle className="w-5 h-5" />
      case 'TrendingUp': return <TrendingUp className="w-5 h-5" />
      case 'Eye': return <Eye className="w-5 h-5" />
      default: return <Shield className="w-5 h-5" />
    }
  }

  function getPermissionsByResource(resourceId: string) {
    return permissions.filter(p => p.resource_id === resourceId)
  }

  function isAllResourceSelected(resourceId: string) {
    const resourcePerms = getPermissionsByResource(resourceId)
    return resourcePerms.length > 0 && resourcePerms.every(p => selectedPermissions.has(p.id))
  }

  function isSomeResourceSelected(resourceId: string) {
    const resourcePerms = getPermissionsByResource(resourceId)
    return resourcePerms.some(p => selectedPermissions.has(p.id)) && !isAllResourceSelected(resourceId)
  }

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6">
          <div className="h-8 w-48 bg-slate-200 animate-pulse rounded"></div>
        </div>
      </>
    )
  }

  if (!user || !isAdmin || !isSuperAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'إدارة الأدوار والصلاحيات' : 'Roles & Permissions Management'}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <p className="text-slate-600 mb-4">
              {locale === 'ar'
                ? 'هذه الصفحة متاحة فقط للمدير التنفيذي'
                : 'This page is only available for super admins'}
            </p>
            <Link href={`/${locale}/admin`}>
              <Button className="bg-red-600 hover:bg-red-700">
                {locale === 'ar' ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
              </Button>
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'إدارة الأدوار والصلاحيات' : 'Roles & Permissions Management'}
        onMenuClick={toggleSidebar}
      />

      <main className="p-4 lg:p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'إجمالي الأدوار' : 'Total Roles'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{roles.length}</p>
            </div>
            <div className="bg-card-bg-primary rounded-xl p-4 border border-primary/30">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary">{locale === 'ar' ? 'أدوار النظام' : 'System Roles'}</span>
              </div>
              <p className="text-2xl font-bold text-primary">{roles.filter(r => r.is_system).length}</p>
            </div>
            <div className="bg-card-bg-success rounded-xl p-4 border border-success/30">
              <div className="flex items-center gap-3 mb-2">
                <Unlock className="w-5 h-5 text-success" />
                <span className="text-sm text-success">{locale === 'ar' ? 'أدوار مخصصة' : 'Custom Roles'}</span>
              </div>
              <p className="text-2xl font-bold text-success">{roles.filter(r => !r.is_system).length}</p>
            </div>
            <div className="bg-card-bg-purple rounded-xl p-4 border border-purple/30">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5 text-purple" />
                <span className="text-sm text-purple">{locale === 'ar' ? 'إجمالي الصلاحيات' : 'Total Permissions'}</span>
              </div>
              <p className="text-2xl font-bold text-purple">{permissions.length}</p>
            </div>
          </div>

          {/* Actions & Search */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                />
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  const supabase = createClient()
                  loadData(supabase)
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>

              <Button
                onClick={openCreateModal}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4" />
                {locale === 'ar' ? 'دور جديد' : 'New Role'}
              </Button>
            </div>
          </div>

          {/* Roles List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Role Header */}
                <div
                  className="p-4 border-b border-slate-100"
                  style={{ borderTopColor: role.color, borderTopWidth: '3px' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${role.color}20`, color: role.color }}
                      >
                        {getRoleIcon(role.icon)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {locale === 'ar' ? role.name_ar : role.name_en}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">{role.code}</p>
                      </div>
                    </div>
                    {role.is_system && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                        {locale === 'ar' ? 'نظام' : 'System'}
                      </span>
                    )}
                  </div>
                  {(role.description_ar || role.description_en) && (
                    <p className="text-sm text-slate-600 mt-2">
                      {locale === 'ar' ? role.description_ar : role.description_en}
                    </p>
                  )}
                </div>

                {/* Role Stats */}
                <div className="p-4 bg-slate-50">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-slate-600">
                      <Key className="w-4 h-4 inline me-1" />
                      {locale === 'ar' ? 'الصلاحيات:' : 'Permissions:'}
                    </span>
                    <span className="font-medium text-slate-900">{role.permissions_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-slate-600">
                      <Users className="w-4 h-4 inline me-1" />
                      {locale === 'ar' ? 'المشرفون:' : 'Admins:'}
                    </span>
                    <span className="font-medium text-slate-900">{role.admins_count}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewModal(role)}
                      className="flex-1 flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      {locale === 'ar' ? 'عرض' : 'View'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(role)}
                      className="flex-1 flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      {locale === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(role)}
                      className="flex items-center justify-center gap-1"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {!role.is_system && role.admins_count === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(role)}
                        className="flex items-center justify-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRoles.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Key className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">
                {locale === 'ar' ? 'لا توجد أدوار مطابقة' : 'No matching roles found'}
              </p>
            </div>
          )}
        </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingRole
                  ? (locale === 'ar' ? 'تعديل الدور' : 'Edit Role')
                  : (locale === 'ar' ? 'إنشاء دور جديد' : 'Create New Role')}
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

            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 pb-2 border-b">
                  {locale === 'ar' ? 'المعلومات الأساسية' : 'Basic Info'}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'الكود' : 'Code'} *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                    placeholder="role_code"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 font-mono"
                    disabled={editingRole?.is_system}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'} *
                    </label>
                    <input
                      type="text"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="اسم الدور"
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
                      placeholder="Role Name"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'الوصف' : 'Description'}
                  </label>
                  <textarea
                    value={locale === 'ar' ? formData.description_ar : formData.description_en}
                    onChange={(e) => setFormData({
                      ...formData,
                      [locale === 'ar' ? 'description_ar' : 'description_en']: e.target.value
                    })}
                    placeholder={locale === 'ar' ? 'وصف الدور...' : 'Role description...'}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'اللون' : 'Color'}
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 border border-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'الأيقونة' : 'Icon'}
                    </label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Crown">{locale === 'ar' ? 'تاج' : 'Crown'}</option>
                      <option value="UserCog">{locale === 'ar' ? 'مستخدم' : 'User'}</option>
                      <option value="Headphones">{locale === 'ar' ? 'دعم' : 'Support'}</option>
                      <option value="Wallet">{locale === 'ar' ? 'مالية' : 'Finance'}</option>
                      <option value="Shield">{locale === 'ar' ? 'درع' : 'Shield'}</option>
                      <option value="ShieldCheck">{locale === 'ar' ? 'درع تحقق' : 'Shield Check'}</option>
                      <option value="Store">{locale === 'ar' ? 'متجر' : 'Store'}</option>
                      <option value="MapPin">{locale === 'ar' ? 'موقع' : 'Location'}</option>
                      <option value="ShoppingCart">{locale === 'ar' ? 'عربة تسوق' : 'Shopping Cart'}</option>
                      <option value="MessageCircle">{locale === 'ar' ? 'رسالة' : 'Message'}</option>
                      <option value="TrendingUp">{locale === 'ar' ? 'تحليلات' : 'Analytics'}</option>
                      <option value="Eye">{locale === 'ar' ? 'عين' : 'Eye'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 pb-2 border-b">
                  {locale === 'ar' ? 'الصلاحيات' : 'Permissions'}
                  <span className="text-sm font-normal text-slate-500 ms-2">
                    ({selectedPermissions.size} {locale === 'ar' ? 'محددة' : 'selected'})
                  </span>
                </h3>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {resources.map((resource) => {
                    const resourcePerms = getPermissionsByResource(resource.id)
                    const isExpanded = expandedResources.has(resource.id)
                    const allSelected = isAllResourceSelected(resource.id)
                    const someSelected = isSomeResourceSelected(resource.id)

                    return (
                      <div key={resource.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer"
                          onClick={() => toggleResource(resource.id)}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                selectAllResourcePermissions(resource.id, !allSelected)
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                allSelected
                                  ? 'bg-red-600 border-red-600 text-white'
                                  : someSelected
                                  ? 'bg-red-100 border-red-600'
                                  : 'border-slate-300'
                              }`}
                            >
                              {allSelected && <CheckCircle2 className="w-3 h-3" />}
                              {someSelected && <div className="w-2 h-2 bg-red-600 rounded-sm" />}
                            </button>
                            <span className="font-medium text-slate-900">
                              {locale === 'ar' ? resource.name_ar : resource.name_en}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({resourcePerms.length})
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        {isExpanded && (
                          <div className="p-3 space-y-2 bg-white">
                            {resourcePerms.map((perm) => {
                              const isSelected = selectedPermissions.has(perm.id)
                              const action = perm.action as any

                              return (
                                <label
                                  key={perm.id}
                                  className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePermission(perm.id)}
                                    className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                                  />
                                  <span className="text-sm text-slate-700">
                                    {locale === 'ar' ? action?.name_ar : action?.name_en}
                                  </span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    action?.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                    action?.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                    action?.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {action?.severity}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
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

      {/* View Permissions Modal */}
      {showViewModal && viewingRole && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${viewingRole.color}20`, color: viewingRole.color }}
                >
                  {getRoleIcon(viewingRole.icon)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {locale === 'ar' ? viewingRole.name_ar : viewingRole.name_en}
                  </h2>
                  <p className="text-sm text-slate-500">{viewingRole.code}</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">
                {locale === 'ar' ? 'الصلاحيات' : 'Permissions'} ({viewLoading ? '...' : rolePermissions.length})
              </h3>

              {viewLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-3 text-slate-400 animate-spin" />
                  <p className="text-slate-500">{locale === 'ar' ? 'جاري تحميل الصلاحيات...' : 'Loading permissions...'}</p>
                </div>
              ) : (
                <>
                  {/* Group by resource */}
                  {resources.map((resource) => {
                    const resourceRolePerms = rolePermissions.filter(
                      rp => rp.permission?.resource?.code === resource.code
                    )

                    if (resourceRolePerms.length === 0) return null

                    return (
                      <div key={resource.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="p-3 bg-slate-50 font-medium text-slate-900">
                          {locale === 'ar' ? resource.name_ar : resource.name_en}
                        </div>
                        <div className="p-3 grid gap-2 sm:grid-cols-2">
                          {resourceRolePerms.map((rp) => {
                            const action = rp.permission?.action as any
                            return (
                              <div
                                key={rp.id}
                                className="flex items-center gap-2 p-2 bg-green-50 rounded text-green-700"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm">
                                  {locale === 'ar' ? action?.name_ar : action?.name_en}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {rolePermissions.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Lock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>{locale === 'ar' ? 'لا توجد صلاحيات لهذا الدور' : 'No permissions for this role'}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowViewModal(false)}
                className="w-full"
              >
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
