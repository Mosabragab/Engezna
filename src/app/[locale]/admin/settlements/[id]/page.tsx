'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters'
import { exportSettlementToPDF, type SettlementExportData } from '@/lib/finance'
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
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
  History,
  FileText,
  Download,
  Banknote,
  Gift,
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
    commission_status: string | null
    grace_period_start: string | null
    grace_period_end: string | null
    commission_rate: number | null
    custom_commission_rate: number | null
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
  cod_delivery_fees: number
  cod_original_commission: number
  cod_net_revenue: number
  // Online breakdown
  online_orders_count: number
  online_gross_revenue: number
  online_platform_commission: number
  online_delivery_fees: number
  online_original_commission: number
  online_payout_owed: number
  online_net_revenue: number
  // Totals
  total_refunds: number
  delivery_fees_collected: number
  // Net calculation
  net_balance: number
  settlement_direction: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced' | null
  amount_paid: number | null
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
  subtotal: number | null
  discount: number | null
  delivery_fee: number | null
  platform_commission: number
  original_commission: number | null
  payment_method: string
  created_at: string
  customer: { full_name: string } | null
  // Added from refunds table
  refund_amount?: number
}

interface AuditLogEntry {
  id: string
  settlement_id: string
  action: string
  old_status: string | null
  new_status: string | null
  amount_changed: number | null
  changed_by: string | null
  notes: string | null
  created_at: string
  profile?: { full_name: string | null } | null
}

