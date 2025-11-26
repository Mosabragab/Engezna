'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  RefreshCw,
  Download,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type Transaction = {
  id: string
  type: 'order' | 'payout' | 'commission' | 'refund'
  amount: number
  status: 'completed' | 'pending' | 'failed'
  description: string
  created_at: string
  order_id?: string
}

type FinanceStats = {
  totalEarnings: number
  pendingPayout: number
  totalCommission: number
  thisMonthEarnings: number
  lastMonthEarnings: number
}

export default function FinancePage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<FinanceStats>({
    totalEarnings: 0,
    pendingPayout: 0,
    totalCommission: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterType, setFilterType] = useState<'all' | 'order' | 'payout' | 'commission'>('all')

  // Platform commission rate
  const COMMISSION_RATE = 0.06 // 6%

  useEffect(() => {
    checkAuthAndLoadFinance()
  }, [])

  const checkAuthAndLoadFinance = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/finance`)
      return
    }

    const { data: provider } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .single()

    if (!provider || !['approved', 'open', 'closed', 'temporarily_paused'].includes(provider.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    setProviderId(provider.id)
    await loadFinanceData(provider.id)
    setLoading(false)
  }

  const loadFinanceData = async (provId: string) => {
    const supabase = createClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get all delivered orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('provider_id', provId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })

    if (orders) {
      // Calculate totals
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const totalCommission = totalRevenue * COMMISSION_RATE
      const totalEarnings = totalRevenue - totalCommission

      // This month earnings
      const thisMonthOrders = orders.filter(o => new Date(o.created_at) >= monthStart)
      const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const thisMonthEarnings = thisMonthRevenue - (thisMonthRevenue * COMMISSION_RATE)

      // Last month earnings
      const lastMonthOrders = orders.filter(o => {
        const d = new Date(o.created_at)
        return d >= lastMonthStart && d <= lastMonthEnd
      })
      const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const lastMonthEarnings = lastMonthRevenue - (lastMonthRevenue * COMMISSION_RATE)

      // Pending payout (this week's earnings - simulated)
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - 7)
      const weekOrders = orders.filter(o => new Date(o.created_at) >= weekStart)
      const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const pendingPayout = weekRevenue - (weekRevenue * COMMISSION_RATE)

      setStats({
        totalEarnings,
        pendingPayout,
        totalCommission,
        thisMonthEarnings,
        lastMonthEarnings,
      })

      // Build transaction list from orders
      const txns: Transaction[] = orders.slice(0, 20).map(order => ({
        id: order.id,
        type: 'order' as const,
        amount: (order.total_amount || 0) - ((order.total_amount || 0) * COMMISSION_RATE),
        status: 'completed' as const,
        description: `#${order.id.slice(0, 8).toUpperCase()}`,
        created_at: order.created_at,
        order_id: order.id,
      }))

      setTransactions(txns)
    }
  }

  const handleRefresh = async () => {
    if (!providerId) return
    setRefreshing(true)
    await loadFinanceData(providerId)
    setRefreshing(false)
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getGrowthPercentage = () => {
    if (stats.lastMonthEarnings === 0) return stats.thisMonthEarnings > 0 ? 100 : 0
    return ((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings * 100).toFixed(1)
  }

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true
    return t.type === filterType
  })

  const filters = [
    { key: 'all', label_ar: 'الكل', label_en: 'All' },
    { key: 'order', label_ar: 'الطلبات', label_en: 'Orders' },
    { key: 'payout', label_ar: 'التحويلات', label_en: 'Payouts' },
    { key: 'commission', label_ar: 'العمولات', label_en: 'Commissions' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-400">
            {locale === 'ar' ? 'جاري تحميل البيانات المالية...' : 'Loading financial data...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/provider`}
              className="flex items-center gap-2 text-slate-400 hover:text-white"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
            </Link>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {locale === 'ar' ? 'المالية والمدفوعات' : 'Finance & Payments'}
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-slate-600"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalEarnings)}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'إجمالي الأرباح' : 'Total Earnings'}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.pendingPayout)}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'قيد التحويل' : 'Pending Payout'}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    Number(getGrowthPercentage()) >= 0
                      ? 'text-green-400 bg-green-500/20'
                      : 'text-red-400 bg-red-500/20'
                  }`}>
                    {Number(getGrowthPercentage()) >= 0 ? '+' : ''}{getGrowthPercentage()}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-400">{formatCurrency(stats.thisMonthEarnings)}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'هذا الشهر' : 'This Month'}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Banknote className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-orange-400">{formatCurrency(stats.totalCommission)}</p>
                <p className="text-xs text-slate-400">{locale === 'ar' ? 'العمولات (6%)' : 'Commission (6%)'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Commission Info */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white mb-1">
                    {locale === 'ar' ? 'معلومات العمولة' : 'Commission Information'}
                  </p>
                  <p className="text-sm text-slate-400">
                    {locale === 'ar'
                      ? 'عمولة المنصة 6% فقط من قيمة كل طلب. يتم تحويل أرباحك أسبوعياً إلى حسابك البنكي.'
                      : 'Platform commission is only 6% of each order. Your earnings are transferred weekly to your bank account.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payout Schedule */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {locale === 'ar' ? 'جدول التحويلات' : 'Payout Schedule'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <p className="text-lg font-bold text-white">
                    {locale === 'ar' ? 'الأحد' : 'Sunday'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {locale === 'ar' ? 'يوم التحويل' : 'Payout Day'}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <p className="text-lg font-bold text-white">
                    {locale === 'ar' ? '1-3 أيام' : '1-3 Days'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {locale === 'ar' ? 'وقت الوصول' : 'Processing Time'}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <p className="text-lg font-bold text-white">
                    {locale === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {locale === 'ar' ? 'سجل المعاملات' : 'Transaction History'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setFilterType(filter.key as typeof filterType)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm ${
                      filterType === filter.key
                        ? 'bg-primary text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {locale === 'ar' ? filter.label_ar : filter.label_en}
                  </button>
                ))}
              </div>

              {/* Transactions List */}
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{locale === 'ar' ? 'لا توجد معاملات' : 'No transactions'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          txn.type === 'order' ? 'bg-green-500/20' :
                          txn.type === 'payout' ? 'bg-blue-500/20' :
                          txn.type === 'commission' ? 'bg-orange-500/20' :
                          'bg-red-500/20'
                        }`}>
                          {txn.type === 'order' ? (
                            <ArrowUpRight className="w-5 h-5 text-green-400" />
                          ) : txn.type === 'payout' ? (
                            <ArrowDownRight className="w-5 h-5 text-blue-400" />
                          ) : txn.type === 'commission' ? (
                            <DollarSign className="w-5 h-5 text-orange-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {txn.type === 'order'
                              ? (locale === 'ar' ? 'طلب' : 'Order')
                              : txn.type === 'payout'
                              ? (locale === 'ar' ? 'تحويل' : 'Payout')
                              : txn.type === 'commission'
                              ? (locale === 'ar' ? 'عمولة' : 'Commission')
                              : (locale === 'ar' ? 'استرداد' : 'Refund')} {txn.description}
                          </p>
                          <p className="text-xs text-slate-500">{formatDate(txn.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className={`font-bold ${
                          txn.type === 'order' ? 'text-green-400' :
                          txn.type === 'payout' ? 'text-blue-400' :
                          txn.type === 'commission' ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                          {txn.type === 'order' ? '+' : txn.type === 'commission' ? '-' : ''}{formatCurrency(txn.amount)}
                        </p>
                        <p className={`text-xs ${
                          txn.status === 'completed' ? 'text-green-400' :
                          txn.status === 'pending' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {txn.status === 'completed'
                            ? (locale === 'ar' ? 'مكتمل' : 'Completed')
                            : txn.status === 'pending'
                            ? (locale === 'ar' ? 'قيد المعالجة' : 'Pending')
                            : (locale === 'ar' ? 'فشل' : 'Failed')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
