'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  X,
  Mail,
  UserPlus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Tag,
} from 'lucide-react';

interface AddStaffModalProps {
  locale: string;
  providerId: string;
  storeName: string;
  merchantName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface PermissionOption {
  key:
    | 'can_manage_orders'
    | 'can_manage_menu'
    | 'can_manage_customers'
    | 'can_view_analytics'
    | 'can_manage_offers';
  icon: React.ComponentType<{ className?: string }>;
  label: { ar: string; en: string };
  description: { ar: string; en: string };
  defaultValue: boolean;
}

const permissionOptions: PermissionOption[] = [
  {
    key: 'can_manage_orders',
    icon: ShoppingBag,
    label: { ar: 'إدارة الطلبات والمرتجعات', en: 'Manage Orders & Refunds' },
    description: {
      ar: 'قبول ورفض الطلبات، إدارة المرتجعات',
      en: 'Accept/reject orders, manage refunds',
    },
    defaultValue: true,
  },
  {
    key: 'can_manage_menu',
    icon: Package,
    label: { ar: 'إدارة المنتجات', en: 'Manage Products' },
    description: { ar: 'إضافة وتعديل وحذف المنتجات', en: 'Add, edit, and delete products' },
    defaultValue: true,
  },
  {
    key: 'can_manage_customers',
    icon: Users,
    label: { ar: 'عرض بيانات العملاء', en: 'View Customer Data' },
    description: {
      ar: 'الوصول لبيانات العملاء وسجل الطلبات',
      en: 'Access customer data and order history',
    },
    defaultValue: false,
  },
  {
    key: 'can_view_analytics',
    icon: BarChart3,
    label: { ar: 'عرض التحليلات', en: 'View Analytics' },
    description: { ar: 'الوصول للتقارير والإحصائيات', en: 'Access reports and statistics' },
    defaultValue: false,
  },
  {
    key: 'can_manage_offers',
    icon: Tag,
    label: { ar: 'إدارة العروض والبانرات', en: 'Manage Offers & Banners' },
    description: {
      ar: 'إنشاء وتعديل العروض والبانرات',
      en: 'Create and edit promotions and banners',
    },
    defaultValue: false,
  },
];

export function AddStaffModal({
  locale,
  providerId,
  storeName,
  merchantName,
  onClose,
  onSuccess,
}: AddStaffModalProps) {
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    can_manage_orders: true,
    can_manage_menu: true,
    can_manage_customers: false,
    can_view_analytics: false,
    can_manage_offers: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ userExists: boolean; userName?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();

    try {
      const { data, error: rpcError } = await supabase.rpc('create_provider_invitation', {
        p_provider_id: providerId,
        p_email: email.toLowerCase().trim(),
        p_can_manage_orders: permissions.can_manage_orders,
        p_can_manage_menu: permissions.can_manage_menu,
        p_can_manage_customers: permissions.can_manage_customers,
        p_can_view_analytics: permissions.can_view_analytics,
        p_can_manage_offers: permissions.can_manage_offers,
      });

      if (rpcError) throw rpcError;

      if (!data?.success) {
        setError(data?.error || (locale === 'ar' ? 'حدث خطأ' : 'An error occurred'));
        return;
      }

      // Send invitation email via API (server-side)
      const inviteUrl = `${window.location.origin}/${locale}/provider/join?token=${data.invitation_token}`;

      try {
        const emailResponse = await fetch('/api/emails/staff-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email.toLowerCase().trim(),
            staffName: data.user_name || email.split('@')[0],
            storeName: storeName,
            merchantName: merchantName,
            role: 'staff',
            inviteUrl: inviteUrl,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('Failed to send invitation email:', errorData);
          // Don't fail the whole operation, just log the error
          // The invitation is already created in the database
        }
      } catch (emailErr) {
        console.error('Error sending invitation email:', emailErr);
        // Don't fail the whole operation
      }

      setSuccess({
        userExists: data.user_exists,
        userName: data.user_name,
      });

      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Error creating invitation:', err);
      setError(locale === 'ar' ? 'حدث خطأ أثناء إنشاء الدعوة' : 'Error creating invitation');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {locale === 'ar' ? 'إضافة مشرف جديد' : 'Add New Staff Member'}
              </h2>
              <p className="text-sm text-white/80">
                {locale === 'ar'
                  ? 'أدخل البريد الإلكتروني والصلاحيات'
                  : 'Enter email and permissions'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {locale === 'ar' ? 'تم إرسال الدعوة!' : 'Invitation Sent!'}
            </h3>
            <p className="text-slate-600">
              {success.userExists
                ? locale === 'ar'
                  ? `تم إرسال دعوة إلى ${success.userName || email}`
                  : `Invitation sent to ${success.userName || email}`
                : locale === 'ar'
                  ? 'تم إرسال رابط دعوة بالبريد الإلكتروني. على المستخدم التسجيل أولاً.'
                  : 'Invitation link sent via email. User needs to register first.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">
                {locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </Label>
              <div className="relative">
                <Mail
                  className={`absolute ${locale === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={locale === 'ar' ? 'staff@example.com' : 'staff@example.com'}
                  className={`${locale === 'ar' ? 'pr-10' : 'pl-10'}`}
                  dir="ltr"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label>{locale === 'ar' ? 'الصلاحيات' : 'Permissions'}</Label>
              <div className="space-y-2">
                {permissionOptions.map((option) => {
                  const Icon = option.icon;
                  const isEnabled = permissions[option.key];

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => togglePermission(option.key)}
                      className={`
                        w-full p-3 rounded-xl border text-start transition-all duration-200
                        ${
                          isEnabled
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`
                          w-10 h-10 rounded-lg flex items-center justify-center
                          ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}
                        `}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${isEnabled ? 'text-slate-900' : 'text-slate-500'}`}
                          >
                            {option.label[locale as 'ar' | 'en']}
                          </p>
                          <p className="text-xs text-slate-400">
                            {option.description[locale as 'ar' | 'en']}
                          </p>
                        </div>
                        <div
                          className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center
                          ${isEnabled ? 'border-primary bg-primary' : 'border-slate-300'}
                        `}
                        >
                          {isEnabled && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                {locale === 'ar'
                  ? 'إذا لم يكن للمستخدم حساب، سيتم إرسال رابط دعوة بالبريد الإلكتروني. الدعوة صالحة لمدة 7 أيام.'
                  : "If the user doesn't have an account, an invitation link will be sent via email. The invitation is valid for 7 days."}
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
              <Button type="submit" disabled={loading || !email.trim()} className="flex-1">
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 me-2" />
                    {locale === 'ar' ? 'إضافة المشرف' : 'Add Staff'}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
