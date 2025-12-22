'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  Shield,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Crown,
  Headphones,
  Wallet,
  Clock,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  XCircle,
  MapPin,
  UserCog,
  Store,
  ShoppingCart,
  TrendingUp,
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
}

interface Invitation {
  id: string
  email: string
  full_name: string | null
  role: string
  role_id: string | null
  permissions: object
  assigned_regions: Array<{
    governorate_id: string | null
    city_id: string | null
    district_id: string | null
  }>
  invitation_message: string | null
  expires_at: string
  invited_by: string
  inviter_name?: string
  // Dynamic role info from database
  roleInfo?: DbRole
}

// Icon mapping for dynamic role icons
function getRoleIcon(iconName: string): React.ElementType {
  switch (iconName) {
    case 'Crown': return Crown
    case 'UserCog': return UserCog
    case 'Headphones': return Headphones
    case 'Wallet': return Wallet
    case 'ShieldCheck': return ShieldCheck
    case 'Shield': return Shield
    case 'Store': return Store
    case 'MapPin': return MapPin
    case 'ShoppingCart': return ShoppingCart
    case 'MessageCircle': return MessageCircle
    case 'TrendingUp': return TrendingUp
    case 'Eye': return Eye
    default: return Shield
  }
}

export default function AdminRegisterPage() {
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const isRTL = locale === 'ar'

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form errors
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    validateInvitation()
  }, [token])

  async function validateInvitation() {
    if (!token) {
      setError(locale === 'ar' ? 'رابط الدعوة غير صالح' : 'Invalid invitation link')
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      // Get invitation by token
      const { data: invitationData, error: fetchError } = await supabase
        .from('admin_invitations')
        .select('*')
        .eq('invitation_token', token)
        .single()

      if (fetchError || !invitationData) {
        setError(locale === 'ar' ? 'الدعوة غير موجودة' : 'Invitation not found')
        setLoading(false)
        return
      }

      // Check if invitation is pending
      if (invitationData.status !== 'pending') {
        if (invitationData.status === 'accepted') {
          setError(locale === 'ar' ? 'تم استخدام هذه الدعوة مسبقاً' : 'This invitation has already been used')
        } else if (invitationData.status === 'expired') {
          setError(locale === 'ar' ? 'انتهت صلاحية الدعوة' : 'This invitation has expired')
        } else if (invitationData.status === 'cancelled') {
          setError(locale === 'ar' ? 'تم إلغاء هذه الدعوة' : 'This invitation has been cancelled')
        } else {
          setError(locale === 'ar' ? 'الدعوة غير صالحة' : 'Invalid invitation')
        }
        setLoading(false)
        return
      }

      // Check if expired
      const expiresAt = new Date(invitationData.expires_at)
      if (expiresAt < new Date()) {
        // Mark as expired
        await supabase
          .from('admin_invitations')
          .update({ status: 'expired' })
          .eq('id', invitationData.id)

        setError(locale === 'ar' ? 'انتهت صلاحية الدعوة' : 'This invitation has expired')
        setLoading(false)
        return
      }

      // Get inviter info
      let inviterName = ''
      if (invitationData.invited_by) {
        const { data: inviterData } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('id', invitationData.invited_by)
          .single()

        if (inviterData) {
          const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', inviterData.user_id)
            .single()

          if (inviterProfile) {
            inviterName = inviterProfile.full_name || ''
          }
        }
      }

      // Update view count
      await supabase
        .from('admin_invitations')
        .update({
          view_count: (invitationData.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', invitationData.id)

      // Load role info from roles table
      let roleInfo: DbRole | undefined = undefined

      // First try using role_id if available
      if (invitationData.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('*')
          .eq('id', invitationData.role_id)
          .single()

        if (roleData) {
          roleInfo = roleData
        }
      }

      // Fallback: try to find role by code
      if (!roleInfo && invitationData.role) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('*')
          .eq('code', invitationData.role)
          .single()

        if (roleData) {
          roleInfo = roleData
        }
      }

      setInvitation({
        ...invitationData,
        inviter_name: inviterName,
        roleInfo: roleInfo,
      })

      // Pre-fill name if provided
      if (invitationData.full_name) {
        setFullName(invitationData.full_name)
      }

    } catch {
      setError(locale === 'ar' ? 'حدث خطأ أثناء التحقق من الدعوة' : 'Error validating invitation')
    }

    setLoading(false)
  }

  function getTimeRemaining(): string {
    if (!invitation) return ''

    const expiresAt = new Date(invitation.expires_at)
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()

    if (diff <= 0) return locale === 'ar' ? 'منتهية' : 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return locale === 'ar' ? `${days} أيام` : `${days} days`
    }

    if (hours > 0) {
      return locale === 'ar' ? `${hours} ساعة و ${minutes} دقيقة` : `${hours}h ${minutes}m`
    }

    return locale === 'ar' ? `${minutes} دقيقة` : `${minutes} minutes`
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    if (!invitation) return

    // Validation
    if (!fullName.trim()) {
      setFormError(locale === 'ar' ? 'الاسم الكامل مطلوب' : 'Full name is required')
      return
    }

    if (password.length < 8) {
      setFormError(locale === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setFormError(locale === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
      return
    }

    setFormLoading(true)
    setFormError('')

    const supabase = createClient()

    try {
      // Create the auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setFormError(locale === 'ar' ? 'هذا البريد مسجل بالفعل. جرب تسجيل الدخول.' : 'This email is already registered. Try logging in.')
        } else {
          setFormError(signUpError.message)
        }
        setFormLoading(false)
        return
      }

      if (!authData.user) {
        setFormError(locale === 'ar' ? 'فشل إنشاء الحساب' : 'Failed to create account')
        setFormLoading(false)
        return
      }

      // Use the database function to create admin account (bypasses RLS)
      const { data: registerResult, error: registerError } = await supabase
        .rpc('register_admin_from_invitation', {
          p_user_id: authData.user.id,
          p_invitation_token: token,
          p_full_name: fullName.trim(),
          p_phone: phone.trim() || null,
        })

      if (registerError) {
        console.error('Register RPC error:', registerError)
        setFormError(locale === 'ar'
          ? `خطأ في إنشاء حساب المشرف: ${registerError.message}`
          : `Error creating admin account: ${registerError.message}`)
        setFormLoading(false)
        return
      }

      if (registerResult && !registerResult.success) {
        console.error('Register function error:', registerResult.error)
        setFormError(locale === 'ar'
          ? `خطأ في إنشاء حساب المشرف: ${registerResult.error || 'Unknown error'}`
          : `Error creating admin account: ${registerResult.error || 'Unknown error'}`)
        setFormLoading(false)
        return
      }

      setSuccess(true)

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(`/${locale}/admin/login`)
      }, 3000)

    } catch {
      setFormError(locale === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    }

    setFormLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#009DE0] border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">
            {locale === 'ar' ? 'جاري التحقق من الدعوة...' : 'Validating invitation...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'الدعوة غير صالحة' : 'Invalid Invitation'}
          </h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link href={`/${locale}`}>
            <Button className="bg-[#009DE0] hover:bg-[#0080b8]">
              {locale === 'ar' ? 'الذهاب للرئيسية' : 'Go to Homepage'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'تم التسجيل بنجاح!' : 'Registration Successful!'}
          </h1>
          <p className="text-slate-600 mb-6">
            {locale === 'ar'
              ? 'جاري تحويلك لصفحة تسجيل الدخول...'
              : 'Redirecting you to login page...'}
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#009DE0] border-t-transparent mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!invitation) return null

  // Get role display info - use dynamic roleInfo if available, otherwise show raw role code
  const roleInfo = invitation.roleInfo
  const RoleIcon = roleInfo ? getRoleIcon(roleInfo.icon) : Shield
  const roleName = roleInfo
    ? (locale === 'ar' ? roleInfo.name_ar : roleInfo.name_en)
    : invitation.role
  const roleDescription = roleInfo
    ? (locale === 'ar' ? roleInfo.description_ar : roleInfo.description_en)
    : ''
  const roleColor = roleInfo?.color || '#6B7280'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-block">
            <Image
              src="/engezna-logo.png"
              alt="Engezna"
              width={180}
              height={60}
              className="h-14 w-auto mx-auto"
            />
          </Link>
          <p className="text-sm text-slate-600 mt-2">
            {locale === 'ar' ? 'انضم لفريق إدارة إنجزنا' : 'Join Engezna Admin Team'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Invitation Info Header */}
          <div className="bg-gradient-to-r from-[#009DE0] to-[#0080b8] px-6 py-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <RoleIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {locale === 'ar' ? 'دعوة للانضمام' : 'Invitation to Join'}
                </h1>
                <p className="text-sm text-white/80">
                  {roleName}
                </p>
              </div>
            </div>

            {invitation.invitation_message && (
              <div className="bg-white/10 rounded-lg p-3 text-sm">
                {invitation.invitation_message}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 text-sm text-white/70">
              <Clock className="w-4 h-4" />
              <span>
                {locale === 'ar' ? 'تنتهي خلال: ' : 'Expires in: '}
                {getTimeRemaining()}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="p-6 space-y-5">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{formError}</span>
              </div>
            )}

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <div className="relative">
                <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="email"
                  value={invitation.email}
                  readOnly
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600`}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'الاسم الكامل' : 'Full Name'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={locale === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0] focus:border-transparent`}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'} <span className="text-slate-400 text-xs">({locale === 'ar' ? 'اختياري' : 'optional'})</span>
              </label>
              <div className="relative">
                <Phone className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0] focus:border-transparent`}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={locale === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}
                  className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0] focus:border-transparent`}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={locale === 'ar' ? 'أعد كتابة كلمة المرور' : 'Repeat your password'}
                  className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009DE0] focus:border-transparent`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Role & Permissions Info */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-medium text-slate-900 mb-2">
                {locale === 'ar' ? 'سيتم إنشاء حسابك بـ:' : 'Your account will be created with:'}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <RoleIcon className="w-4 h-4" style={{ color: roleColor }} />
                  <span className="text-slate-700">
                    {locale === 'ar' ? 'الدور: ' : 'Role: '}
                    <span className="font-medium" style={{ color: roleColor }}>{roleName}</span>
                  </span>
                </div>
                {roleDescription && (
                  <p className="text-xs text-slate-500 ms-6">{roleDescription}</p>
                )}
                {invitation.assigned_regions && invitation.assigned_regions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#009DE0]" />
                    <span className="text-slate-700">
                      {locale === 'ar' ? 'مناطق محددة' : 'Assigned regions'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={formLoading}
              className="w-full bg-[#009DE0] hover:bg-[#0080b8] py-3"
            >
              {formLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 me-2" />
                  {locale === 'ar' ? 'إنشاء الحساب' : 'Create Account'}
                </>
              )}
            </Button>

            <p className="text-center text-sm text-slate-500">
              {locale === 'ar'
                ? 'بالتسجيل، أنت توافق على سياسة الخصوصية وشروط الاستخدام'
                : 'By registering, you agree to our Privacy Policy and Terms of Service'}
            </p>
          </form>
        </div>

        {/* Already have account */}
        <div className="text-center mt-6">
          <p className="text-slate-600">
            {locale === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}
            {' '}
            <Link href={`/${locale}/admin/login`} className="text-[#009DE0] hover:underline font-medium">
              {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
