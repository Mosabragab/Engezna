'use client'

import { useLocale } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar, GeoFilter, useGeoFilter } from '@/components/admin'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters'
import { useAdminFinancialData } from '@/hooks/useFinancialData'
import type { FinancialFilters, Settlement } from '@/types/finance'
import {
  Shield,
  Search,
  Eye,
  RefreshCw,
  DollarSign,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Building,
  Receipt,
  Wallet,
  Gift,
  TrendingUp,
  TrendingDown,
  Percent,
  AlertCircle,
  Users,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type FilterSettlementStatus = 'all' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'waived'

export default function AdminFinancePage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Local state for filters
  const { geoFilter, setGeoFilter } = useGeoFilter()
  const [searchQuery, setSearchQuery] = useState('')
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<FilterSettlementStatus>('all')

  // Build filters for the hook
  const [filters, setFilters] = useState<FinancialFilters>({})

  // Update filters when geoFilter changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      governorateId: geoFilter.governorate_id || undefined,
      cityId: geoFilter.city_id || undefined,
    }))
  }, [geoFilter])

  // Use the financial data hook
  const {
    adminSummary,
    settlements,
    isLoading: dataLoading,
    isLoadingSettlements,
    error,
    refresh,
    loadSettlements,
    formatMoney,
  } = useAdminFinancialData({
    filters,
    refreshInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  })

  // Load settlements with status filter
  useEffect(() => {
    if (isAdmin) {
      const statusFilters = settlementStatusFilter !== 'all'
        ? { ...filters, status: [settlementStatusFilter] as any }
        : filters
      loadSettlements(statusFilters)
    }
  }, [isAdmin, settlementStatusFilter, filters, loadSettlements])

  // Filter settlements by search query
  const filteredSettlements = settlements.filter(s => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const name = locale === 'ar' ? s.providerName?.ar : s.providerName?.en
    return name?.toLowerCase().includes(query) || s.id.toLowerCase().includes(query)
  })

  const checkAuth = useCallback(async () => {
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
        setLoading(false)
        return
      }
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const getSettlementStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'status-success'
      case 'waived': return 'status-success'
      case 'pending': return 'status-warning'
      case 'partially_paid': return 'status-in-progress'
      case 'overdue': return 'status-error'
      case 'disputed': return 'status-error'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getSettlementStatusLabel = (status: string) => {
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

  const getDirectionLabel = (direction: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      platform_pays_provider: { ar: 'المنصة تدفع للتاجر', en: 'Platform Pays Provider' },
      provider_pays_platform: { ar: 'التاجر يدفع للمنصة', en: 'Provider Pays Platform' },
      balanced: { ar: 'متوازن', en: 'Balanced' },
    }
    return labels[direction]?.[locale === 'ar' ? 'ar' : 'en'] || direction
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'platform_pays_provider': return <ArrowUpRight className="w-4 h-4 text-green-500" />
      case 'provider_pays_platform': return <ArrowDownRight className="w-4 h-4 text-red-500" />
      default: return <ArrowRightLeft className="w-4 h-4 text-slate-500" />
    }
  }

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </main>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'الإدارة المالية' : 'Finance Management'}
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
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
        </main>
      </>
    )
  }

  const summary = adminSummary || {
    totalProviders: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalDeliveryFees: 0,
    totalTheoreticalCommission: 0,
    totalActualCommission: 0,
    totalGracePeriodDiscount: 0,
    totalRefunds: 0,
    cod: { orders: 0, revenue: 0, commissionOwed: 0 },
    online: { orders: 0, revenue: 0, payoutOwed: 0 },
    totalNetBalance: 0,
    providersToPay: 0,
    providersToCollect: 0,
    providersBalanced: 0,
    eligibleOrders: 0,
    heldOrders: 0,
    settledOrders: 0,
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'الإدارة المالية' : 'Finance Management'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error.message}</p>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col gap-4">
            {/* Geographic Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{locale === 'ar' ? 'فلترة جغرافية:' : 'Geographic Filter:'}</span>
              <GeoFilter
                value={geoFilter}
                onChange={setGeoFilter}
                showDistrict={true}
              />
              <Button
                variant="outline"
                onClick={refresh}
                disabled={dataLoading}
                className="flex items-center gap-2 ml-auto"
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Stats - from financial_settlement_engine */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            <p className="text-white/70 text-xs mt-2">{formatNumber(summary.totalOrders, locale)} {locale === 'ar' ? 'طلب مكتمل' : 'delivered orders'}</p>
          </div>

          {/* Platform Commission */}
          <div className="bg-gradient-to-br from-[#009DE0] to-[#0080b8] rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              {summary.totalGracePeriodDiscount > 0 && (
                <div className="flex items-center gap-1 text-sm text-blue-100">
                  <Gift className="w-4 h-4" />
                  <span>{formatCurrency(summary.totalGracePeriodDiscount, locale)}</span>
                </div>
              )}
            </div>
            <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'عمولة المنصة' : 'Platform Commission'}</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalActualCommission, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            {summary.totalGracePeriodDiscount > 0 && (
              <p className="text-white/70 text-xs mt-2">
                {locale === 'ar' ? `نظري: ${formatCurrency(summary.totalTheoreticalCommission, locale)} ج.م` : `Theoretical: ${formatCurrency(summary.totalTheoreticalCommission, locale)} EGP`}
              </p>
            )}
          </div>

          {/* Delivery Fees */}
          <div className="bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fees'}</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalDeliveryFees, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
          </div>

          {/* Net Balance */}
          <div className={`bg-gradient-to-br ${summary.totalNetBalance >= 0 ? 'from-[#F59E0B] to-[#D97706]' : 'from-[#EF4444] to-[#DC2626]'} rounded-xl p-5 text-white shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                {summary.totalNetBalance >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
              </div>
            </div>
            <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'صافي الرصيد' : 'Net Balance'}</p>
            <p className="text-2xl font-bold">{formatCurrency(Math.abs(summary.totalNetBalance), locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            <p className="text-white/70 text-xs mt-2">
              {summary.totalNetBalance >= 0
                ? (locale === 'ar' ? 'المنصة تدفع للتجار' : 'Platform pays providers')
                : (locale === 'ar' ? 'التجار يدفعون للمنصة' : 'Providers pay platform')
              }
            </p>
          </div>
        </div>

        {/* COD vs Online Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* COD Orders - Provider Pays Platform */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-card-bg-success rounded-xl flex items-center justify-center">
                <Banknote className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">{locale === 'ar' ? 'طلبات الدفع عند الاستلام (COD)' : 'Cash on Delivery (COD)'}</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.cod.revenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">{formatNumber(summary.cod.orders, locale)} {locale === 'ar' ? 'طلب' : 'orders'}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  <ArrowDownRight className="w-4 h-4 text-red-500 inline mr-1" />
                  {locale === 'ar' ? 'العمولة المستحقة من التجار' : 'Commission owed by merchants'}
                </span>
                <span className="font-semibold text-red-600">{formatCurrency(summary.cod.commissionOwed, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>

          {/* Online Orders - Platform Pays Provider */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-card-bg-primary rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">{locale === 'ar' ? 'طلبات الدفع الإلكتروني' : 'Online Payments'}</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.online.revenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">{formatNumber(summary.online.orders, locale)} {locale === 'ar' ? 'طلب' : 'orders'}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  <ArrowUpRight className="w-4 h-4 text-green-500 inline mr-1" />
                  {locale === 'ar' ? 'المستحق للتجار' : 'Payout owed to merchants'}
                </span>
                <span className="font-semibold text-green-600">{formatCurrency(summary.online.payoutOwed, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Settlement Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{locale === 'ar' ? 'المنصة تدفع لهم' : 'Platform Pays'}</p>
                <p className="text-xl font-bold text-slate-900">{formatNumber(summary.providersToPay, locale)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{locale === 'ar' ? 'يدفعون للمنصة' : 'Pay Platform'}</p>
                <p className="text-xl font-bold text-slate-900">{formatNumber(summary.providersToCollect, locale)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{locale === 'ar' ? 'متوازنون' : 'Balanced'}</p>
                <p className="text-xl font-bold text-slate-900">{formatNumber(summary.providersBalanced, locale)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Settlement Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{locale === 'ar' ? 'طلبات جاهزة للتسوية' : 'Eligible Orders'}</p>
                <p className="text-xl font-bold text-slate-900">{formatNumber(summary.eligibleOrders, locale)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{locale === 'ar' ? 'طلبات معلقة' : 'Held Orders'}</p>
                <p className="text-xl font-bold text-slate-900">{formatNumber(summary.heldOrders, locale)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{locale === 'ar' ? 'طلبات تمت تسويتها' : 'Settled Orders'}</p>
                <p className="text-xl font-bold text-slate-900">{formatNumber(summary.settledOrders, locale)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settlements Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'تسويات المتاجر' : 'Provider Settlements'}
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full sm:w-64 ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500`}
                  />
                </div>
                <select
                  value={settlementStatusFilter}
                  onChange={(e) => setSettlementStatusFilter(e.target.value as FilterSettlementStatus)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                  <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
                  <option value="partially_paid">{locale === 'ar' ? 'مدفوع جزئياً' : 'Partially Paid'}</option>
                  <option value="paid">{locale === 'ar' ? 'مدفوع' : 'Paid'}</option>
                  <option value="overdue">{locale === 'ar' ? 'متأخر' : 'Overdue'}</option>
                  <option value="disputed">{locale === 'ar' ? 'نزاع' : 'Disputed'}</option>
                  <option value="waived">{locale === 'ar' ? 'معفى' : 'Waived'}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المتجر' : 'Provider'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الإيرادات' : 'Revenue'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الرصيد' : 'Balance'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الاتجاه' : 'Direction'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingSettlements ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredSettlements.length > 0 ? (
                  filteredSettlements.map((settlement) => (
                    <tr key={settlement.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Building className="w-5 h-5 text-slate-500" />
                          </div>
                          <span className="font-medium text-slate-900">
                            {locale === 'ar' ? settlement.providerName?.ar : settlement.providerName?.en}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="text-slate-900">{formatDate(settlement.periodStart, locale)}</p>
                          <p className="text-slate-500">{locale === 'ar' ? 'إلى' : 'to'} {formatDate(settlement.periodEnd, locale)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{formatCurrency(settlement.grossRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${settlement.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(settlement.netBalance), locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getDirectionIcon(settlement.settlementDirection)}
                          <span className="text-sm text-slate-600">{getDirectionLabel(settlement.settlementDirection)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getSettlementStatusColor(settlement.status)}`}>
                          {settlement.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                          {settlement.status === 'pending' && <Clock className="w-3 h-3" />}
                          {settlement.status === 'partially_paid' && <RefreshCw className="w-3 h-3" />}
                          {settlement.status === 'disputed' && <XCircle className="w-3 h-3" />}
                          {settlement.status === 'overdue' && <XCircle className="w-3 h-3" />}
                          {getSettlementStatusLabel(settlement.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/${locale}/admin/finance/settlements/${settlement.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4 text-slate-500" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">
                        {locale === 'ar' ? 'لا توجد تسويات' : 'No settlements found'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
