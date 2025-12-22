'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar, GeoFilter, useAdminGeoFilter } from '@/components/admin'
import type { GeoFilterValue } from '@/components/admin'
import { MapPin } from 'lucide-react'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShoppingCart,
  UserPlus,
  Star,
  TrendingUp,
  PieChart,
  BarChart2,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DailyStats {
  date: string
  orders: number
  revenue: number
}

interface TopProvider {
  id: string
  name_ar: string
  name_en: string
  orders_count: number
  revenue: number
  rating: number
}

interface CategoryStats {
  category: string
  orders: number
  revenue: number
}

type FilterPeriod = 'week' | 'month' | 'quarter' | 'year'

export default function AdminAnalyticsPage() {
  const locale = useLocale()
  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const { geoFilter, setGeoFilter, isRegionalAdmin, allowedGovernorateIds, loading: geoLoading } = useAdminGeoFilter()
  const [governorates, setGovernorates] = useState<{ id: string; name_ar: string; name_en: string }[]>([])

  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('month')
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [topProviders, setTopProviders] = useState<TopProvider[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])

  const [overview, setOverview] = useState({
    totalOrders: 0,
    ordersChange: 0,
    totalRevenue: 0,
    revenueChange: 0,
    newCustomers: 0,
    customersChange: 0,
    avgOrderValue: 0,
    avgOrderChange: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    // Wait for geoFilter to be loaded before loading analytics
    if (isAdmin && !geoLoading) {
      const supabase = createClient()
      loadAnalytics(supabase)
    }
  }, [periodFilter, isAdmin, geoFilter, geoLoading])

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

        // Load governorates for display
        const { data: govData } = await supabase
          .from('governorates')
          .select('id, name_ar, name_en')
          .eq('is_active', true)
          .order('name_ar')
        if (govData) {
          setGovernorates(govData)
        }

        setLoading(false) // Show page immediately
        // loadAnalytics will be triggered by useEffect when geoFilter is ready
        return
      }
    }

    setLoading(false)
  }

  async function loadAnalytics(supabase: ReturnType<typeof createClient>) {
    setDataLoading(true)
    const getDateRange = (period: FilterPeriod) => {
      const start = new Date()
      switch (period) {
        case 'week':
          start.setDate(start.getDate() - 7)
          break
        case 'month':
          start.setMonth(start.getMonth() - 1)
          break
        case 'quarter':
          start.setMonth(start.getMonth() - 3)
          break
        case 'year':
          start.setFullYear(start.getFullYear() - 1)
          break
      }
      return start.toISOString()
    }

    const startDate = getDateRange(periodFilter)

    // Get providers with geographic info for filtering
    let providersForFilterQuery = supabase
      .from('providers')
      .select('id, governorate_id, city_id, district_id')

    if (geoFilter.governorate_id) {
      providersForFilterQuery = providersForFilterQuery.eq('governorate_id', geoFilter.governorate_id)
    }
    if (geoFilter.city_id) {
      providersForFilterQuery = providersForFilterQuery.eq('city_id', geoFilter.city_id)
    }
    if (geoFilter.district_id) {
      providersForFilterQuery = providersForFilterQuery.eq('district_id', geoFilter.district_id)
    }

    const { data: filteredProviders } = await providersForFilterQuery
    const filteredProviderIds = (filteredProviders || []).map(p => p.id)

    // Get all orders in the date range (we'll filter by delivery_address in code)
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, total, platform_commission, created_at, status, provider_id, delivery_address')
      .gte('created_at', startDate)
      .eq('status', 'delivered')

    // Filter orders by geographic filter - only orders from providers in the selected region
    let orders = ordersData || []

    if (geoFilter.governorate_id || geoFilter.city_id || geoFilter.district_id) {
      // For regional admins, strictly filter by provider location
      // If no providers found in region, show empty results
      if (filteredProviderIds.length === 0) {
        orders = []
      } else {
        orders = orders.filter(order => {
          // Only show orders from providers in the region
          return filteredProviderIds.includes(order.provider_id)
        })
      }
    }

    const dailyMap = new Map<string, { orders: number; revenue: number }>()
    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      const existing = dailyMap.get(date) || { orders: 0, revenue: 0 }
      dailyMap.set(date, {
        orders: existing.orders + 1,
        revenue: existing.revenue + (order.total || 0),
      })
    })

    const daily: DailyStats[] = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    setDailyStats(daily)

    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const getPreviousRange = (period: FilterPeriod) => {
      const end = new Date(startDate)
      const start = new Date(startDate)
      switch (period) {
        case 'week':
          start.setDate(start.getDate() - 7)
          break
        case 'month':
          start.setMonth(start.getMonth() - 1)
          break
        case 'quarter':
          start.setMonth(start.getMonth() - 3)
          break
        case 'year':
          start.setFullYear(start.getFullYear() - 1)
          break
      }
      return { start: start.toISOString(), end: end.toISOString() }
    }

    const prevRange = getPreviousRange(periodFilter)
    const { data: prevOrdersData } = await supabase
      .from('orders')
      .select('id, total')
      .gte('created_at', prevRange.start)
      .lt('created_at', prevRange.end)
      .eq('status', 'delivered')

    const prevOrders = prevOrdersData || []
    const prevTotalOrders = prevOrders.length
    const prevTotalRevenue = prevOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const prevAvgOrder = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0

    const ordersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0
    const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0
    const avgOrderChange = prevAvgOrder > 0 ? ((avgOrderValue - prevAvgOrder) / prevAvgOrder) * 100 : 0

    const { data: newCustomersData } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'customer')
      .gte('created_at', startDate)

    const { data: prevCustomersData } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'customer')
      .gte('created_at', prevRange.start)
      .lt('created_at', prevRange.end)

    const newCustomers = (newCustomersData || []).length
    const prevNewCustomers = (prevCustomersData || []).length
    const customersChange = prevNewCustomers > 0 ? ((newCustomers - prevNewCustomers) / prevNewCustomers) * 100 : 0

    setOverview({
      totalOrders,
      ordersChange,
      totalRevenue,
      revenueChange,
      newCustomers,
      customersChange,
      avgOrderValue,
      avgOrderChange,
    })

    const providerOrdersMap = new Map<string, { orders: number; revenue: number }>()
    orders.forEach(order => {
      if (order.provider_id) {
        const existing = providerOrdersMap.get(order.provider_id) || { orders: 0, revenue: 0 }
        providerOrdersMap.set(order.provider_id, {
          orders: existing.orders + 1,
          revenue: existing.revenue + (order.total || 0),
        })
      }
    })

    const topProviderIds = Array.from(providerOrdersMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id]) => id)

    if (topProviderIds.length > 0) {
      const { data: providersData } = await supabase
        .from('providers')
        .select('id, name_ar, name_en, rating')
        .in('id', topProviderIds)

      const providers: TopProvider[] = (providersData || []).map(p => {
        const stats = providerOrdersMap.get(p.id) || { orders: 0, revenue: 0 }
        return {
          ...p,
          orders_count: stats.orders,
          revenue: stats.revenue,
          rating: p.rating || 0,
        }
      }).sort((a, b) => b.revenue - a.revenue)

      setTopProviders(providers)
    }

    const { data: providersWithCategory } = await supabase
      .from('providers')
      .select('id, category')

    const providerCategoryMap = new Map<string, string>()
    ;(providersWithCategory || []).forEach(p => {
      providerCategoryMap.set(p.id, p.category || 'other')
    })

    const categoryMap = new Map<string, { orders: number; revenue: number }>()
    orders.forEach(order => {
      const category = providerCategoryMap.get(order.provider_id || '') || 'other'
      const existing = categoryMap.get(category) || { orders: 0, revenue: 0 }
      categoryMap.set(category, {
        orders: existing.orders + 1,
        revenue: existing.revenue + (order.total || 0),
      })
    })

    const categories: CategoryStats[] = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)

    setCategoryStats(categories)
    setDataLoading(false)
  }

  const getPeriodLabel = (period: FilterPeriod) => {
    const labels: Record<FilterPeriod, { ar: string; en: string }> = {
      week: { ar: 'أسبوع', en: 'Week' },
      month: { ar: 'شهر', en: 'Month' },
      quarter: { ar: 'ربع سنة', en: 'Quarter' },
      year: { ar: 'سنة', en: 'Year' },
    }
    return labels[period][locale === 'ar' ? 'ar' : 'en']
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      restaurant: { ar: 'مطاعم', en: 'Restaurants' },
      restaurant_cafe: { ar: 'مطاعم', en: 'Restaurants' }, // Alias for restaurant
      grocery: { ar: 'بقالة', en: 'Grocery' },
      pharmacy: { ar: 'صيدلية', en: 'Pharmacy' },
      electronics: { ar: 'إلكترونيات', en: 'Electronics' },
      fashion: { ar: 'أزياء', en: 'Fashion' },
      other: { ar: 'أخرى', en: 'Other' },
    }
    return labels[category]?.[locale === 'ar' ? 'ar' : 'en'] || category
  }

  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1)

  if (loading) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <div className="w-40 h-5 bg-slate-200 rounded animate-pulse" />
          </div>
        </header>
        <main className="flex-1 p-6 flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#009DE0] border-t-transparent"></div>
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
              {locale === 'ar' ? 'التحليلات والإحصائيات' : 'Analytics & Statistics'}
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
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

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'التحليلات والإحصائيات' : 'Analytics & Statistics'}
        onMenuClick={toggleSidebar}
      />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Period Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {(['week', 'month', 'quarter', 'year'] as FilterPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setPeriodFilter(period)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      periodFilter === period
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {getPeriodLabel(period)}
                  </button>
                ))}
              </div>

              {/* Geographic Filter - Only show for non-regional admins */}
              {!isRegionalAdmin && !geoLoading && (
                <div className="flex items-center gap-3 lg:ml-auto pt-2 lg:pt-0 lg:border-l lg:border-slate-200 lg:pl-4">
                  <span className="text-sm text-slate-500 whitespace-nowrap">{locale === 'ar' ? 'فلترة جغرافية:' : 'Location:'}</span>
                  <GeoFilter
                    value={geoFilter}
                    onChange={setGeoFilter}
                    showDistrict={true}
                  />
                </div>
              )}

              {/* Region indicator for regional admins */}
              {isRegionalAdmin && allowedGovernorateIds.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 lg:ml-auto">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {locale === 'ar' ? 'منطقتك: ' : 'Your Region: '}
                    {governorates
                      .filter(g => allowedGovernorateIds.includes(g.id))
                      .map(g => locale === 'ar' ? g.name_ar : g.name_en)
                      .join(', ') || '-'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                {overview.ordersChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${overview.ordersChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overview.ordersChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {formatNumber(Math.abs(Math.round(overview.ordersChange * 10) / 10), locale)}%
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-sm mb-1">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(overview.totalOrders, locale)}</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                {overview.revenueChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${overview.revenueChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overview.revenueChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {formatNumber(Math.abs(Math.round(overview.revenueChange * 10) / 10), locale)}%
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-sm mb-1">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(overview.totalRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-purple-600" />
                </div>
                {overview.customersChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${overview.customersChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overview.customersChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {formatNumber(Math.abs(Math.round(overview.customersChange * 10) / 10), locale)}%
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-sm mb-1">{locale === 'ar' ? 'عملاء جدد' : 'New Customers'}</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(overview.newCustomers, locale)}</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                {overview.avgOrderChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${overview.avgOrderChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overview.avgOrderChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {formatNumber(Math.abs(Math.round(overview.avgOrderChange * 10) / 10), locale)}%
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-sm mb-1">{locale === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(overview.avgOrderValue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'الإيرادات اليومية' : 'Daily Revenue'}
              </h3>
              <BarChart2 className="w-5 h-5 text-slate-400" />
            </div>
            {dailyStats.length > 0 ? (
              <div className="space-y-3">
                {dailyStats.slice(-14).map((day) => (
                  <div key={day.date} className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 w-20">{formatDate(day.date, locale)}</span>
                    <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-end px-2"
                        style={{ width: `${(day.revenue / maxRevenue) * 100}%`, minWidth: day.revenue > 0 ? '60px' : '0' }}
                      >
                        {day.revenue > 0 && (
                          <span className="text-xs text-white font-medium">{formatCurrency(day.revenue, locale)}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-slate-600 w-16 text-end">{formatNumber(day.orders, locale)} {locale === 'ar' ? 'طلب' : 'orders'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <BarChart2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>{locale === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Providers */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  {locale === 'ar' ? 'أفضل المتاجر' : 'Top Providers'}
                </h3>
                <Store className="w-5 h-5 text-slate-400" />
              </div>
              {topProviders.length > 0 ? (
                <div className="space-y-4">
                  {topProviders.map((provider, index) => (
                    <div key={provider.id} className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-slate-600">{formatNumber(index + 1, locale)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {locale === 'ar' ? provider.name_ar : provider.name_en}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{formatNumber(provider.orders_count, locale)} {locale === 'ar' ? 'طلب' : 'orders'}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span>{formatNumber(provider.rating, locale)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="font-bold text-slate-900">{formatCurrency(provider.revenue, locale)}</p>
                        <p className="text-xs text-slate-500">{locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{locale === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
                </div>
              )}
            </div>

            {/* Category Stats */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  {locale === 'ar' ? 'حسب الفئة' : 'By Category'}
                </h3>
                <PieChart className="w-5 h-5 text-slate-400" />
              </div>
              {categoryStats.length > 0 ? (
                <div className="space-y-4">
                  {categoryStats.map((cat, index) => {
                    const colors = ['bg-primary', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-cyan-500']
                    const totalRevenue = categoryStats.reduce((sum, c) => sum + c.revenue, 0)
                    const percentage = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0
                    return (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                            <span className="font-medium text-slate-900">{getCategoryLabel(cat.category)}</span>
                          </div>
                          <span className="text-sm text-slate-600">{formatCurrency(cat.revenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors[index % colors.length]} rounded-full`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500">{formatNumber(cat.orders, locale)} {locale === 'ar' ? 'طلب' : 'orders'}</span>
                          <span className="text-xs text-slate-500">{formatNumber(Math.round(percentage * 10) / 10, locale)}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <PieChart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{locale === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
                </div>
              )}
            </div>
          </div>
        </main>
    </>
  )
}
