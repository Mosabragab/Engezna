'use client'

import React from 'react'
import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, GeoFilter, GeoFilterValue, useAdminSidebar } from '@/components/admin'
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Mail,
  User as UserIcon,
  Crown,
  Headphones,
  Wallet,
  ShieldCheck,
  Copy,
  Check,
  Send,
  AlertCircle,
  Clock,
  MapPin,
  X,
  RefreshCw,
  Link as LinkIcon,
  MessageSquare,
  UserCog,
  Key,
  ShoppingCart,
  TrendingUp,
  Eye,
  MessageCircle,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// Database role type
interface DbRole {
  id: string
  code: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  color: string
  icon: string
  is_system: boolean
  is_active: boolean
}

interface AssignedRegion {
  governorate_id: string | null
  city_id: string | null
  district_id: string | null
}

// Icon mapping for dynamic role icons
function getRoleIcon(iconName: string): React.ReactNode {
  switch (iconName) {
    case 'Crown': return <Crown className="w-5 h-5" />
    case 'UserCog': return <UserCog className="w-5 h-5" />
    case 'Headphones': return <Headphones className="w-5 h-5" />
    case 'Wallet': return <Wallet className="w-5 h-5" />
    case 'ShieldCheck': return <ShieldCheck className="w-5 h-5" />
    case 'Shield': return <Shield className="w-5 h-5" />
    case 'Store': return <ShieldCheck className="w-5 h-5" />
    case 'MapPin': return <MapPin className="w-5 h-5" />
    case 'ShoppingCart': return <ShoppingCart className="w-5 h-5" />
    case 'MessageCircle': return <MessageCircle className="w-5 h-5" />
    case 'TrendingUp': return <TrendingUp className="w-5 h-5" />
    case 'Eye': return <Eye className="w-5 h-5" />
    default: return <Shield className="w-5 h-5" />
  }
}

// Permission type from database
interface RolePermission {
  permission_id: string
  permission: {
    code: string
    name_ar: string
    name_en: string
    resource_code: string
  }
}

