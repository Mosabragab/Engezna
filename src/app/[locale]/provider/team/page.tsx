'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProviderLayout } from '@/components/provider'
import { Button } from '@/components/ui/button'
import { useStaffPermissions } from '@/hooks/provider'
import {
  Users,
  Plus,
  Crown,
  UserCheck,
  Mail,
  Clock,
  Shield,
  ShieldCheck,
  ShieldX,
  MoreVertical,
  UserX,
  Edit2,
  Trash2,
  RefreshCw,
  UserPlus,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { AddStaffModal } from './AddStaffModal'
import { EditPermissionsModal } from './EditPermissionsModal'

// ============================================================================
// Types
// ============================================================================

interface TeamMember {
  id: string
  user_id: string
  role: 'owner' | 'staff'
  is_active: boolean
  can_manage_orders: boolean
  can_manage_menu: boolean
  can_manage_customers: boolean
  can_view_analytics: boolean
  can_manage_offers: boolean
  created_at: string
  profile: {
    full_name: string
    email: string | null
    avatar_url: string | null
  }
}

interface PendingInvitation {
  id: string
  email: string
  status: string
  expires_at: string
  created_at: string
  can_manage_orders: boolean
  can_manage_menu: boolean
  can_manage_customers: boolean
  can_view_analytics: boolean
  can_manage_offers: boolean
}

// ============================================================================
// Permission Badge Component
// ============================================================================

function PermissionBadge({
  enabled,
  label,
  compact = false,
}: {
  enabled: boolean
  label: string
  compact?: boolean
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${enabled
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-400'
        }
        ${compact ? 'px-1.5 py-0.5' : ''}
      `}
    >
      {enabled ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {!compact && label}
    </span>
  )
}

// ============================================================================
// Team Member Card Component
// ============================================================================

function TeamMemberCard({
  member,
  isCurrentUser,
  locale,
  onEdit,
  onDeactivate,
}: {
  member: TeamMember
  isCurrentUser: boolean
  locale: string
  onEdit: () => void
  onDeactivate: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isOwner = member.role === 'owner'

  const permissions = [
    { key: 'orders', enabled: member.can_manage_orders, label: locale === 'ar' ? 'الطلبات' : 'Orders' },
    { key: 'menu', enabled: member.can_manage_menu, label: locale === 'ar' ? 'المنتجات' : 'Products' },
    { key: 'customers', enabled: member.can_manage_customers, label: locale === 'ar' ? 'العملاء' : 'Customers' },
    { key: 'analytics', enabled: member.can_view_analytics, label: locale === 'ar' ? 'التحليلات' : 'Analytics' },
    { key: 'offers', enabled: member.can_manage_offers, label: locale === 'ar' ? 'العروض' : 'Offers' },
  ]

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-elegant hover:shadow-elegant-lg transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        {/* User Info */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center
            ${isOwner
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
              : 'bg-gradient-to-br from-primary/10 to-cyan-100 text-primary'
            }
          `}>
            {isOwner ? (
              <Crown className="w-7 h-7" />
            ) : (
              <UserCheck className="w-7 h-7" />
            )}
          </div>

          {/* Name & Email */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">
                {member.profile.full_name}
              </h3>
              {isOwner && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  {locale === 'ar' ? 'المالك' : 'Owner'}
                </span>
              )}
              {isCurrentUser && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  {locale === 'ar' ? 'أنت' : 'You'}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {member.profile.email || (locale === 'ar' ? 'بدون بريد' : 'No email')}
            </p>
          </div>
        </div>

        {/* Actions Menu (only for staff, not owner) */}
        {!isOwner && !isCurrentUser && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-slate-500" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[160px]">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit()
                    }}
                    className="w-full px-4 py-2 text-start text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    {locale === 'ar' ? 'تعديل الصلاحيات' : 'Edit Permissions'}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onDeactivate()
                    }}
                    className="w-full px-4 py-2 text-start text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <UserX className="w-4 h-4" />
                    {locale === 'ar' ? 'إيقاف المشرف' : 'Deactivate Staff'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Permissions */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500 mb-2">
          {locale === 'ar' ? 'الصلاحيات:' : 'Permissions:'}
        </p>
        <div className="flex flex-wrap gap-2">
          {isOwner ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              {locale === 'ar' ? 'جميع الصلاحيات' : 'All Permissions'}
            </span>
          ) : (
            permissions.map((perm) => (
              <PermissionBadge
                key={perm.key}
                enabled={perm.enabled}
                label={perm.label}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer - Join Date */}
      <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
        <Clock className="w-3 h-3" />
        {locale === 'ar' ? 'انضم' : 'Joined'}:{' '}
        {new Date(member.created_at).toLocaleDateString(
          locale === 'ar' ? 'ar-EG' : 'en-US',
          { year: 'numeric', month: 'short', day: 'numeric' }
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Pending Invitation Card Component
// ============================================================================

function PendingInvitationCard({
  invitation,
  locale,
  onCancel,
  onResend,
}: {
  invitation: PendingInvitation
  locale: string
  onCancel: () => void
  onResend: () => void
}) {
  const expiresAt = new Date(invitation.expires_at)
  const now = new Date()
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysLeft <= 0

  return (
    <div className={`
      bg-white/60 backdrop-blur-sm rounded-xl border p-4
      ${isExpired ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${isExpired ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'}
          `}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-slate-800">{invitation.email}</p>
            <p className={`text-xs ${isExpired ? 'text-red-500' : 'text-amber-600'}`}>
              {isExpired
                ? (locale === 'ar' ? 'انتهت صلاحية الدعوة' : 'Invitation expired')
                : (locale === 'ar' ? `تنتهي خلال ${daysLeft} يوم` : `Expires in ${daysLeft} days`)
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpired ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onResend}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              <RefreshCw className="w-4 h-4 me-1" />
              {locale === 'ar' ? 'إعادة إرسال' : 'Resend'}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 me-1" />
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ locale, onAddStaff }: { locale: string; onAddStaff: () => void }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8 text-center shadow-elegant">
      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-cyan-100 rounded-2xl flex items-center justify-center">
        <UserPlus className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">
        {locale === 'ar' ? 'لا يوجد مشرفون بعد' : 'No Staff Members Yet'}
      </h3>
      <p className="text-slate-500 mb-6 max-w-md mx-auto">
        {locale === 'ar'
          ? 'أضف مشرفين لمساعدتك في إدارة المتجر. يمكنك إضافة حتى 2 مشرفين بصلاحيات مخصصة.'
          : 'Add staff members to help you manage your store. You can add up to 2 staff members with custom permissions.'
        }
      </p>
      <Button onClick={onAddStaff} className="gap-2">
        <Plus className="w-5 h-5" />
        {locale === 'ar' ? 'إضافة أول مشرف' : 'Add First Staff Member'}
      </Button>
    </div>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function TeamManagementPage() {
  const locale = useLocale()
  const { providerId, isOwner, userId, loading: permissionsLoading } = useStaffPermissions()

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)

  // Calculate slots
  const activeStaffCount = teamMembers.filter(m => m.role === 'staff' && m.is_active).length
  const pendingCount = pendingInvitations.filter(i => i.status === 'pending').length
  const maxStaff = 2
  const availableSlots = maxStaff - activeStaffCount - pendingCount

  // Load team data
  const loadTeamData = useCallback(async () => {
    if (!providerId) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Load team members
      const { data: staffData, error: staffError } = await supabase
        .from('provider_staff')
        .select(`
          id,
          user_id,
          role,
          is_active,
          can_manage_orders,
          can_manage_menu,
          can_manage_customers,
          can_view_analytics,
          can_manage_offers,
          created_at,
          profiles!inner (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('role', { ascending: true }) // Owner first

      if (staffError) throw staffError

      // Transform data
      const members = (staffData || []).map((s) => ({
        ...s,
        profile: s.profiles as unknown as TeamMember['profile'],
      })) as TeamMember[]

      setTeamMembers(members)

      // Load pending invitations
      const { data: inviteData, error: inviteError } = await supabase
        .from('provider_invitations')
        .select('*')
        .eq('provider_id', providerId)
        .in('status', ['pending'])
        .order('created_at', { ascending: false })

      if (inviteError) throw inviteError

      setPendingInvitations(inviteData || [])
    } catch (error) {
      console.error('Error loading team data:', error)
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    if (providerId) {
      loadTeamData()
    }
  }, [providerId, loadTeamData])

  // Deactivate staff member
  const handleDeactivate = async (member: TeamMember) => {
    if (!confirm(locale === 'ar'
      ? `هل أنت متأكد من إيقاف ${member.profile.full_name}؟`
      : `Are you sure you want to deactivate ${member.profile.full_name}?`
    )) return

    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('deactivate_staff_member', {
        p_staff_id: member.id,
      })

      if (error) throw error

      if (data?.success) {
        await loadTeamData()
      } else {
        alert(data?.error || 'Failed to deactivate staff member')
      }
    } catch (error) {
      console.error('Error deactivating staff:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء إيقاف المشرف' : 'Error deactivating staff member')
    }
  }

  // Cancel invitation
  const handleCancelInvitation = async (invitation: PendingInvitation) => {
    if (!confirm(locale === 'ar'
      ? 'هل أنت متأكد من إلغاء هذه الدعوة؟'
      : 'Are you sure you want to cancel this invitation?'
    )) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('provider_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitation.id)

      if (error) throw error

      await loadTeamData()
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء إلغاء الدعوة' : 'Error cancelling invitation')
    }
  }

  // Resend invitation
  const handleResendInvitation = async (invitation: PendingInvitation) => {
    if (!providerId) return

    const supabase = createClient()

    try {
      // Delete old invitation and create new one
      await supabase
        .from('provider_invitations')
        .delete()
        .eq('id', invitation.id)

      const { data, error } = await supabase.rpc('create_provider_invitation', {
        p_provider_id: providerId,
        p_email: invitation.email,
        p_can_manage_orders: invitation.can_manage_orders,
        p_can_manage_menu: invitation.can_manage_menu,
        p_can_manage_customers: invitation.can_manage_customers,
        p_can_view_analytics: invitation.can_view_analytics,
        p_can_manage_offers: invitation.can_manage_offers,
      })

      if (error) throw error

      if (!data?.success) {
        alert(data?.error || (locale === 'ar' ? 'حدث خطأ' : 'An error occurred'))
        return
      }

      await loadTeamData()
      alert(locale === 'ar' ? 'تم إعادة إرسال الدعوة' : 'Invitation resent successfully')
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء إعادة إرسال الدعوة' : 'Error resending invitation')
    }
  }

  // Access denied for non-owners
  if (!permissionsLoading && !isOwner) {
    return (
      <ProviderLayout
        pageTitle={{ ar: 'إدارة الفريق', en: 'Team Management' }}
      >
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8 text-center shadow-elegant">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-xl flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h2>
          <p className="text-slate-500">
            {locale === 'ar'
              ? 'فقط مالك المتجر يمكنه الوصول لهذه الصفحة'
              : 'Only the store owner can access this page'
            }
          </p>
        </div>
      </ProviderLayout>
    )
  }

  // Loading state
  if (loading || permissionsLoading) {
    return (
      <ProviderLayout
        pageTitle={{ ar: 'إدارة الفريق', en: 'Team Management' }}
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </ProviderLayout>
    )
  }

  const staffMembers = teamMembers.filter(m => m.role === 'staff')

  return (
    <ProviderLayout
      pageTitle={{ ar: 'إدارة الفريق', en: 'Team Management' }}
      pageSubtitle={{ ar: 'إدارة أعضاء فريق متجرك', en: 'Manage your store team members' }}
    >
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {locale === 'ar' ? 'فريق العمل' : 'Team Members'}
            </h2>
            <p className="text-sm text-slate-500">
              {locale === 'ar'
                ? `${activeStaffCount}/${maxStaff} مشرفين`
                : `${activeStaffCount}/${maxStaff} staff members`
              }
            </p>
          </div>
        </div>

        {availableSlots > 0 && (
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            {locale === 'ar' ? 'إضافة مشرف' : 'Add Staff'}
          </Button>
        )}
      </div>

      {/* Slots Info */}
      {activeStaffCount >= maxStaff && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            {locale === 'ar'
              ? 'وصلت للحد الأقصى من المشرفين. يجب إيقاف مشرف حالي لإضافة مشرف جديد.'
              : 'You have reached the maximum number of staff members. Deactivate an existing staff to add a new one.'
            }
          </p>
        </div>
      )}

      {/* Team Members */}
      <div className="space-y-4 mb-8">
        {/* Owner Card - Always First */}
        {teamMembers
          .filter(m => m.role === 'owner')
          .map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.user_id === userId}
              locale={locale}
              onEdit={() => {}}
              onDeactivate={() => {}}
            />
          ))
        }

        {/* Staff Cards or Empty State */}
        {staffMembers.length > 0 ? (
          staffMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.user_id === userId}
              locale={locale}
              onEdit={() => setEditingMember(member)}
              onDeactivate={() => handleDeactivate(member)}
            />
          ))
        ) : (
          <EmptyState
            locale={locale}
            onAddStaff={() => setShowAddModal(true)}
          />
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            {locale === 'ar' ? 'الدعوات المعلقة' : 'Pending Invitations'}
            <span className="text-sm font-normal text-slate-500">
              ({pendingInvitations.length})
            </span>
          </h3>
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <PendingInvitationCard
                key={invitation.id}
                invitation={invitation}
                locale={locale}
                onCancel={() => handleCancelInvitation(invitation)}
                onResend={() => handleResendInvitation(invitation)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && providerId && (
        <AddStaffModal
          locale={locale}
          providerId={providerId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            loadTeamData()
          }}
        />
      )}

      {/* Edit Permissions Modal */}
      {editingMember && (
        <EditPermissionsModal
          locale={locale}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={() => {
            setEditingMember(null)
            loadTeamData()
          }}
        />
      )}
    </ProviderLayout>
  )
}
