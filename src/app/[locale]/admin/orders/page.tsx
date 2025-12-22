'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar, GeoFilter, useAdminGeoFilter } from '@/components/admin'
import type { GeoFilterValue } from '@/components/admin'
import { formatNumber, formatCurrency, formatDateTime } from '@/lib/utils/formatters'
import {
  Shield,
  ShoppingBag,
  Search,
  Eye,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  subtotal: number
  delivery_fee: number
  platform_commission: number
  payment_method: string
  payment_status: string
  created_at: string
  delivered_at: string | null
  customer: { id: string; full_name: string; phone: string } | null
  provider: { id: string; name_ar: string; name_en: string; governorate_id: string | null; city_id: string | null; district_id: string | null } | null
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected'

export default function AdminOrdersPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)

  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [dateFilter, setDateFilter] = useState<string>('')
  const { geoFilter, setGeoFilter, isRegionalAdmin } = useAdminGeoFilter()
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery, statusFilter, dateFilter, geoFilter])

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
        setLoading(false) // Show page immediately
        loadOrders()      // Load data in background
        return
      }
    }

    setLoading(false)
  }

  async function loadOrders() {
    setDataLoading(true)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          filters: { limit: 100 }
        }),
      })
      const result = await response.json()

      if (result.success && result.data) {
        const data = result.data.data as Order[]
        setOrders(data)

        const pending = data.filter(o => o.status === 'pending').length
        const inProgress = data.filter(o => ['accepted', 'preparing', 'ready', 'out_for_delivery', 'confirmed', 'delivering'].includes(o.status)).length
        const delivered = data.filter(o => o.status === 'delivered').length
        const cancelled = data.filter(o => ['cancelled', 'rejected'].includes(o.status)).length
        const totalRevenue = data.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0)

        setStats({
          total: data.length,
          pending,
          inProgress,
          delivered,
          cancelled,
          totalRevenue,
        })
      }
    } catch {
      // Error handled silently
    } finally {
      setDataLoading(false)
    }
  }

  function filterOrders() {
    let filtered = [...orders]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(query) ||
        o.customer?.full_name?.toLowerCase().includes(query) ||
        o.customer?.phone?.includes(query) ||
        (locale === 'ar' ? o.provider?.name_ar : o.provider?.name_en)?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter)
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.created_at)
        return orderDate.toDateString() === filterDate.toDateString()
      })
    }

    // Geographic filter - for regional admins, strictly filter by their region
    if (geoFilter.governorate_id || geoFilter.city_id || geoFilter.district_id) {
      filtered = filtered.filter(o => {
        // District filter (most specific)
        if (geoFilter.district_id) {
          return o.provider?.district_id === geoFilter.district_id
        }
        // City filter
        if (geoFilter.city_id) {
          return o.provider?.city_id === geoFilter.city_id
        }
        // Governorate filter
        if (geoFilter.governorate_id) {
          return o.provider?.governorate_id === geoFilter.governorate_id
        }
        return true
      })
    }

    setFilteredOrders(filtered)

    // Recalculate stats based on filtered results
    const pending = filtered.filter(o => o.status === 'pending').length
    const inProgress = filtered.filter(o => ['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)).length
    const delivered = filtered.filter(o => o.status === 'delivered').length
    const cancelled = filtered.filter(o => ['cancelled', 'rejected'].includes(o.status)).length
    const totalRevenue = filtered.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0)

    setStats({
      total: filtered.length,
      pending,
      inProgress,
      delivered,
      cancelled,
      totalRevenue,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'accepted': case 'preparing': return 'bg-blue-100 text-blue-700'
      case 'ready': return 'bg-cyan-100 text-cyan-700'
      case 'out_for_delivery': return 'bg-purple-100 text-purple-700'
      case 'cancelled': case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'accepted': case 'preparing': return <Package className="w-4 h-4" />
      case 'ready': return <Package className="w-4 h-4" />
      case 'out_for_delivery': return <Truck className="w-4 h-4" />
      case 'cancelled': case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      accepted: { ar: 'مقبول', en: 'Accepted' },
      preparing: { ar: 'قيد التحضير', en: 'Preparing' },
      ready: { ar: 'جاهز', en: 'Ready' },
      out_for_delivery: { ar: 'في الطريق', en: 'Out for Delivery' },
      delivered: { ar: 'تم التسليم', en: 'Delivered' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
      rejected: { ar: 'مرفوض', en: 'Rejected' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  if (loading) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          </div>
        </main>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h2 className="text-lg font-semibold text-slate-800">
              {locale === 'ar' ? 'إدارة الطلبات' : 'Orders Management'}
            </h2>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="flex items-center justify-center h-64">
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
        </main>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'إدارة الطلبات' : 'Orders Management'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBag className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
            </div>
            <div className="bg-card-bg-warning rounded-xl p-4 border border-warning/30">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-warning" />
                <span className="text-sm text-warning">{locale === 'ar' ? 'معلق' : 'Pending'}</span>
              </div>
              <p className="text-2xl font-bold text-warning">{formatNumber(stats.pending, locale)}</p>
            </div>
            <div className="bg-card-bg-primary rounded-xl p-4 border border-primary/30">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatNumber(stats.inProgress, locale)}</p>
            </div>
            <div className="bg-card-bg-success rounded-xl p-4 border border-success/30">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm text-success">{locale === 'ar' ? 'مكتمل' : 'Delivered'}</span>
              </div>
              <p className="text-2xl font-bold text-success">{formatNumber(stats.delivered, locale)}</p>
            </div>
            <div className="bg-card-bg-error rounded-xl p-4 border border-error/30">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-error" />
                <span className="text-sm text-error">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</span>
              </div>
              <p className="text-2xl font-bold text-error">{formatNumber(stats.cancelled, locale)}</p>
            </div>
            <div className="bg-card-bg-emerald rounded-xl p-4 border border-emerald/30">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-emerald" />
                <span className="text-sm text-emerald">{locale === 'ar' ? 'الإيرادات' : 'Revenue'}</span>
              </div>
              <p className="text-xl font-bold text-emerald">{formatCurrency(stats.totalRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col gap-4">
              {/* Row 1: Search & Status & Date */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'بحث برقم الطلب أو اسم العميل...' : 'Search by order number or customer...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                  <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
                  <option value="accepted">{locale === 'ar' ? 'مقبول' : 'Accepted'}</option>
                  <option value="preparing">{locale === 'ar' ? 'قيد التحضير' : 'Preparing'}</option>
                  <option value="ready">{locale === 'ar' ? 'جاهز' : 'Ready'}</option>
                  <option value="out_for_delivery">{locale === 'ar' ? 'في الطريق' : 'Out for Delivery'}</option>
                  <option value="delivered">{locale === 'ar' ? 'تم التسليم' : 'Delivered'}</option>
                  <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                </select>

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />

                <Button
                  variant="outline"
                  onClick={() => loadOrders()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {locale === 'ar' ? 'تحديث' : 'Refresh'}
                </Button>
              </div>

              {/* Row 2: Geographic Filter - Only show for non-regional admins */}
              {!isRegionalAdmin && (
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <span className="text-sm text-slate-500">{locale === 'ar' ? 'فلترة جغرافية:' : 'Geographic Filter:'}</span>
                  <GeoFilter
                    value={geoFilter}
                    onChange={setGeoFilter}
                    showDistrict={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المتجر' : 'Provider'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العمولة' : 'Commission'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الدفع' : 'Payment'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'عرض' : 'View'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-slate-900">#{order.order_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{order.customer?.full_name || '-'}</p>
                            <p className="text-xs text-slate-500">{order.customer?.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {locale === 'ar' ? order.provider?.name_ar : order.provider?.name_en}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{formatCurrency(order.total, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{formatCurrency(order.platform_commission || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-slate-600 capitalize">{order.payment_method}</p>
                            <span className={`text-xs ${order.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {order.payment_status === 'completed' ? (locale === 'ar' ? 'مدفوع' : 'Paid') : (locale === 'ar' ? 'معلق' : 'Pending')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">{formatDateTime(order.created_at, locale)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link href={`/${locale}/admin/orders/${order.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4 text-slate-500" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد طلبات مطابقة' : 'No matching orders found'}
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