export default function InviteSupervisorPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Roles from database
  const [dbRoles, setDbRoles] = useState<DbRole[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission[]>>({})

  // Form state
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [expiresHours, setExpiresHours] = useState(48)
  const [assignedRegions, setAssignedRegions] = useState<AssignedRegion[]>([])
  const [tempRegion, setTempRegion] = useState<GeoFilterValue>({
    governorate_id: null,
    city_id: null,
    district_id: null,
  })

  // Result state
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [invitationResult, setInvitationResult] = useState<{
    id: string
    token: string
    url: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Geography data for labels
  const [governorates, setGovernorates] = useState<Array<{ id: string; name_ar: string; name_en: string }>>([])
  const [cities, setCities] = useState<Array<{ id: string; name_ar: string; name_en: string; governorate_id: string }>>([])
  const [districts, setDistricts] = useState<Array<{ id: string; name_ar: string; name_en: string; city_id: string | null; governorate_id: string }>>([])

  useEffect(() => {
    checkAuth()
    loadGeoData()
    loadRoles()
  }, [])

  async function loadRoles() {
    const supabase = createClient()

    // Load roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (roles && roles.length > 0) {
      setDbRoles(roles)
      // Set default selected role to first non-super_admin role
      const defaultRole = roles.find(r => r.code !== 'super_admin') || roles[0]
      if (defaultRole) {
        setSelectedRoleId(defaultRole.id)
      }

      // Load permissions for each role
      const permissionsMap: Record<string, RolePermission[]> = {}
      for (const role of roles) {
        const { data: perms } = await supabase
          .from('role_permissions')
          .select(`
            permission_id,
            permission:permissions(code, name_ar, name_en, resource_code)
          `)
          .eq('role_id', role.id)

        if (perms) {
          permissionsMap[role.id] = perms as unknown as RolePermission[]
        }
      }
      setRolePermissions(permissionsMap)
    }
  }

  async function loadGeoData() {
    const supabase = createClient()

    const [govRes, cityRes, distRes] = await Promise.all([
      supabase.from('governorates').select('id, name_ar, name_en').order('name_ar'),
      supabase.from('cities').select('id, name_ar, name_en, governorate_id').order('name_ar'),
      supabase.from('districts').select('id, name_ar, name_en, city_id, governorate_id').order('name_ar'),
    ])

    if (govRes.data) setGovernorates(govRes.data)
    if (cityRes.data) setCities(cityRes.data)
    if (distRes.data) setDistricts(distRes.data)
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

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (adminUser?.role === 'super_admin') {
          setIsSuperAdmin(true)
        }
      }
    }

    setLoading(false)
  }

  function addRegion() {
    if (!tempRegion.governorate_id) return

    const exists = assignedRegions.some(r =>
      r.governorate_id === tempRegion.governorate_id &&
      r.city_id === tempRegion.city_id &&
      r.district_id === tempRegion.district_id
    )

    if (!exists) {
      setAssignedRegions([...assignedRegions, { ...tempRegion }])
    }

    setTempRegion({ governorate_id: null, city_id: null, district_id: null })
  }

  function removeRegion(index: number) {
    setAssignedRegions(assignedRegions.filter((_, i) => i !== index))
  }

  function getRegionLabel(region: AssignedRegion): string {
    const gov = governorates.find(g => g.id === region.governorate_id)
    const city = cities.find(c => c.id === region.city_id)
    const district = districts.find(d => d.id === region.district_id)

    const govName = gov ? (locale === 'ar' ? gov.name_ar : gov.name_en) : ''
    const cityName = city ? (locale === 'ar' ? city.name_ar : city.name_en) : ''
    const districtName = district ? (locale === 'ar' ? district.name_ar : district.name_en) : ''

    if (districtName) return `${districtName} - ${cityName || govName}`
    if (cityName) return `${cityName} - ${govName}`
    return govName || (locale === 'ar' ? 'غير محدد' : 'Not specified')
  }

  async function handleCreateInvitation() {
    if (!email) {
      setFormError(locale === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required')
      return
    }

    if (!selectedRoleId) {
      setFormError(locale === 'ar' ? 'يجب اختيار دور' : 'Please select a role')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setFormError(locale === 'ar' ? 'البريد الإلكتروني غير صالح' : 'Invalid email address')
      return
    }

    setFormLoading(true)
    setFormError('')

    const supabase = createClient()

    try {
      // Get selected role details
      const selectedRole = dbRoles.find(r => r.id === selectedRoleId)
      if (!selectedRole) {
        setFormError(locale === 'ar' ? 'الدور غير موجود' : 'Role not found')
        setFormLoading(false)
        return
      }

      // Check if email already exists as admin
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (existingProfile) {
        const { data: existingAdmin } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', existingProfile.id)
          .single()

        if (existingAdmin) {
          setFormError(locale === 'ar' ? 'هذا البريد مسجل بالفعل كمشرف' : 'This email is already registered as a supervisor')
          setFormLoading(false)
          return
        }
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabase
        .from('admin_invitations')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single()

      if (existingInvitation) {
        setFormError(locale === 'ar' ? 'توجد دعوة معلقة لهذا البريد بالفعل' : 'A pending invitation already exists for this email')
        setFormLoading(false)
        return
      }

      // Get current admin user id
      const { data: currentAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!currentAdmin) {
        setFormError(locale === 'ar' ? 'خطأ في التحقق من الصلاحيات' : 'Authorization error')
        setFormLoading(false)
        return
      }

      // Create the invitation with the new role system
      const invitationToken = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString()

      const { data: invitation, error: createError } = await supabase
        .from('admin_invitations')
        .insert({
          email: email.toLowerCase().trim(),
          full_name: fullName.trim() || null,
          role: selectedRole.code, // Use role code for backward compatibility
          role_id: selectedRoleId, // New: store role_id for the new permission system
          permissions: {}, // Permissions are now managed via roles
          assigned_regions: assignedRegions,
          invitation_token: invitationToken,
          expires_at: expiresAt,
          invited_by: currentAdmin.id,
          invitation_message: message.trim() || null,
        })
        .select('id, invitation_token')
        .single()

      if (createError) {
        setFormError(locale === 'ar' ? 'حدث خطأ أثناء إنشاء الدعوة' : 'Error creating invitation')
        setFormLoading(false)
        return
      }

      // Generate the invitation URL
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const invitationUrl = `${baseUrl}/${locale}/admin/register/${invitation.invitation_token}`

      setInvitationResult({
        id: invitation.id,
        token: invitation.invitation_token,
        url: invitationUrl,
      })

    } catch {
      setFormError(locale === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    }

    setFormLoading(false)
  }

  async function handleCopyLink() {
    if (!invitationResult) return

    try {
      await navigator.clipboard.writeText(invitationResult.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Error handled silently
    }
  }

  function handleCreateAnother() {
    setEmail('')
    setFullName('')
    // Reset to default role (first non-super_admin)
    const defaultRole = dbRoles.find(r => r.code !== 'super_admin') || dbRoles[0]
    if (defaultRole) {
      setSelectedRoleId(defaultRole.id)
    }
    setMessage('')
    setExpiresHours(48)
    setAssignedRegions([])
    setInvitationResult(null)
    setFormError('')
  }

  // Get selected role for display
  const selectedRole = dbRoles.find(r => r.id === selectedRoleId)

  if (loading) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'دعوة مشرف جديد' : 'Invite New Supervisor'}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </main>
      </>
    )
  }

  if (!user || !isAdmin || !isSuperAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'دعوة مشرف جديد' : 'Invite New Supervisor'}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <p className="text-slate-600 mb-4">
              {locale === 'ar' ? 'هذه الصفحة متاحة للمدير التنفيذي فقط' : 'This page is only available to Super Admins'}
            </p>
            <Link href={`/${locale}/admin/supervisors`}>
              <Button size="lg" className="bg-[#009DE0] hover:bg-[#0080b8]">
                {locale === 'ar' ? 'العودة' : 'Go Back'}
              </Button>
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'دعوة مشرف جديد' : 'Invite New Supervisor'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Back Button */}
          <Link href={`/${locale}/admin/supervisors`} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {locale === 'ar' ? 'العودة لإدارة المشرفين' : 'Back to Supervisors'}
          </Link>

          <div className="max-w-2xl mx-auto">
            {/* Success Result */}
            {invitationResult ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">
                    {locale === 'ar' ? 'تم إنشاء الدعوة بنجاح!' : 'Invitation Created Successfully!'}
                  </h2>
                  <p className="text-slate-600">
                    {locale === 'ar'
                      ? 'انسخ الرابط أدناه وأرسله للمشرف الجديد'
                      : 'Copy the link below and send it to the new supervisor'}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'رابط الدعوة' : 'Invitation Link'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={invitationResult.url}
                      readOnly
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-mono"
                      dir="ltr"
                    />
                    <Button
                      onClick={handleCopyLink}
                      className={copied ? 'bg-green-600 hover:bg-green-700' : 'bg-[#009DE0] hover:bg-[#0080b8]'}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 me-2" />
                          {locale === 'ar' ? 'تم النسخ' : 'Copied'}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 me-2" />
                          {locale === 'ar' ? 'نسخ' : 'Copy'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mb-6">
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <span>
                    {locale === 'ar'
                      ? `هذا الرابط صالح لمدة ${expiresHours} ساعة`
                      : `This link is valid for ${expiresHours} hours`}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <h3 className="font-medium text-slate-900 mb-3">
                    {locale === 'ar' ? 'تفاصيل الدعوة' : 'Invitation Details'}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{locale === 'ar' ? 'البريد:' : 'Email:'}</span>
                      <span className="font-medium text-slate-900">{email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{locale === 'ar' ? 'الدور:' : 'Role:'}</span>
                      {selectedRole && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
                          style={{
                            backgroundColor: `${selectedRole.color}20`,
                            color: selectedRole.color
                          }}
                        >
                          {locale === 'ar' ? selectedRole.name_ar : selectedRole.name_en}
                        </span>
                      )}
                    </div>
                    {assignedRegions.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">{locale === 'ar' ? 'المناطق:' : 'Regions:'}</span>
                        <span className="font-medium text-slate-900">{assignedRegions.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/${locale}/admin/supervisors`)}
                    className="flex-1"
                  >
                    {locale === 'ar' ? 'العودة للمشرفين' : 'Back to Supervisors'}
                  </Button>
                  <Button
                    onClick={handleCreateAnother}
                    className="flex-1 bg-[#009DE0] hover:bg-[#0080b8]"
                  >
                    <UserPlus className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'دعوة آخر' : 'Invite Another'}
                  </Button>
                </div>
              </div>
            ) : (
              /* Invitation Form */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#E0F4FF] rounded-xl flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-[#009DE0]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {locale === 'ar' ? 'دعوة مشرف جديد' : 'Invite New Supervisor'}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {locale === 'ar'
                        ? 'أنشئ رابط دعوة لمشرف جديد'
                        : 'Create an invitation link for a new supervisor'}
                    </p>
                  </div>
                </div>

                {formError && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{formError}</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={locale === 'ar' ? 'admin@example.com' : 'admin@example.com'}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0] focus:border-transparent`}
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Full Name (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'الاسم الكامل' : 'Full Name'} <span className="text-slate-400 text-xs">({locale === 'ar' ? 'اختياري' : 'optional'})</span>
                    </label>
                    <div className="relative">
                      <UserIcon className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={locale === 'ar' ? 'أحمد محمد' : 'Ahmed Mohamed'}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0] focus:border-transparent`}
                      />
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'الدور' : 'Role'} <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dbRoles.map((role) => {
                        const isSelected = selectedRoleId === role.id

                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setSelectedRoleId(role.id)}
                            className={`p-4 rounded-xl border-2 text-start transition-all ${
                              isSelected
                                ? 'border-[#009DE0] bg-[#E0F4FF]'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{
                                  backgroundColor: `${role.color}20`,
                                  color: role.color
                                }}
                              >
                                {getRoleIcon(role.icon)}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">
                                  {locale === 'ar' ? role.name_ar : role.name_en}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {locale === 'ar' ? role.description_ar : role.description_en}
                                </p>
                              </div>
                              {isSelected && (
                                <Check className="w-5 h-5 text-[#009DE0]" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {dbRoles.length === 0 && (
                      <div className="text-center py-4 text-slate-500">
                        <Key className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">{locale === 'ar' ? 'لا توجد أدوار متاحة. تأكد من تشغيل migration الصلاحيات.' : 'No roles available. Make sure permissions migration was run.'}</p>
                      </div>
                    )}

                    {/* Permissions Preview for Selected Role */}
                    {selectedRoleId && rolePermissions[selectedRoleId] && rolePermissions[selectedRoleId].length > 0 && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          {locale === 'ar' ? 'الصلاحيات المضمنة في هذا الدور' : 'Permissions included in this role'}
                          <span className="text-xs text-slate-400">
                            ({rolePermissions[selectedRoleId].length} {locale === 'ar' ? 'صلاحية' : 'permissions'})
                          </span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(
                            rolePermissions[selectedRoleId].reduce((acc, rp) => {
                              const resource = rp.permission?.resource_code || 'other'
                              if (!acc[resource]) acc[resource] = []
                              acc[resource].push(rp)
                              return acc
                            }, {} as Record<string, RolePermission[]>)
                          ).map(([resource, perms]) => (
                            <div key={resource} className="flex items-center gap-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#009DE0]/10 text-[#009DE0]">
                                {resource}
                                <span className="ms-1 text-[10px] opacity-70">
                                  ({perms.length})
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                          {locale === 'ar'
                            ? 'يمكنك تعديل الصلاحيات لاحقاً من صفحة إدارة المشرفين'
                            : 'You can modify permissions later from the supervisors management page'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Assigned Regions */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'المناطق المخصصة' : 'Assigned Regions'} <span className="text-slate-400 text-xs">({locale === 'ar' ? 'اختياري' : 'optional'})</span>
                    </label>
                    <p className="text-xs text-slate-500 mb-3">
                      {locale === 'ar'
                        ? 'اترك فارغاً للوصول لجميع المناطق'
                        : 'Leave empty for access to all regions'}
                    </p>

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

                    {assignedRegions.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {assignedRegions.map((region, index) => (
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

                  {/* Invitation Message */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'رسالة للمدعو' : 'Message to Invitee'} <span className="text-slate-400 text-xs">({locale === 'ar' ? 'اختياري' : 'optional'})</span>
                    </label>
                    <div className="relative">
                      <MessageSquare className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-slate-400`} />
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={locale === 'ar' ? 'مرحباً، نود انضمامك لفريق إنجزنا...' : 'Hello, we would like you to join the Engezna team...'}
                        rows={3}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0] focus:border-transparent resize-none`}
                      />
                    </div>
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'صلاحية الدعوة' : 'Invitation Validity'}
                    </label>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <select
                        value={expiresHours}
                        onChange={(e) => setExpiresHours(Number(e.target.value))}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0]"
                      >
                        <option value={24}>{locale === 'ar' ? '24 ساعة' : '24 hours'}</option>
                        <option value={48}>{locale === 'ar' ? '48 ساعة (موصى به)' : '48 hours (recommended)'}</option>
                        <option value={72}>{locale === 'ar' ? '72 ساعة' : '72 hours'}</option>
                        <option value={168}>{locale === 'ar' ? '7 أيام' : '7 days'}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <Link href={`/${locale}/admin/supervisors`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </Link>
                  <Button
                    onClick={handleCreateInvitation}
                    disabled={formLoading}
                    className="flex-1 bg-[#009DE0] hover:bg-[#0080b8]"
                  >
                    {formLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <LinkIcon className="w-4 h-4 me-2" />
                        {locale === 'ar' ? 'إنشاء رابط الدعوة' : 'Create Invitation Link'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
    </>
  )
}