export default function SettlementDetailPage() {
  const locale = useLocale()
  const params = useParams()
  const router = useRouter()
  const isRTL = locale === 'ar'
  const settlementId = params.id as string

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [showAuditLog, setShowAuditLog] = useState(false)

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
    // Load settlement with provider info (including grace period and commission rates)
    const { data: settlementData, error } = await supabase
      .from('settlements')
      .select(`
        *,
        provider:providers(name_ar, name_en, phone, email, governorate_id, city_id, commission_status, grace_period_start, grace_period_end, commission_rate, custom_commission_rate)
      `)
      .eq('id', settlementId)
      .single()

    if (error) return

    setSettlement(settlementData as unknown as Settlement)

    // Load orders included in this settlement
    if (settlementData?.orders_included && settlementData.orders_included.length > 0) {
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          subtotal,
          discount,
          delivery_fee,
          platform_commission,
          original_commission,
          payment_method,
          created_at,
          customer:profiles!customer_id(full_name)
        `)
        .in('id', settlementData.orders_included)
        .order('created_at', { ascending: false })

      // Fetch refunds for these orders
      const { data: refundsData } = await supabase
        .from('refunds')
        .select('order_id, amount, processed_amount, status')
        .in('order_id', settlementData.orders_included)
        .in('status', ['approved', 'processed'])

      // Create a map of order_id -> refund amount
      const refundMap = new Map<string, number>()
      if (refundsData) {
        for (const refund of refundsData) {
          const amount = refund.processed_amount || refund.amount || 0
          const existing = refundMap.get(refund.order_id) || 0
          refundMap.set(refund.order_id, existing + amount)
        }
      }

      if (ordersData) {
        // Add refund_amount to each order (for display purposes)
        const ordersWithRefunds = ordersData.map(order => {
          const refundAmount = refundMap.get(order.id) || 0
          return {
            ...order,
            refund_amount: refundAmount,
          }
        })
        setOrders(ordersWithRefunds as unknown as Order[])
      }
    }

    // Update payment form with commission (amount to be paid by provider)
    if (settlementData) {
      setPaymentForm(prev => ({
        ...prev,
        amount: (settlementData.platform_commission || 0).toString(),
      }))
    }

    // Load audit log
    await loadAuditLog(supabase, settlementId)
  }

  async function loadAuditLog(supabase: ReturnType<typeof createClient>, settId: string) {
    const { data: auditData } = await supabase
      .from('settlement_audit_log')
      .select(`
        id,
        settlement_id,
        action,
        old_status,
        new_status,
        amount_changed,
        changed_by,
        notes,
        created_at,
        profile:profiles!changed_by(full_name)
      `)
      .eq('settlement_id', settId)
      .order('created_at', { ascending: false })

    if (auditData) {
      setAuditLog(auditData as unknown as AuditLogEntry[])
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
      const paidAmount = parseFloat(paymentForm.amount)

      const { error } = await supabase
        .from('settlements')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          amount_paid: paidAmount,
          payment_method: paymentForm.method,
          payment_reference: paymentForm.reference || null,
        })
        .eq('id', settlement.id)

      if (error) {
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
      alert(locale === 'ar' ? 'حدث خطأ' : 'Error occurred')
    } else {
      await loadSettlement(supabase)
    }
  }

  async function handleDeleteSettlement() {
    if (!settlement) return

    const confirmed = confirm(
      locale === 'ar'
        ? 'هل أنت متأكد من حذف هذه التسوية؟ سيتم إعادة الطلبات لحالة "قابل للتسوية". لا يمكن التراجع عن هذا الإجراء.'
        : 'Are you sure you want to delete this settlement? Orders will be reset to "eligible" status. This action cannot be undone.'
    )
    if (!confirmed) return

    const supabase = createClient()

    // Step 1: Reset orders linked to this settlement
    if (settlement.orders_included && settlement.orders_included.length > 0) {
      const { error: ordersError } = await supabase
        .from('orders')
        .update({
          settlement_id: null,
          settlement_status: 'eligible'
        })
        .in('id', settlement.orders_included)

      if (ordersError) {
        console.error('Error resetting orders:', ordersError)
        alert(locale === 'ar' ? 'حدث خطأ أثناء إعادة تعيين الطلبات' : 'Error resetting orders')
        return
      }
    }

    // Step 2: Delete the settlement
    const { error } = await supabase
      .from('settlements')
      .delete()
      .eq('id', settlement.id)

    if (error) {
      console.error('Error deleting settlement:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء الحذف: ' + error.message : 'Error deleting settlement: ' + error.message)
    } else {
      alert(locale === 'ar' ? 'تم حذف التسوية بنجاح وإعادة الطلبات لحالة قابل للتسوية' : 'Settlement deleted successfully and orders reset to eligible')
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

  const getAuditActionLabel = (action: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      created: { ar: 'تم الإنشاء', en: 'Created' },
      status_changed: { ar: 'تغيير الحالة', en: 'Status Changed' },
      payment_recorded: { ar: 'تسجيل دفعة', en: 'Payment Recorded' },
      payment_updated: { ar: 'تحديث الدفع', en: 'Payment Updated' },
      amount_adjusted: { ar: 'تعديل المبلغ', en: 'Amount Adjusted' },
      notes_updated: { ar: 'تحديث الملاحظات', en: 'Notes Updated' },
      disputed: { ar: 'نزاع', en: 'Disputed' },
      resolved: { ar: 'تم الحل', en: 'Resolved' },
      waived: { ar: 'تم الإعفاء', en: 'Waived' },
    }
    return labels[action]?.[locale === 'ar' ? 'ar' : 'en'] || action
  }

  const getAuditActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <FileText className="w-4 h-4 text-blue-500" />
      case 'status_changed': return <RefreshCw className="w-4 h-4 text-amber-500" />
      case 'payment_recorded': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'payment_updated': return <DollarSign className="w-4 h-4 text-blue-500" />
      case 'amount_adjusted': return <TrendingUp className="w-4 h-4 text-purple-500" />
      case 'disputed': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'resolved': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'waived': return <XCircle className="w-4 h-4 text-slate-500" />
      default: return <History className="w-4 h-4 text-slate-400" />
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF Export Handler
  // ═══════════════════════════════════════════════════════════════════════════

  const handleExportPDF = () => {
    if (!settlement) return

    const exportData: SettlementExportData = {
      settlement: {
        id: settlement.id,
        providerId: settlement.provider_id,
        periodStart: settlement.period_start,
        periodEnd: settlement.period_end,
        totalOrders: settlement.total_orders,
        grossRevenue: settlement.gross_revenue,
        platformCommission: settlement.platform_commission,
        netPayout: settlement.net_payout || 0,
        netBalance: settlement.net_balance || 0,
        settlementDirection: settlement.settlement_direction || 'balanced',
        status: settlement.status,
        amountPaid: settlement.amount_paid || 0,
        paidAt: settlement.paid_at || null,
        paymentMethod: settlement.payment_method || null,
        paymentReference: settlement.payment_reference || null,
        createdAt: settlement.created_at,
        updatedAt: settlement.updated_at,
        cod: {
          ordersCount: settlement.cod_orders_count || 0,
          grossRevenue: settlement.cod_gross_revenue || 0,
          commissionOwed: settlement.cod_commission_owed || 0,
        },
        online: {
          ordersCount: settlement.online_orders_count || 0,
          grossRevenue: settlement.online_gross_revenue || 0,
          platformCommission: settlement.online_platform_commission || 0,
          payoutOwed: settlement.online_payout_owed || 0,
        },
      },
      providerName: {
        ar: settlement.provider?.name_ar || '',
        en: settlement.provider?.name_en || '',
      },
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        total: o.total,
        commission: o.platform_commission,
        paymentMethod: o.payment_method,
        createdAt: o.created_at,
      })),
      auditLog: auditLog.map(a => ({
        id: a.id,
        settlementId: a.settlement_id || null,
        orderId: null,
        action: a.action as import('@/types/finance').AuditAction,
        adminId: a.changed_by || null,
        adminName: a.profile?.full_name || a.changed_by || null,
        adminRole: null,
        performedAt: a.created_at,
        ipAddress: null,
        userAgent: null,
        oldValue: a.old_status ? { status: a.old_status } : null,
        newValue: a.new_status ? { status: a.new_status } : null,
        paymentReference: null,
        paymentMethod: null,
        amount: a.amount_changed || null,
        reason: null,
        notes: a.notes || null,
        createdAt: a.created_at,
      })),
    }

    exportSettlementToPDF(exportData, {
      locale: locale as 'ar' | 'en',
      includeOrders: true,
      includeAuditLog: auditLog.length > 0,
    })
  }

  if (loading) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </div>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'تفاصيل التسوية' : 'Settlement Details'}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
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
      </>
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
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'تفاصيل التسوية' : 'Settlement Details'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Back Button & Actions */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href={`/${locale}/admin/settlements`}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{locale === 'ar' ? 'العودة للقائمة' : 'Back to List'}</span>
            </Link>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {locale === 'ar' ? 'تصدير PDF' : 'Export PDF'}
            </Button>
          </div>

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
                {(() => {
                  // ✅ Total refunds from database (NOT calculated in frontend)
                  const totalRefunds = settlement.total_refunds || 0
                  const netRevenue = (settlement.gross_revenue || 0) - totalRefunds

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
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
                          <DollarSign className="w-5 h-5 text-slate-400" />
                          <span className="text-sm text-slate-600">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Gross Revenue'}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-500">
                          {formatCurrency(settlement.gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </p>
                        {totalRefunds > 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            {locale === 'ar' ? `المرتجعات: -${formatCurrency(totalRefunds, locale)}` : `Refunds: -${formatCurrency(totalRefunds, locale)}`}
                          </p>
                        )}
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <DollarSign className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-slate-600">{locale === 'ar' ? 'صافي الإيرادات' : 'Net Revenue'}</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(netRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {locale === 'ar' ? 'بعد المرتجعات' : 'After refunds'}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        {(() => {
                          const commissionRate = settlement.provider?.custom_commission_rate
                            ?? settlement.provider?.commission_rate
                            ?? 7
                          const isGracePeriod = (settlement.platform_commission || 0) === 0 && settlement.provider?.commission_status === 'in_grace_period'

                          return (
                            <>
                              <div className="flex items-center gap-3 mb-2">
                                <Percent className="w-5 h-5 text-red-500" />
                                <span className="text-sm text-slate-600">{locale === 'ar' ? `عمولة إنجزنا (${commissionRate}%)` : `Engezna Commission (${commissionRate}%)`}</span>
                              </div>
                              <p className={`text-2xl font-bold ${(settlement.platform_commission || 0) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(settlement.platform_commission || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </p>
                              {isGracePeriod && (
                                <p className="text-xs text-green-500 mt-1">
                                  {locale === 'ar' ? '✓ فترة سماح' : '✓ Grace period'}
                                  {settlement.provider?.grace_period_end && (
                                    <span className="text-slate-400">
                                      {' '}({locale === 'ar' ? 'تنتهي: ' : 'ends: '}{formatDate(settlement.provider.grace_period_end, locale)})
                                    </span>
                                  )}
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })()}

                {/* COD/Online Breakdown - Database Values Only (Single Source of Truth) */}
                {(() => {
                  // ✅ ALL values directly from database - NO frontend calculations
                  const codDeliveryFees = settlement.cod_delivery_fees || 0
                  const codOriginalCommission = settlement.cod_original_commission || 0
                  const onlineDeliveryFees = settlement.online_delivery_fees || 0
                  const onlineOriginalCommission = settlement.online_original_commission || 0

                  // ✅ Net revenue from database (NOT calculated in frontend)
                  const codNetRevenue = settlement.cod_net_revenue || 0
                  const onlineNetRevenue = settlement.online_net_revenue || 0

                  // Grace period detection: commission is 0 but original_commission > 0
                  const codIsGracePeriod = (settlement.cod_commission_owed || 0) === 0 && codOriginalCommission > 0
                  const onlineIsGracePeriod = (settlement.online_platform_commission || 0) === 0 && onlineOriginalCommission > 0

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                      {/* COD Card - Database Values */}
                      <div className="bg-white border-2 border-amber-200 rounded-xl overflow-hidden">
                        <div className="p-5">
                          {/* Header with Icon */}
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-100">
                            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                              <Banknote className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-amber-900">
                                {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                              </p>
                              <p className="text-amber-600 text-xs">
                                {settlement.cod_orders_count || 0} {locale === 'ar' ? 'طلب' : 'orders'}
                              </p>
                            </div>
                          </div>

                          {/* Financial Details - From Database */}
                          <div className="space-y-2 text-sm">
                            {/* Total Sales */}
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">{locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(settlement.cod_gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                            </div>

                            {/* Delivery Fees - From DB */}
                            {codDeliveryFees > 0 && (
                              <div className="flex justify-between items-center text-slate-500">
                                <span className="flex items-center gap-1">
                                  <span className="text-xs">(−)</span>
                                  {locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}
                                </span>
                                <span>{formatCurrency(codDeliveryFees, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                              </div>
                            )}

                            {/* Net Revenue */}
                            <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2">
                              <span className="text-slate-700 font-medium">{locale === 'ar' ? 'صافي الإيرادات' : 'Net Revenue'}</span>
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(codNetRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                            </div>

                            {/* Commission - with strikethrough if grace period */}
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">{locale === 'ar' ? 'عمولة المنصة' : 'Commission'}</span>
                              {codIsGracePeriod ? (
                                <span className="font-semibold">
                                  <span className="line-through text-slate-400 me-2">
                                    {formatCurrency(codOriginalCommission, locale)}
                                  </span>
                                  <span className="text-green-600">0 {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                                </span>
                              ) : (
                                <span className={`font-semibold ${(settlement.cod_commission_owed || 0) === 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {formatCurrency(settlement.cod_commission_owed || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                                </span>
                              )}
                            </div>

                            {/* Waived Amount if Grace Period */}
                            {codIsGracePeriod && (
                              <div className="flex justify-between items-center text-green-600 bg-green-50 py-1.5 px-2 -mx-2 rounded-lg">
                                <span className="flex items-center gap-1.5">
                                  <Gift className="w-4 h-4" />
                                  {locale === 'ar' ? 'معفى (فترة السماح)' : 'Waived (Grace Period)'}
                                </span>
                                <span className="font-bold">+{formatCurrency(codOriginalCommission, locale)}</span>
                              </div>
                            )}

                            {/* Final Result */}
                            <div className="border-t-2 border-amber-200 pt-2 mt-2">
                              <div className={`flex justify-between items-center py-2 px-2 -mx-2 rounded-lg ${
                                (settlement.cod_commission_owed || 0) === 0 ? 'bg-green-100' : 'bg-amber-100'
                              }`}>
                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                  <ArrowUpRight className="w-4 h-4" />
                                  {locale === 'ar' ? `${providerName} يدفع` : `${providerName} Pays`}
                                </span>
                                <span className={`text-lg font-bold ${
                                  (settlement.cod_commission_owed || 0) === 0 ? 'text-green-700' : 'text-amber-700'
                                }`}>
                                  {formatCurrency(settlement.cod_commission_owed || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Online Card - Database Values */}
                      <div className="bg-white border-2 border-blue-200 rounded-xl overflow-hidden">
                        <div className="p-5">
                          {/* Header with Icon */}
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-blue-100">
                            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-blue-900">
                                {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                              </p>
                              <p className="text-blue-600 text-xs">
                                {settlement.online_orders_count || 0} {locale === 'ar' ? 'طلب' : 'orders'}
                              </p>
                            </div>
                          </div>

                          {/* Financial Details - From Database */}
                          <div className="space-y-2 text-sm">
                            {/* Total Sales */}
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">{locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(settlement.online_gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                            </div>

                            {/* Delivery Fees - From DB */}
                            {onlineDeliveryFees > 0 && (
                              <div className="flex justify-between items-center text-slate-500">
                                <span className="flex items-center gap-1">
                                  <span className="text-xs">(−)</span>
                                  {locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}
                                </span>
                                <span>{formatCurrency(onlineDeliveryFees, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                              </div>
                            )}

                            {/* Net Revenue */}
                            <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2">
                              <span className="text-slate-700 font-medium">{locale === 'ar' ? 'صافي الإيرادات' : 'Net Revenue'}</span>
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(onlineNetRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                            </div>

                            {/* Commission - with strikethrough if grace period */}
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">{locale === 'ar' ? 'عمولة المنصة' : 'Commission'}</span>
                              {onlineIsGracePeriod ? (
                                <span className="font-semibold">
                                  <span className="line-through text-slate-400 me-2">
                                    -{formatCurrency(onlineOriginalCommission, locale)}
                                  </span>
                                  <span className="text-green-600">0 {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                                </span>
                              ) : (
                                <span className="font-semibold text-red-500">
                                  -{formatCurrency(settlement.online_platform_commission || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                                </span>
                              )}
                            </div>

                            {/* Waived Amount if Grace Period */}
                            {onlineIsGracePeriod && (
                              <div className="flex justify-between items-center text-green-600 bg-green-50 py-1.5 px-2 -mx-2 rounded-lg">
                                <span className="flex items-center gap-1.5">
                                  <Gift className="w-4 h-4" />
                                  {locale === 'ar' ? 'معفى (فترة السماح)' : 'Waived (Grace Period)'}
                                </span>
                                <span className="font-bold">+{formatCurrency(onlineOriginalCommission, locale)}</span>
                              </div>
                            )}

                            {/* Final Result - Platform Pays Provider */}
                            <div className="border-t-2 border-blue-200 pt-2 mt-2">
                              <div className="flex justify-between items-center py-2 px-2 -mx-2 rounded-lg bg-green-100">
                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                  <ArrowDownRight className="w-4 h-4 text-green-600" />
                                  {locale === 'ar' ? `إنجزنا تدفع لـ${providerName}` : `Engezna Pays ${providerName}`}
                                </span>
                                <span className="text-lg font-bold text-green-700">
                                  {formatCurrency(settlement.online_payout_owed || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

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
                    {formatCurrency(settlement.amount_paid ?? settlement.platform_commission ?? 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
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
                    <th className="text-start px-3 py-3 text-xs font-medium text-slate-600">{locale === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                    <th className="text-start px-3 py-3 text-xs font-medium text-slate-600">{locale === 'ar' ? 'قيمة الطلب' : 'Order Value'}</th>
                    <th className="text-start px-3 py-3 text-xs font-medium text-slate-600">{locale === 'ar' ? 'المرتجع' : 'Refund'}</th>
                    <th className="text-start px-3 py-3 text-xs font-medium text-slate-600">{locale === 'ar' ? 'التوصيل' : 'Delivery'}</th>
                    <th className="text-start px-3 py-3 text-xs font-medium text-slate-600">{locale === 'ar' ? 'صافي للعمولة' : 'Net for Commission'}</th>
                    <th className="text-start px-3 py-3 text-xs font-medium text-slate-600">{locale === 'ar' ? 'العمولة' : 'Commission'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length > 0 ? (
                    orders.map((order) => {
                      const isCOD = order.payment_method === 'cash'
                      const hasRefund = (order.refund_amount || 0) > 0
                      const isGracePeriod = order.platform_commission === 0 && settlement.provider?.commission_status === 'in_grace_period'

                      return (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                          {/* Order Number + Customer + Payment Method */}
                          <td className="px-3 py-3">
                            <div>
                              <span className="font-medium text-slate-900">#{order.order_number}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500">
                                  {order.customer?.full_name || (locale === 'ar' ? 'عميل' : 'Customer')}
                                </span>
                                <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full ${isCOD ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {isCOD ? (locale === 'ar' ? 'نقدي' : 'COD') : (locale === 'ar' ? 'إلكتروني' : 'Online')}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Original Order Value */}
                          <td className="px-3 py-3">
                            <span className="font-medium text-slate-900">
                              {formatCurrency(order.total || 0, locale)}
                            </span>
                          </td>

                          {/* Refund Amount */}
                          <td className="px-3 py-3">
                            {hasRefund ? (
                              <span className="font-medium text-red-600">
                                -{formatCurrency(order.refund_amount || 0, locale)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Delivery Fee */}
                          <td className="px-3 py-3">
                            <span className="text-slate-600">
                              {formatCurrency(order.delivery_fee || 0, locale)}
                            </span>
                          </td>

                          {/* Net for Commission = subtotal - discount - refund (NO delivery per source of truth) */}
                          <td className="px-3 py-3">
                            {(() => {
                              // Source of truth: commission_base = subtotal - discount (NO delivery)
                              // subtotal = total - delivery_fee OR stored subtotal
                              const subtotal = order.subtotal ?? ((order.total || 0) - (order.delivery_fee || 0))
                              const discount = order.discount || 0
                              const refund = order.refund_amount || 0
                              // Net for commission = subtotal - discount - refund
                              const netForCommission = subtotal - discount - refund
                              return (
                                <span className="font-medium text-blue-600">
                                  {formatCurrency(Math.max(0, netForCommission), locale)}
                                </span>
                              )
                            })()}
                          </td>

                          {/* Commission from database (source of truth) */}
                          <td className="px-3 py-3">
                            <div>
                              <span className={`font-bold ${isGracePeriod ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(order.platform_commission || 0, locale)}
                              </span>
                              {isGracePeriod && (
                                <>
                                  <p className="text-[10px] text-green-500 mt-0.5">
                                    {locale === 'ar' ? 'فترة سماح (معفى)' : 'Grace period (waived)'}
                                  </p>
                                  {(order.original_commission || 0) > 0 && (
                                    <p className="text-[10px] text-slate-400">
                                      {locale === 'ar' ? 'كانت ستكون: ' : 'Would be: '}
                                      {formatCurrency(order.original_commission || 0, locale)}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
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

          {/* Audit Trail Section */}
          <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="w-full p-4 border-b border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                {locale === 'ar' ? 'سجل التغييرات' : 'Audit Trail'}
                <span className="text-sm font-normal text-slate-500">
                  ({auditLog.length})
                </span>
              </h3>
              <RefreshCw className={`w-5 h-5 text-slate-400 transition-transform ${showAuditLog ? 'rotate-180' : ''}`} />
            </button>

            {showAuditLog && (
              <div className="p-4">
                {auditLog.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{locale === 'ar' ? 'لا يوجد سجل تغييرات' : 'No audit log entries'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditLog.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          index === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                          {getAuditActionIcon(entry.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900">
                              {getAuditActionLabel(entry.action)}
                            </span>
                            {entry.old_status && entry.new_status && (
                              <span className="text-xs text-slate-500">
                                {getStatusLabel(entry.old_status)} → {getStatusLabel(entry.new_status)}
                              </span>
                            )}
                          </div>
                          {entry.amount_changed !== null && entry.amount_changed !== 0 && (
                            <p className="text-sm text-slate-600 mt-1">
                              {locale === 'ar' ? 'المبلغ:' : 'Amount:'}{' '}
                              <span className="font-medium">
                                {formatCurrency(entry.amount_changed, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                            </p>
                          )}
                          {entry.notes && (
                            <p className="text-sm text-slate-500 mt-1">{entry.notes}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(entry.created_at, locale)}
                            </span>
                            {entry.profile?.full_name && (
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                {entry.profile.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-sm text-slate-600">
                  {locale === 'ar' ? 'المزود:' : 'Provider:'} <span className="font-medium text-slate-900">
                    {locale === 'ar' ? settlement.provider?.name_ar : settlement.provider?.name_en}
                  </span>
                  <span className="text-xs text-slate-500 ms-2">
                    ({settlement.provider?.custom_commission_rate ?? settlement.provider?.commission_rate ?? 7}%)
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Gross Revenue'}</p>
                    <p className="font-medium text-slate-900">{formatCurrency(settlement.gross_revenue || 0, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'عمولة المنصة' : 'Commission'}</p>
                    <p className="font-bold text-red-600">{formatCurrency(settlement.platform_commission || 0, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'صافي التاجر' : 'Net Payout'}</p>
                    <p className="font-bold text-green-600">{formatCurrency(settlement.net_payout || 0, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'الطلبات' : 'Orders'}</p>
                    <p className="font-medium text-slate-900">{settlement.total_orders}</p>
                  </div>
                </div>
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
    </>
  )
}
