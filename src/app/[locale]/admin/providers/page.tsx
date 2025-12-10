'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar, GeoFilter, useGeoFilter } from '@/components/admin'
import { formatNumber, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  Store,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  PauseCircle,
  PlayCircle,
  Star,
  Phone,
  RefreshCw,
  X,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Provider {
  id: string
  name_ar: string
  name_en: string
  category: string
  status: string
  phone: string
  address_ar: string
  rating: number
  total_reviews: number
  total_orders: number
  commission_rate: number
  created_at: string
  logo_url: string | null
  governorate_id: string | null
  city_id: string | null
  district_id: string | null
}

type FilterStatus = 'all' | 'open' | 'closed' | 'pending_approval' | 'temporarily_paused'

export default function AdminProvidersPage() {
  const locale = useLocale()
  const searchParams = useSearchParams()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [providers, setProviders] = useState<Provider[]>([])
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const { geoFilter, setGeoFilter } = useGeoFilter()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    paused: 0,
  })

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    providerId: string;
    providerName: string;
    action: 'approve' | 'reject' | 'pause' | 'resume';
    newStatus: string;
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'pending') {
      setStatusFilter('pending_approval')
    }
  }, [searchParams])

  useEffect(() => {
    filterProviders()
  }, [providers, searchQuery, statusFilter, categoryFilter, geoFilter])

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
        await loadProviders(supabase)
      }
    }

    setLoading(false)
  }

  async function loadProviders(supabase: ReturnType<typeof createClient>) {
    const { data } = await supabase
      .from('providers')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setProviders(data)

      const active = data.filter(p => ['open', 'closed'].includes(p.status)).length
      const pending = data.filter(p => p.status === 'pending_approval').length
      const paused = data.filter(p => p.status === 'temporarily_paused').length

      setStats({
        total: data.length,
        active,
        pending,
        paused,
      })
    }
  }

  function filterProviders() {
    let filtered = [...providers]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name_ar.toLowerCase().includes(query) ||
        p.name_en.toLowerCase().includes(query) ||
        p.phone.includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter)
    }

    // Geographic filter
    if (geoFilter.governorate_id || geoFilter.city_id || geoFilter.district_id) {
      filtered = filtered.filter(p => {
        if (geoFilter.district_id && p.district_id) {
          return p.district_id === geoFilter.district_id
        }
        if (geoFilter.city_id && p.city_id) {
          return p.city_id === geoFilter.city_id
        }
        if (geoFilter.governorate_id && p.governorate_id) {
          return p.governorate_id === geoFilter.governorate_id
        }
        return true
      })
    }

    // Recalculate stats based on filtered data
    const active = filtered.filter(p => ['open', 'closed'].includes(p.status)).length
    const pending = filtered.filter(p => p.status === 'pending_approval').length
    const paused = filtered.filter(p => p.status === 'temporarily_paused').length

    setStats({
      total: filtered.length,
      active,
      pending,
      paused,
    })

    setFilteredProviders(filtered)
  }

  function openConfirmModal(provider: Provider, action: 'approve' | 'reject' | 'pause' | 'resume', newStatus: string) {
    setConfirmAction({
      providerId: provider.id,
      providerName: locale === 'ar' ? provider.name_ar : provider.name_en,
      action,
      newStatus,
    })
    setRejectionReason('')
    setShowConfirmModal(true)
  }

  async function executeStatusChange() {
    if (!confirmAction) return

    setActionLoading(true)

    try {
      let result;

      // Use API routes for proper audit logging
      if (confirmAction.action === 'approve') {
        const response = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            providerId: confirmAction.providerId,
          }),
        });
        result = await response.json();
      } else if (confirmAction.action === 'reject') {
        const response = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reject',
            providerId: confirmAction.providerId,
            reason: rejectionReason || 'لم يتم تحديد السبب',
          }),
        });
        result = await response.json();
      } else if (confirmAction.action === 'pause') {
        const response = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'suspend',
            providerId: confirmAction.providerId,
            reason: rejectionReason || 'إيقاف مؤقت',
          }),
        });
        result = await response.json();
      } else {
        // resume/reactivate
        const response = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reactivate',
            providerId: confirmAction.providerId,
          }),
        });
        result = await response.json();
      }

      if (result.success) {
        const supabase = createClient()
        await loadProviders(supabase)
      } else {
        console.error('Operation failed:', result.error)
      }
    } catch (error) {
      console.error('Error executing status change:', error)
    }

    setActionLoading(false)
    setShowConfirmModal(false)
    setConfirmAction(null)
  }

  function getActionConfig(action: 'approve' | 'reject' | 'pause' | 'resume') {
    const configs = {
      approve: {
        title: { ar: 'تأكيد قبول المتجر', en: 'Confirm Approval' },
        message: { ar: 'هل تريد قبول هذا المتجر؟ سيتمكن من البدء في استقبال الطلبات فوراً.', en: 'Approve this provider? They will be able to start receiving orders immediately.' },
        confirmText: { ar: 'قبول', en: 'Approve' },
        color: 'bg-green-600 hover:bg-green-700',
        icon: CheckCircle2,
        iconColor: 'text-green-600',
      },
      reject: {
        title: { ar: 'تأكيد رفض المتجر', en: 'Confirm Rejection' },
        message: { ar: 'هل تريد رفض هذا المتجر؟ سيتم إخطار صاحب المتجر بالقرار.', en: 'Reject this provider? The owner will be notified of this decision.' },
        confirmText: { ar: 'رفض', en: 'Reject' },
        color: 'bg-red-600 hover:bg-red-700',
        icon: XCircle,
        iconColor: 'text-red-600',
      },
      pause: {
        title: { ar: 'تأكيد إيقاف المتجر', en: 'Confirm Suspension' },
        message: { ar: 'هل تريد إيقاف هذا المتجر مؤقتاً؟ لن يتمكن من استقبال طلبات جديدة.', en: 'Suspend this provider temporarily? They won\'t be able to receive new orders.' },
        confirmText: { ar: 'إيقاف', en: 'Suspend' },
        color: 'bg-yellow-600 hover:bg-yellow-700',
        icon: PauseCircle,
        iconColor: 'text-yellow-600',
      },
      resume: {
        title: { ar: 'تأكيد تفعيل المتجر', en: 'Confirm Reactivation' },
        message: { ar: 'هل تريد إعادة تفعيل هذا المتجر؟ سيتمكن من استقبال الطلبات مرة أخرى.', en: 'Reactivate this provider? They will be able to receive orders again.' },
        confirmText: { ar: 'تفعيل', en: 'Activate' },
        color: 'bg-green-600 hover:bg-green-700',
        icon: PlayCircle,
        iconColor: 'text-green-600',
      },
    }
    return configs[action]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700'
      case 'closed': return 'bg-slate-100 text-slate-700'
      case 'pending_approval': return 'bg-amber-100 text-amber-700'
      case 'temporarily_paused': return 'bg-yellow-100 text-yellow-700'
      case 'on_vacation': return 'bg-blue-100 text-blue-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      open: { ar: 'مفتوح', en: 'Open' },
      closed: { ar: 'مغلق', en: 'Closed' },
      pending_approval: { ar: 'قيد المراجعة', en: 'Pending' },
      temporarily_paused: { ar: 'متوقف مؤقتاً', en: 'Paused' },
      on_vacation: { ar: 'في إجازة', en: 'On Vacation' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  // Updated December 2025 - New categories
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      restaurant_cafe: { ar: 'مطاعم وكافيهات', en: 'Restaurants & Cafes' },
      coffee_patisserie: { ar: 'البن والحلويات', en: 'Coffee & Patisserie' },
      grocery: { ar: 'سوبر ماركت', en: 'Supermarket' },
      vegetables_fruits: { ar: 'خضروات وفواكه', en: 'Fruits & Vegetables' },
      // Legacy support
      restaurant: { ar: 'مطعم', en: 'Restaurant' },
      coffee_shop: { ar: 'كافيه', en: 'Coffee Shop' },
    }
    return labels[category]?.[locale === 'ar' ? 'ar' : 'en'] || category
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
              {locale === 'ar' ? 'إدارة المتاجر' : 'Providers Management'}
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
        title={locale === 'ar' ? 'إدارة المتاجر' : 'Providers Management'}
        onMenuClick={toggleSidebar}
        notificationCount={stats.pending}
      />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Store className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'إجمالي المتاجر' : 'Total Providers'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">{locale === 'ar' ? 'نشط' : 'Active'}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatNumber(stats.active, locale)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-700">{locale === 'ar' ? 'قيد المراجعة' : 'Pending'}</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{formatNumber(stats.pending, locale)}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center gap-3 mb-2">
                <PauseCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-700">{locale === 'ar' ? 'متوقف' : 'Paused'}</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{formatNumber(stats.paused, locale)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="open">{locale === 'ar' ? 'مفتوح' : 'Open'}</option>
                <option value="closed">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
                <option value="pending_approval">{locale === 'ar' ? 'قيد المراجعة' : 'Pending'}</option>
                <option value="temporarily_paused">{locale === 'ar' ? 'متوقف مؤقتاً' : 'Paused'}</option>
              </select>

              {/* Category Filter - Updated December 2025 */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
                <option value="restaurant_cafe">{locale === 'ar' ? 'مطاعم وكافيهات' : 'Restaurants & Cafes'}</option>
                <option value="coffee_patisserie">{locale === 'ar' ? 'البن والحلويات' : 'Coffee & Patisserie'}</option>
                <option value="grocery">{locale === 'ar' ? 'سوبر ماركت' : 'Supermarket'}</option>
                <option value="vegetables_fruits">{locale === 'ar' ? 'خضروات وفواكه' : 'Fruits & Vegetables'}</option>
              </select>

              {/* Geographic Filter */}
              <GeoFilter
                value={geoFilter}
                onChange={setGeoFilter}
                showDistrict={true}
                inline={true}
                showClearButton={true}
              />

              {/* Refresh */}
              <Button
                variant="outline"
                onClick={() => {
                  const supabase = createClient()
                  loadProviders(supabase)
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Providers Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'المتجر' : 'Provider'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الفئة' : 'Category'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'التقييم' : 'Rating'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الطلبات' : 'Orders'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'العمولة' : 'Commission'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'تاريخ الانضمام' : 'Joined'}
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProviders.length > 0 ? (
                    filteredProviders.map((provider) => (
                      <tr key={provider.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {provider.logo_url ? (
                                <img src={provider.logo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Store className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {locale === 'ar' ? provider.name_ar : provider.name_en}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {provider.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{getCategoryLabel(provider.category)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(provider.status)}`}>
                            {getStatusLabel(provider.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-sm text-slate-700">{formatNumber(provider.rating || 0, locale)}</span>
                            <span className="text-xs text-slate-400">({formatNumber(provider.total_reviews || 0, locale)})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{formatNumber(provider.total_orders || 0, locale)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{formatNumber(provider.commission_rate, locale)}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">{formatDate(provider.created_at, locale)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/${locale}/admin/providers/${provider.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="w-4 h-4 text-slate-500" />
                              </Button>
                            </Link>

                            {provider.status === 'pending_approval' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openConfirmModal(provider, 'approve', 'open')}
                                  title={locale === 'ar' ? 'قبول' : 'Approve'}
                                >
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openConfirmModal(provider, 'reject', 'rejected')}
                                  title={locale === 'ar' ? 'رفض' : 'Reject'}
                                >
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
                            )}

                            {['open', 'closed'].includes(provider.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openConfirmModal(provider, 'pause', 'temporarily_paused')}
                                title={locale === 'ar' ? 'إيقاف مؤقت' : 'Pause'}
                              >
                                <PauseCircle className="w-4 h-4 text-yellow-500" />
                              </Button>
                            )}

                            {provider.status === 'temporarily_paused' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openConfirmModal(provider, 'resume', 'open')}
                                title={locale === 'ar' ? 'إعادة تفعيل' : 'Resume'}
                              >
                                <PlayCircle className="w-4 h-4 text-green-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد متاجر مطابقة' : 'No matching providers found'}
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

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            {(() => {
              const config = getActionConfig(confirmAction.action)
              const ActionIcon = config.icon
              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900">
                      {config.title[locale === 'ar' ? 'ar' : 'en']}
                    </h2>
                    <button
                      onClick={() => { setShowConfirmModal(false); setConfirmAction(null); }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="mb-6">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      confirmAction.action === 'approve' || confirmAction.action === 'resume' ? 'bg-green-100' :
                      confirmAction.action === 'reject' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <ActionIcon className={`w-8 h-8 ${config.iconColor}`} />
                    </div>
                    <p className="text-center text-slate-700 font-medium mb-2">
                      {confirmAction.providerName}
                    </p>
                    <p className="text-center text-slate-600 text-sm">
                      {config.message[locale === 'ar' ? 'ar' : 'en']}
                    </p>
                  </div>

                  {/* Rejection reason field */}
                  {(confirmAction.action === 'reject' || confirmAction.action === 'pause') && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'السبب (اختياري)' : 'Reason (optional)'}
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder={locale === 'ar' ? 'أدخل سبب القرار...' : 'Enter reason for this decision...'}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { setShowConfirmModal(false); setConfirmAction(null); }}
                      className="flex-1"
                      disabled={actionLoading}
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      onClick={executeStatusChange}
                      className={`flex-1 ${config.color}`}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ActionIcon className="w-4 h-4 me-2" />
                          {config.confirmText[locale === 'ar' ? 'ar' : 'en']}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}
