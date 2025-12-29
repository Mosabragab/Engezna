'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  X,
  Edit2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Tag,
  Save,
} from 'lucide-react'

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

interface EditPermissionsModalProps {
  locale: string
  member: TeamMember
  onClose: () => void
  onSuccess: () => void
}

interface PermissionOption {
  key: 'can_manage_orders' | 'can_manage_menu' | 'can_manage_customers' | 'can_view_analytics' | 'can_manage_offers'
  icon: React.ComponentType<{ className?: string }>
  label: { ar: string; en: string }
  description: { ar: string; en: string }
}

const permissionOptions: PermissionOption[] = [
  {
    key: 'can_manage_orders',
    icon: ShoppingBag,
    label: { ar: 'إدارة الطلبات والمرتجعات', en: 'Manage Orders & Refunds' },
    description: { ar: 'قبول ورفض الطلبات، إدارة المرتجعات', en: 'Accept/reject orders, manage refunds' },
  },
  {
    key: 'can_manage_menu',
    icon: Package,
    label: { ar: 'إدارة المنتجات', en: 'Manage Products' },
    description: { ar: 'إضافة وتعديل وحذف المنتجات', en: 'Add, edit, and delete products' },
  },
  {
    key: 'can_manage_customers',
    icon: Users,
    label: { ar: 'عرض بيانات العملاء', en: 'View Customer Data' },
    description: { ar: 'الوصول لبيانات العملاء وسجل الطلبات', en: 'Access customer data and order history' },
  },
  {
    key: 'can_view_analytics',
    icon: BarChart3,
    label: { ar: 'عرض التحليلات', en: 'View Analytics' },
    description: { ar: 'الوصول للتقارير والإحصائيات', en: 'Access reports and statistics' },
  },
  {
    key: 'can_manage_offers',
    icon: Tag,
    label: { ar: 'إدارة العروض والبانرات', en: 'Manage Offers & Banners' },
    description: { ar: 'إنشاء وتعديل العروض والبانرات', en: 'Create and edit promotions and banners' },
  },
]

export function EditPermissionsModal({ locale, member, onClose, onSuccess }: EditPermissionsModalProps) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    can_manage_orders: member.can_manage_orders,
    can_manage_menu: member.can_manage_menu,
    can_manage_customers: member.can_manage_customers,
    can_view_analytics: member.can_view_analytics,
    can_manage_offers: member.can_manage_offers,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasChanges = Object.keys(permissions).some(
    key => permissions[key] !== member[key as keyof TeamMember]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    try {
      const { error: updateError } = await supabase
        .from('provider_staff')
        .update({
          can_manage_orders: permissions.can_manage_orders,
          can_manage_menu: permissions.can_manage_menu,
          can_manage_customers: permissions.can_manage_customers,
          can_view_analytics: permissions.can_view_analytics,
          can_manage_offers: permissions.can_manage_offers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id)

      if (updateError) throw updateError

      onSuccess()
    } catch (err) {
      console.error('Error updating permissions:', err)
      setError(locale === 'ar' ? 'حدث خطأ أثناء تحديث الصلاحيات' : 'Error updating permissions')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {locale === 'ar' ? 'تعديل الصلاحيات' : 'Edit Permissions'}
              </h2>
              <p className="text-sm text-white/80">
                {member.profile.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Permissions */}
          <div className="space-y-2">
            {permissionOptions.map((option) => {
              const Icon = option.icon
              const isEnabled = permissions[option.key]

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => togglePermission(option.key)}
                  className={`
                    w-full p-3 rounded-xl border text-start transition-all duration-200
                    ${isEnabled
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}
                    `}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isEnabled ? 'text-slate-900' : 'text-slate-500'}`}>
                        {option.label[locale as 'ar' | 'en']}
                      </p>
                      <p className="text-xs text-slate-400">
                        {option.description[locale as 'ar' | 'en']}
                      </p>
                    </div>
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center
                      ${isEnabled
                        ? 'border-primary bg-primary'
                        : 'border-slate-300'
                      }
                    `}>
                      {isEnabled && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Info */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              {locale === 'ar'
                ? 'التغييرات ستظهر فور حفظها. قد يحتاج المشرف لإعادة تحميل الصفحة لرؤية التغييرات.'
                : 'Changes will take effect immediately. The staff member may need to refresh the page to see the changes.'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasChanges}
              className="flex-1"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 me-2" />
                  {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
