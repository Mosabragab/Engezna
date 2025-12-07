'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ProviderLayout } from '@/components/provider'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters'
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Eye,
  Calendar,
  RefreshCw,
  Receipt,
  TrendingUp,
  Building,
  CreditCard,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

import { ACTIVE_PROVIDER_STATUSES, SettlementStatus } from '@/types/database'

interface Settlement {
  id: string
  period_start: string
  period_end: string
  total_orders: number
  gross_revenue: number
  platform_commission: number
  delivery_fees_collected: number
  net_amount_due: number // Amount provider owes platform
  net_payout?: number // Legacy field
  amount_paid: number
  status: SettlementStatus
  payment_date: string | null
  paid_at?: string | null // Legacy field
  payment_method: string | null
  payment_reference: string | null
  due_date: string
  is_overdue: boolean
  overdue_days: number
  notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export default function ProviderSettlementsPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)

  const [stats, setStats] = useState({
    totalDue: 0,
    totalPaid: 0,
    pendingCount: 0,
    overdueCount: 0,
    totalOrders: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  async function checkAuthAndLoad() {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/settlements`)
      return
    }

    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .limit(1)

    const provider = providerData?.[0]
    if (!provider || !ACTIVE_PROVIDER_STATUSES.includes(provider.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    setProviderId(provider.id)
    await loadSettlements(provider.id, supabase)
    setLoading(false)
  }

  async function loadSettlements(provId: string, supabase?: ReturnType<typeof createClient>) {
    const client = supabase || createClient()

    const { data: settlementsData } = await client
      .from('settlements')
      .select('*')
      .eq('provider_id', provId)
      .order('created_at', { ascending: false })

    const settlements = (settlementsData || []) as Settlement[]
    setSettlements(settlements)

    // Calculate stats
    const pending = settlements.filter(s => s.status === 'pending' || s.status === 'partially_paid')
    const overdue = settlements.filter(s => s.status === 'overdue' || s.status === 'disputed')
    const completed = settlements.filter(s => s.status === 'paid' || s.status === 'waived')

    // Total due = sum of net_amount_due for pending settlements (what provider owes platform)
    // For partially paid, subtract amount_paid
    const totalDue = pending.reduce((sum, s) => {
      const due = s.net_amount_due || s.platform_commission || 0
      const paid = s.amount_paid || 0
      return sum + (due - paid)
    }, 0) + overdue.reduce((sum, s) => {
      const due = s.net_amount_due || s.platform_commission || 0
      const paid = s.amount_paid || 0
      return sum + (due - paid)
    }, 0)

    // Total paid = sum of amount_paid for completed settlements
    const totalPaid = completed.reduce((sum, s) => sum + (s.amount_paid || s.net_amount_due || 0), 0)
    const totalOrders = settlements.reduce((sum, s) => sum + (s.total_orders || 0), 0)
    const totalRevenue = settlements.reduce((sum, s) => sum + (s.gross_revenue || 0), 0)

    setStats({
      totalDue,
      totalPaid,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      totalOrders,
      totalRevenue,
    })
  }

  async function handleRefresh() {
    if (!providerId) return
    setRefreshing(true)
    await loadSettlements(providerId)
    setRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'waived': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'partially_paid': return 'bg-blue-100 text-blue-700'
      case 'overdue': return 'bg-red-100 text-red-700'
      case 'disputed': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      partially_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
      paid: { ar: 'مدفوع', en: 'Paid' },
      overdue: { ar: 'متأخر', en: 'Overdue' },
      disputed: { ar: 'نزاع', en: 'Disputed' },
      waived: { ar: 'معفى', en: 'Waived' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-4 h-4" />
      case 'waived': return <CheckCircle2 className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'partially_paid': return <TrendingUp className="w-4 h-4" />
      case 'overdue': return <AlertTriangle className="w-4 h-4" />
      case 'disputed': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">
            {locale === 'ar' ? 'جاري تحميل التسويات...' : 'Loading settlements...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'التسويات المالية', en: 'Financial Settlements' }}
      pageSubtitle={{ ar: 'عرض مستحقات المنصة والمدفوعات', en: 'View platform dues and payments' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {locale === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Due */}
          <Card className={`${stats.totalDue > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Receipt className={`w-8 h-8 ${stats.totalDue > 0 ? 'text-red-500' : 'text-green-500'}`} />
              </div>
              <p className={`text-2xl font-bold ${stats.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(stats.totalDue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
              </p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'إجمالي المستحق' : 'Total Due'}</p>
            </CardContent>
          </Card>

          {/* Total Paid */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalPaid, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
              </p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'إجمالي المدفوع' : 'Total Paid'}</p>
            </CardContent>
          </Card>

          {/* Pending Settlements */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {formatNumber(stats.pendingCount, locale)}
              </p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'تسويات معلقة' : 'Pending'}</p>
            </CardContent>
          </Card>

          {/* Overdue */}
          <Card className={`${stats.overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className={`w-8 h-8 ${stats.overdueCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              </div>
              <p className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                {formatNumber(stats.overdueCount, locale)}
              </p>
              <p className="text-xs text-slate-500">{locale === 'ar' ? 'متأخرات' : 'Overdue'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 mb-1">
                  {locale === 'ar' ? 'كيف تعمل التسويات؟' : 'How do settlements work?'}
                </p>
                <p className="text-sm text-slate-600">
                  {locale === 'ar'
                    ? 'يتم إنشاء تسوية أسبوعية تحتوي على عمولة المنصة (6%) من جميع طلباتك المكتملة. يجب دفع المبلغ المستحق خلال 7 أيام من نهاية فترة التسوية لتجنب رسوم التأخير.'
                    : 'A weekly settlement is generated containing the platform commission (6%) from all your completed orders. The due amount should be paid within 7 days of the settlement period end to avoid late fees.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Alert */}
        {stats.overdueCount > 0 && (
          <Card className="bg-red-50 border-red-300">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 mb-1">
                    {locale === 'ar' ? 'لديك تسويات متأخرة!' : 'You have overdue settlements!'}
                  </p>
                  <p className="text-sm text-red-600">
                    {locale === 'ar'
                      ? 'يرجى تسوية المبالغ المتأخرة في أقرب وقت ممكن لتجنب تعليق حسابك. تواصل مع الدعم إذا كنت بحاجة لمساعدة.'
                      : 'Please settle overdue amounts as soon as possible to avoid account suspension. Contact support if you need assistance.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settlements List */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {locale === 'ar' ? 'سجل التسويات' : 'Settlement History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settlements.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Receipt className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium">
                  {locale === 'ar' ? 'لا توجد تسويات بعد' : 'No settlements yet'}
                </p>
                <p className="text-sm mt-1">
                  {locale === 'ar'
                    ? 'ستظهر التسويات هنا بعد إتمام طلباتك الأولى'
                    : 'Settlements will appear here after your first completed orders'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {settlements.map((settlement) => (
                  <button
                    key={settlement.id}
                    onClick={() => setSelectedSettlement(selectedSettlement?.id === settlement.id ? null : settlement)}
                    className="w-full text-start"
                  >
                    <div className={`p-4 rounded-xl border transition-all ${
                      selectedSettlement?.id === settlement.id
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(settlement.status)}`}>
                            {getStatusIcon(settlement.status)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {formatDate(settlement.period_start, locale)} - {formatDate(settlement.period_end, locale)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatNumber(settlement.total_orders, locale)} {locale === 'ar' ? 'طلب' : 'orders'} |
                              {' '}{locale === 'ar' ? 'إجمالي' : 'Total'}: {formatCurrency(settlement.gross_revenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-end">
                            <p className={`font-bold ${
                              settlement.status === 'paid' || settlement.status === 'waived' ? 'text-green-600' :
                              settlement.status === 'disputed' || settlement.status === 'overdue' ? 'text-red-600' :
                              'text-amber-600'
                            }`}>
                              {formatCurrency(settlement.net_payout || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(settlement.status)}`}>
                              {getStatusLabel(settlement.status)}
                            </span>
                          </div>
                          {isRTL ? (
                            <ChevronLeft className={`w-5 h-5 text-slate-400 transition-transform ${selectedSettlement?.id === settlement.id ? '-rotate-90' : ''}`} />
                          ) : (
                            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${selectedSettlement?.id === settlement.id ? 'rotate-90' : ''}`} />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedSettlement?.id === settlement.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Gross Revenue'}</p>
                              <p className="font-medium text-slate-900">{formatCurrency(settlement.gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{locale === 'ar' ? 'عمولة المنصة (6%)' : 'Platform Commission (6%)'}</p>
                              <p className="font-medium text-red-600">-{formatCurrency(settlement.platform_commission || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{locale === 'ar' ? 'صافي المزود' : 'Net Payout'}</p>
                              <p className="font-bold text-green-600">{formatCurrency(settlement.net_payout || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{locale === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</p>
                              <p className="font-medium text-slate-900">{formatDate(settlement.created_at, locale)}</p>
                            </div>
                          </div>

                          {settlement.paid_at && (
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-sm text-green-700">
                                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                                {locale === 'ar' ? 'تم الدفع بتاريخ' : 'Paid on'} {formatDate(settlement.paid_at, locale)}
                                {settlement.payment_method && ` (${settlement.payment_method})`}
                              </p>
                            </div>
                          )}

                          {settlement.notes && (
                            <div className="bg-slate-100 p-3 rounded-lg">
                              <p className="text-sm text-slate-600">
                                <Info className="w-4 h-4 inline mr-1" />
                                {settlement.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-3">
                {locale === 'ar'
                  ? 'لديك استفسار حول التسويات؟ تواصل مع فريق الدعم'
                  : 'Have questions about settlements? Contact our support team'}
              </p>
              <Link href={`/${locale}/provider/support`}>
                <Button variant="outline" size="sm">
                  {locale === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  )
}
