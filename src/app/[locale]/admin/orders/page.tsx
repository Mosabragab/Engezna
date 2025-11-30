'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, AdminSidebar, GeoFilter, useGeoFilter } from '@/components/admin'
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

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [dateFilter, setDateFilter] = useState<string>('')
  const { geoFilter, setGeoFilter } = useGeoFilter()
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
        await loadOrders(supabase)
      }
    }

    setLoading(false)
  }

  async function loadOrders(supabase: ReturnType<typeof createClient>) {
    const { data } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total,
        subtotal,
        delivery_fee,
        platform_commission,
        payment_method,
        payment_status,
        created_at,
        delivered_at,
        customer:profiles!orders_customer_id_fkey(id, full_name, phone),
        provider:providers(id, name_ar, name_en, governorate_id, city_id, district_id)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setOrders(data as unknown as Order[])

      const pending = data.filter(o => o.status === 'pending').length
      const inProgress = data.filter(o => ['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)).length
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

    // Geographic filter
    if (geoFilter.governorate_id || geoFilter.city_id || geoFilter.district_id) {
      filtered = filtered.filter(o => {
        if (geoFilter.district_id && o.provider?.district_id) {
          return o.provider.district_id === geoFilter.district_id
        }
        if (geoFilter.city_id && o.provider?.city_id) {
          return o.provider.city_id === geoFilter.city_id
        }
        if (geoFilter.governorate_id && o.provider?.governorate_id) {
          return o.provider.governorate_id === geoFilter.governorate_id
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'إدارة الطلبات' : 'Orders Management'}
          onMenuClick={() => setSidebarOpen(true)}
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
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-700">{locale === 'ar' ? 'معلق' : 'Pending'}</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{formatNumber(stats.pending, locale)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-700">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{formatNumber(stats.inProgress, locale)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">{locale === 'ar' ? 'مكتمل' : 'Delivered'}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatNumber(stats.delivered, locale)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{formatNumber(stats.cancelled, locale)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-emerald-700">{locale === 'ar' ? 'الإيرادات' : 'Revenue'}</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(stats.totalRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
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
                  onClick={() => {
                    const supabase = createClient()
                    loadOrders(supabase)
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {locale === 'ar' ? 'تحديث' : 'Refresh'}
                </Button>
              </div>

              {/* Row 2: Geographic Filter */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <span className="text-sm text-slate-500">{locale === 'ar' ? 'فلترة جغرافية:' : 'Geographic Filter:'}</span>
                <GeoFilter
                  value={geoFilter}
                  onChange={setGeoFilter}
                  showDistrict={true}
                />
              </div>
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
      </div>
    </div>
  )
}
