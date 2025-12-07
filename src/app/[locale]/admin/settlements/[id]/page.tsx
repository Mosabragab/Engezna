'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, AdminSidebar } from '@/components/admin'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  Building,
  Wallet,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  CreditCard,
  RefreshCw,
  X,
  Receipt,
  User as UserIcon,
  Phone,
  DollarSign,
  Percent,
  Trash2,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Settlement {
  id: string
  provider_id: string
  provider: {
    name_ar: string
    name_en: string
    phone: string | null
    email: string | null
    governorate_id: string | null
    city_id: string | null
  } | null
  period_start: string
  period_end: string
  total_orders: number
  gross_revenue: number
  platform_commission: number
  net_payout: number
  // COD breakdown
  cod_orders_count: number
  cod_gross_revenue: number
  cod_commission_owed: number
  // Online breakdown
  online_orders_count: number
  online_gross_revenue: number
  online_platform_commission: number
  online_payout_owed: number
  // Net calculation
  net_balance: number
  settlement_direction: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced' | null
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'waived'
  paid_at: string | null
  payment_method: string | null
  payment_reference: string | null
  orders_included: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
  processed_by: string | null
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
}

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  platform_commission: number
  payment_method: string
  created_at: string
  customer: { full_name: string } | null
}

export default function SettlementDetailPage() {
  const locale = useLocale()
  const params = useParams()
  const router = useRouter()
  const isRTL = locale === 'ar'
  const settlementId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [orders, setOrders] = useState<Order[]>([])

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    reference: '',
  })

  useEffect(() => {
    checkAuth()
  }, [])

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
        await loadSettlement(supabase)
      }
    }

    setLoading(false)
  }

  async function loadSettlement(supabase: ReturnType<typeof createClient>) {
    // Load settlement with provider info
    const { data: settlementData, error } = await supabase
      .from('settlements')
      .select(`
        *,
        provider:providers(name_ar, name_en, phone, email, governorate_id, city_id)
      `)
      .eq('id', settlementId)
      .single()

    if (error) {
      console.error('Error loading settlement:', error)
      return
    }

    setSettlement(settlementData as unknown as Settlement)

    // Load orders included in this settlement
    if (settlementData?.orders_included && settlementData.orders_included.length > 0) {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          platform_commission,
          payment_method,
          created_at,
          customer:profiles!customer_id(full_name)
        `)
        .in('id', settlementData.orders_included)
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Error loading orders:', ordersError)
      }

      if (ordersData) {
        setOrders(ordersData as unknown as Order[])
      }
    }

    // Update payment form with net payout
    if (settlementData) {
      setPaymentForm(prev => ({
        ...prev,
        amount: (settlementData.net_payout || 0).toString(),
      }))
    }
  }

  async function handleRecordPayment() {
    if (!settlement || !paymentForm.amount) {
      alert(locale === 'ar' ? 'يرجى إدخال المبلغ' : 'Please enter amount')
      return
    }

    setIsProcessingPayment(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('settlements')
        .update({
          status: 'paid', // Use 'paid' to match database CHECK constraint
          paid_at: new Date().toISOString(),
          payment_method: paymentForm.method,
          payment_reference: paymentForm.reference || null,
        })
        .eq('id', settlement.id)

      if (error) {
        console.error('Error recording payment:', error)
        alert(locale === 'ar' ? 'حدث خطأ أثناء تسجيل الدفع' : 'Error recording payment')
      } else {
        alert(locale === 'ar' ? 'تم تسجيل الدفع بنجاح' : 'Payment recorded successfully')
        setShowPaymentModal(false)
        await loadSettlement(supabase)
      }
    } finally {
      setIsProcessingPayment(false)
    }
  }

  async function handleMarkFailed() {
    if (!settlement) return

    const reason = prompt(locale === 'ar' ? 'أدخل سبب الفشل:' : 'Enter failure reason:')
    if (!reason) return

    const supabase = createClient()
    const { error } = await supabase
      .from('settlements')
      .update({
        status: 'disputed', // Use 'disputed' to match database CHECK constraint (closest to 'failed')
        notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settlement.id)

    if (error) {
      console.error('Error marking as disputed:', error)
      alert(locale === 'ar' ? 'حدث خطأ' : 'Error occurred')
    } else {
      await loadSettlement(supabase)
    }
  }

  async function handleDeleteSettlement() {
    if (!settlement) return

    const confirmed = confirm(
      locale === 'ar'
        ? 'هل أنت متأكد من حذف هذه التسوية؟ لا يمكن التراجع عن هذا الإجراء.'
        : 'Are you sure you want to delete this settlement? This action cannot be undone.'
    )
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from('settlements')
      .delete()
      .eq('id', settlement.id)

    if (error) {
      console.error('Error deleting settlement:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting settlement')
    } else {
      alert(locale === 'ar' ? 'تم حذف التسوية بنجاح' : 'Settlement deleted successfully')
      router.push(`/${locale}/admin/settlements`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'partially_paid':
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'overdue':
      case 'disputed':
      case 'failed': return 'bg-red-100 text-red-700'
      case 'waived': return 'bg-slate-100 text-slate-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      partially_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
      paid: { ar: 'مدفوع', en: 'Paid' },
      overdue: { ar: 'متأخر', en: 'Overdue' },
      disputed: { ar: 'متنازع عليه', en: 'Disputed' },
      waived: { ar: 'معفى', en: 'Waived' },
      // Keep backward compatibility
      processing: { ar: 'قيد المعالجة', en: 'Processing' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      failed: { ar: 'فشل', en: 'Failed' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed': return <CheckCircle2 className="w-5 h-5" />
      case 'pending': return <Clock className="w-5 h-5" />
      case 'partially_paid':
      case 'processing': return <TrendingUp className="w-5 h-5" />
      case 'overdue':
      case 'disputed':
      case 'failed': return <AlertTriangle className="w-5 h-5" />
      default: return null
    }
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return '-'
    const labels: Record<string, { ar: string; en: string }> = {
      cash: { ar: 'نقدي', en: 'Cash' },
      bank_transfer: { ar: 'تحويل بنكي', en: 'Bank Transfer' },
      instapay: { ar: 'انستاباي', en: 'InstaPay' },
      vodafone_cash: { ar: 'فودافون كاش', en: 'Vodafone Cash' },
    }
    return labels[method]?.[locale === 'ar' ? 'ar' : 'en'] || method
  }

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      case 'pending': return 'bg-amber-100 text-amber-700'
      default: return 'bg-blue-100 text-blue-700'
    }
  }

  const getOrderStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'في الانتظار', en: 'Pending' },
      confirmed: { ar: 'مؤكد', en: 'Confirmed' },
      preparing: { ar: 'قيد التحضير', en: 'Preparing' },
      ready: { ar: 'جاهز', en: 'Ready' },
      delivering: { ar: 'قيد التوصيل', en: 'Delivering' },
      delivered: { ar: 'تم التوصيل', en: 'Delivered' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
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

  if (!settlement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <Wallet className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'التسوية غير موجودة' : 'Settlement Not Found'}
          </h1>
          <Link href={`/${locale}/admin/settlements`}>
            <Button size="lg" className="bg-red-600 hover:bg-red-700">
              {locale === 'ar' ? 'العودة للقائمة' : 'Back to List'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'تفاصيل التسوية' : 'Settlement Details'}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Back Button */}
          <Link
            href={`/${locale}/admin/settlements`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{locale === 'ar' ? 'العودة للقائمة' : 'Back to List'}</span>
          </Link>

          {/* Settlement Header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Provider Info */}
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Building className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 mb-1">
                    {locale === 'ar' ? settlement.provider?.name_ar : settlement.provider?.name_en}
                  </h1>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                    {settlement.provider?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {settlement.provider.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(settlement.period_start, locale)} - {formatDate(settlement.period_end, locale)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex flex-col items-end gap-3">
                <span className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full ${getStatusColor(settlement.status)}`}>
                  {getStatusIcon(settlement.status)}
                  {getStatusLabel(settlement.status)}
                </span>

                {settlement.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => setShowPaymentModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{locale === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'}</span>
                    </Button>
                    <Button
                      onClick={handleMarkFailed}
                      variant="outline"
                      className="border-red-300 bg-white hover:bg-red-50 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">{locale === 'ar' ? 'فشل' : 'Mark Failed'}</span>
                    </Button>
                    <Button
                      onClick={handleDeleteSettlement}
                      variant="outline"
                      className="border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4 text-slate-600" />
                      <span className="text-slate-600">{locale === 'ar' ? 'حذف' : 'Delete'}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Dispute/Rejection Reason */}
            {settlement.rejection_reason && settlement.status === 'disputed' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700">
                      {locale === 'ar' ? 'سبب النزاع:' : 'Dispute Reason:'}
                    </p>
                    <p className="text-sm text-red-600">{settlement.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Financial Summary with COD/Online Breakdown */}
          {(() => {
            const providerName = locale === 'ar' ? settlement.provider?.name_ar : settlement.provider?.name_en
            const isPlatformPays = settlement.settlement_direction === 'platform_pays_provider'
            const isProviderPays = settlement.settlement_direction === 'provider_pays_platform'

            return (
              <>
                {/* Orders Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-slate-600">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(settlement.total_orders, locale)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {locale === 'ar'
                        ? `نقدي: ${settlement.cod_orders_count || 0} | إلكتروني: ${settlement.online_orders_count || 0}`
                        : `COD: ${settlement.cod_orders_count || 0} | Online: ${settlement.online_orders_count || 0}`}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-slate-600">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Gross Revenue'}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(settlement.gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <Percent className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-slate-600">{locale === 'ar' ? 'عمولة إنجزنا (6%)' : 'Engezna Commission (6%)'}</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(settlement.platform_commission || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>
                </div>

                {/* COD/Online Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* COD Section */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                    <h4 className="text-lg font-bold text-orange-800 mb-3 flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      {locale === 'ar' ? 'طلبات الدفع عند الاستلام (نقدي)' : 'Cash on Delivery Orders'}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-orange-700">{locale === 'ar' ? 'عدد الطلبات:' : 'Orders:'}</span>
                        <span className="font-bold text-orange-900">{settlement.cod_orders_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-700">{locale === 'ar' ? 'إجمالي الإيرادات:' : 'Revenue:'}</span>
                        <span className="font-bold text-orange-900">{formatCurrency(settlement.cod_gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </div>
                      <div className="border-t border-orange-300 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-orange-700 font-medium">{locale === 'ar' ? 'عمولة إنجزنا المستحقة:' : 'Engezna Commission Due:'}</span>
                          <span className="font-bold text-orange-900">{formatCurrency(settlement.cod_commission_owed || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </div>
                        <p className="text-xs text-orange-600 mt-1">
                          {locale === 'ar' ? `← ${providerName} يدفع لإنجزنا` : `→ ${providerName} pays Engezna`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Online Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <h4 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {locale === 'ar' ? 'طلبات الدفع الإلكتروني' : 'Online Payment Orders'}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-700">{locale === 'ar' ? 'عدد الطلبات:' : 'Orders:'}</span>
                        <span className="font-bold text-blue-900">{settlement.online_orders_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">{locale === 'ar' ? 'إجمالي الإيرادات:' : 'Revenue:'}</span>
                        <span className="font-bold text-blue-900">{formatCurrency(settlement.online_gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">{locale === 'ar' ? 'عمولة إنجزنا:' : 'Engezna Commission:'}</span>
                        <span className="text-blue-800">-{formatCurrency(settlement.online_platform_commission || 0, locale)}</span>
                      </div>
                      <div className="border-t border-blue-300 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-blue-700 font-medium">{locale === 'ar' ? `مستحق لـ${providerName}:` : `Due to ${providerName}:`}</span>
                          <span className="font-bold text-blue-900">{formatCurrency(settlement.online_payout_owed || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          {locale === 'ar' ? `← إنجزنا تدفع لـ${providerName}` : `→ Engezna pays ${providerName}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Balance */}
                <div className={`rounded-xl p-5 mb-6 ${
                  isPlatformPays ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                    : isProviderPays ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold mb-1">
                        {locale === 'ar' ? 'الحساب النهائي' : 'Final Balance'}
                      </h4>
                      <p className={`text-sm ${isPlatformPays || isProviderPays ? 'opacity-80' : 'text-slate-600'}`}>
                        {isPlatformPays
                          ? (locale === 'ar' ? `إنجزنا تدفع لـ${providerName}` : `Engezna pays ${providerName}`)
                          : isProviderPays
                            ? (locale === 'ar' ? `${providerName} يدفع لإنجزنا` : `${providerName} pays Engezna`)
                            : (locale === 'ar' ? 'التسوية متوازنة' : 'Settlement is balanced')}
                      </p>
                    </div>
                    <div className="text-3xl font-bold">
                      {formatCurrency(Math.abs(settlement.net_balance || 0), locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </div>
                  </div>
                </div>
              </>
            )
          })()}

          {/* Payment Details (if paid) */}
          {settlement.status === 'paid' && settlement.paid_at && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {locale === 'ar' ? 'تفاصيل الدفع' : 'Payment Details'}
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-green-600">{locale === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}</p>
                  <p className="font-medium text-green-800">{formatDate(settlement.paid_at, locale)}</p>
                </div>
                <div>
                  <p className="text-sm text-green-600">{locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</p>
                  <p className="font-medium text-green-800">{getPaymentMethodLabel(settlement.payment_method)}</p>
                </div>
                {settlement.payment_reference && (
                  <div>
                    <p className="text-sm text-green-600">{locale === 'ar' ? 'مرجع الدفع' : 'Payment Reference'}</p>
                    <p className="font-medium text-green-800">{settlement.payment_reference}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-green-600">{locale === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}</p>
                  <p className="font-bold text-green-800">
                    {formatCurrency(settlement.net_payout || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Orders List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-slate-500" />
                {locale === 'ar' ? 'الطلبات المشمولة' : 'Included Orders'}
                <span className="text-sm font-normal text-slate-500">
                  ({orders.length})
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'طريقة الدفع' : 'Payment'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'عمولة إنجزنا' : 'Engezna Fee'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length > 0 ? (
                    orders.map((order) => {
                      const isCOD = order.payment_method === 'cash'
                      return (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">#{order.order_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">
                              {order.customer?.full_name || (locale === 'ar' ? 'عميل' : 'Customer')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${isCOD ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isCOD ? (locale === 'ar' ? 'نقدي' : 'Cash') : (locale === 'ar' ? 'إلكتروني' : 'Online')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">
                            {formatCurrency(order.total || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-red-600">
                            {formatCurrency(order.platform_commission || (order.total * 0.06), locale)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${getOrderStatusColor(order.status)}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد طلبات' : 'No orders found'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Settlement Metadata */}
          <div className="mt-6 bg-slate-50 rounded-xl p-4 text-sm text-slate-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400">{locale === 'ar' ? 'معرف التسوية:' : 'Settlement ID:'}</span>
                <p className="font-mono text-slate-600 text-xs break-all">{settlement.id}</p>
              </div>
              <div>
                <span className="text-slate-400">{locale === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'}</span>
                <p className="text-slate-600">{formatDate(settlement.created_at, locale)}</p>
              </div>
              <div>
                <span className="text-slate-400">{locale === 'ar' ? 'آخر تحديث:' : 'Updated:'}</span>
                <p className="text-slate-600">{formatDate(settlement.updated_at, locale)}</p>
              </div>
              {settlement.notes && (
                <div>
                  <span className="text-slate-400">{locale === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>
                  <p className="text-slate-600">{settlement.notes}</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">
                  {locale === 'ar' ? 'المزود:' : 'Provider:'} <span className="font-medium text-slate-900">
                    {locale === 'ar' ? settlement.provider?.name_ar : settlement.provider?.name_en}
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  {locale === 'ar' ? 'صافي المزود:' : 'Net Payout:'} <span className="font-bold text-green-600">
                    {formatCurrency(settlement.net_payout || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'المبلغ' : 'Amount'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                >
                  <option value="cash">{locale === 'ar' ? 'نقدي' : 'Cash'}</option>
                  <option value="bank_transfer">{locale === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  <option value="instapay">{locale === 'ar' ? 'انستاباي' : 'InstaPay'}</option>
                  <option value="vodafone_cash">{locale === 'ar' ? 'فودافون كاش' : 'Vodafone Cash'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'مرجع الدفع (اختياري)' : 'Payment Reference (Optional)'}
                </label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  placeholder={locale === 'ar' ? 'رقم المعاملة أو الملاحظات' : 'Transaction ID or notes'}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={isProcessingPayment}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessingPayment ? (locale === 'ar' ? 'جاري التسجيل...' : 'Recording...') : (locale === 'ar' ? 'تسجيل الدفع' : 'Record Payment')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
