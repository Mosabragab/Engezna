'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, AdminSidebar, GeoFilter, useGeoFilter } from '@/components/admin'
import type { GeoFilterValue } from '@/components/admin'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  Users,
  Search,
  Eye,
  RefreshCw,
  UserCheck,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  ShoppingCart,
  DollarSign,
  Ban,
  CheckCircle2,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Customer {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  avatar_url: string | null
  role: string
  is_verified: boolean
  is_banned: boolean
  created_at: string
  orders_count: number
  total_spent: number
  last_order_at: string | null
  governorate_id: string | null
  city_id: string | null
  district_id: string | null
}

type FilterStatus = 'all' | 'active' | 'banned' | 'new'

export default function AdminCustomersPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { geoFilter, setGeoFilter } = useGeoFilter()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    banned: 0,
    newToday: 0,
    totalOrders: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchQuery, statusFilter, geoFilter])

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
        await loadCustomers(supabase)
      }
    }

    setLoading(false)
  }

  async function loadCustomers(supabase: ReturnType<typeof createClient>) {
    const { data: customersData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading customers:', error)
      return
    }

    const customersWithOrders: Customer[] = await Promise.all(
      (customersData || []).map(async (customer) => {
        // Get orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('total, created_at, status')
          .eq('customer_id', customer.id)
          .eq('status', 'delivered')

        // Get address info
        const { data: addressData } = await supabase
          .from('customer_addresses')
          .select('governorate_id, city_id, district_id')
          .eq('customer_id', customer.id)
          .eq('is_default', true)
          .single()

        const orders = ordersData || []
        const orders_count = orders.length
        const total_spent = orders.reduce((sum, o) => sum + (o.total || 0), 0)
        const last_order_at = orders.length > 0
          ? orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
          : null

        return {
          ...customer,
          is_banned: customer.is_banned || false,
          orders_count,
          total_spent,
          last_order_at,
          governorate_id: addressData?.governorate_id || null,
          city_id: addressData?.city_id || null,
          district_id: addressData?.district_id || null,
        }
      })
    )

    setCustomers(customersWithOrders)
  }

  function filterCustomers() {
    let filtered = [...customers]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.full_name?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.email?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'banned') {
        filtered = filtered.filter(c => c.is_banned)
      } else if (statusFilter === 'active') {
        filtered = filtered.filter(c => !c.is_banned)
      } else if (statusFilter === 'new') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        filtered = filtered.filter(c => new Date(c.created_at) >= today)
      }
    }

    // Geographic filter
    if (geoFilter.governorate_id || geoFilter.city_id || geoFilter.district_id) {
      filtered = filtered.filter(c => {
        if (geoFilter.district_id && c.district_id) {
          return c.district_id === geoFilter.district_id
        }
        if (geoFilter.city_id && c.city_id) {
          return c.city_id === geoFilter.city_id
        }
        if (geoFilter.governorate_id && c.governorate_id) {
          return c.governorate_id === geoFilter.governorate_id
        }
        return true
      })
    }

    setFilteredCustomers(filtered)

    // Update stats based on filtered results
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const newToday = filtered.filter(c => new Date(c.created_at) >= today).length
    const banned = filtered.filter(c => c.is_banned).length
    const active = filtered.filter(c => !c.is_banned).length
    const totalOrders = filtered.reduce((sum, c) => sum + c.orders_count, 0)
    const totalRevenue = filtered.reduce((sum, c) => sum + c.total_spent, 0)

    setStats({
      total: filtered.length,
      active,
      banned,
      newToday,
      totalOrders,
      totalRevenue,
    })
  }

  async function handleBanCustomer(customerId: string, ban: boolean) {
    setActionLoading(customerId)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: ban })
      .eq('id', customerId)

    if (!error) {
      setCustomers(prev => prev.map(c =>
        c.id === customerId ? { ...c, is_banned: ban } : c
      ))
    }

    setActionLoading(null)
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
          title={locale === 'ar' ? 'إدارة العملاء' : 'Customers Management'}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">{locale === 'ar' ? 'نشط' : 'Active'}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatNumber(stats.active, locale)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-3 mb-2">
                <Ban className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700">{locale === 'ar' ? 'محظور' : 'Banned'}</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{formatNumber(stats.banned, locale)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-700">{locale === 'ar' ? 'جدد اليوم' : 'New Today'}</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{formatNumber(stats.newToday, locale)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-purple-700">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{formatNumber(stats.totalOrders, locale)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-emerald-700">{locale === 'ar' ? 'إجمالي الإنفاق' : 'Total Spent'}</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(stats.totalRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col gap-4">
              {/* Row 1: Search & Status */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'بحث بالاسم أو الهاتف أو البريد الإلكتروني...' : 'Search by name, phone or email...'}
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
                  <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                  <option value="banned">{locale === 'ar' ? 'محظور' : 'Banned'}</option>
                  <option value="new">{locale === 'ar' ? 'جدد اليوم' : 'New Today'}</option>
                </select>

                <Button
                  variant="outline"
                  onClick={() => {
                    const supabase = createClient()
                    loadCustomers(supabase)
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

          {/* Customers Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الهاتف' : 'Phone'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'البريد' : 'Email'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الطلبات' : 'Orders'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'إجمالي الإنفاق' : 'Total Spent'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'آخر طلب' : 'Last Order'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'التسجيل' : 'Joined'}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                              {customer.avatar_url ? (
                                <img src={customer.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-semibold text-slate-600">
                                  {customer.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{customer.full_name || (locale === 'ar' ? 'بدون اسم' : 'No name')}</p>
                              {customer.is_verified && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {locale === 'ar' ? 'موثق' : 'Verified'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {customer.phone || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="truncate max-w-[150px]">{customer.email || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {customer.is_banned ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                              <Ban className="w-3 h-3" />
                              {locale === 'ar' ? 'محظور' : 'Banned'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              {locale === 'ar' ? 'نشط' : 'Active'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-900">{formatNumber(customer.orders_count, locale)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{formatCurrency(customer.total_spent, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">
                            {customer.last_order_at ? formatDate(customer.last_order_at, locale) : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {formatDate(customer.created_at, locale)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link href={`/${locale}/admin/customers/${customer.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="w-4 h-4 text-slate-500" />
                              </Button>
                            </Link>
                            {customer.is_banned ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleBanCustomer(customer.id, false)}
                                disabled={actionLoading === customer.id}
                              >
                                {actionLoading === customer.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleBanCustomer(customer.id, true)}
                                disabled={actionLoading === customer.id}
                              >
                                {actionLoading === customer.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا يوجد عملاء مطابقين' : 'No matching customers found'}
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
