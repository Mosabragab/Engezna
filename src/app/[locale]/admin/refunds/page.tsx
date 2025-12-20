'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  ArrowLeftRight,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  DollarSign,
  User as UserIcon,
  Store,
  FileText,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Refund {
  id: string
  order_id: string
  customer_id: string
  provider_id: string
  amount: number
  reason: string
  reason_ar: string | null
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed'
  refund_method: string | null
  refund_type: string | null
  provider_action: string | null
  customer_confirmed: boolean
  confirmation_deadline: string | null
  escalated_to_admin: boolean
  provider_notes: string | null
  processed_amount: number
  processing_notes: string | null
  request_source: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  // Relations
  order?: { order_number: string; total: number }
  customer?: { full_name: string; phone: string }
  provider?: { name_ar: string; name_en: string }
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'processed' | 'failed' | 'escalated'

export default function AdminRefundsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [refunds, setRefunds] = useState<Refund[]>([])
  const [filteredRefunds, setFilteredRefunds] = useState<Refund[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [processingAction, setProcessingAction] = useState(false)

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    processed: 0,
    escalated: 0,
    totalAmount: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterRefunds()
  }, [refunds, searchQuery, statusFilter])

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
        await loadRefunds()
      }
    }

    setLoading(false)
  }

  async function loadRefunds() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          order:orders(order_number, total),
          customer:profiles!customer_id(full_name, phone),
          provider:providers(name_ar, name_en)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        setRefunds([])
        return
      }

      setRefunds(data || [])

      // Calculate stats
      const pending = (data || []).filter(r => r.status === 'pending').length
      const approved = (data || []).filter(r => r.status === 'approved').length
      const processed = (data || []).filter(r => r.status === 'processed').length
      const escalated = (data || []).filter(r => r.escalated_to_admin === true).length
      const totalAmount = (data || [])
        .filter(r => r.status === 'processed')
        .reduce((sum, r) => sum + (r.processed_amount || r.amount), 0)

      setStats({
        total: (data || []).length,
        pending,
        approved,
        processed,
        escalated,
        totalAmount,
      })
    } catch {
      setRefunds([])
    }
  }

  function filterRefunds() {
    let filtered = [...refunds]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        r.order?.order_number?.toLowerCase().includes(query) ||
        r.customer?.full_name?.toLowerCase().includes(query) ||
        r.provider?.name_ar?.toLowerCase().includes(query) ||
        r.reason?.toLowerCase().includes(query)
      )
    }

    if (statusFilter === 'escalated') {
      filtered = filtered.filter(r => r.escalated_to_admin === true)
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    setFilteredRefunds(filtered)
  }

  async function handleApprove(refund: Refund) {
    if (!user) return
    setProcessingAction(true)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('refunds')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', refund.id)

      if (error) throw error

      setShowDetailModal(false)
      setReviewNotes('')
      await loadRefunds()
    } catch {
      alert(locale === 'ar' ? 'حدث خطأ' : 'An error occurred')
    } finally {
      setProcessingAction(false)
    }
  }

  async function handleReject(refund: Refund) {
    if (!user || !reviewNotes.trim()) {
      alert(locale === 'ar' ? 'يجب إدخال سبب الرفض' : 'Rejection reason is required')
      return
    }
    setProcessingAction(true)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('refunds')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
        })
        .eq('id', refund.id)

      if (error) throw error

      setShowDetailModal(false)
      setReviewNotes('')
      await loadRefunds()
    } catch {
      alert(locale === 'ar' ? 'حدث خطأ' : 'An error occurred')
    } finally {
      setProcessingAction(false)
    }
  }

  async function handleProcess(refund: Refund) {
    if (!user) return
    setProcessingAction(true)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('refunds')
        .update({
          status: 'processed',
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          processed_amount: refund.amount,
          processing_notes: reviewNotes || null,
        })
        .eq('id', refund.id)

      if (error) throw error

      // Update order status
      await supabase
        .from('orders')
        .update({ payment_status: 'refunded' })
        .eq('id', refund.order_id)

      setShowDetailModal(false)
      setReviewNotes('')
      await loadRefunds()
    } catch {
      alert(locale === 'ar' ? 'حدث خطأ' : 'An error occurred')
    } finally {
      setProcessingAction(false)
    }
  }

  function openDetail(refund: Refund) {
    setSelectedRefund(refund)
    setReviewNotes('')
    setShowDetailModal(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            {locale === 'ar' ? 'في الانتظار' : 'Pending'}
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            <CheckCircle2 className="w-3 h-3" />
            {locale === 'ar' ? 'معتمد' : 'Approved'}
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            {locale === 'ar' ? 'مرفوض' : 'Rejected'}
          </span>
        )
      case 'processed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            {locale === 'ar' ? 'تم التنفيذ' : 'Processed'}
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            <AlertCircle className="w-3 h-3" />
            {locale === 'ar' ? 'فشل' : 'Failed'}
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <>
        <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="h-8 bg-slate-200 rounded animate-pulse w-48"></div>
        </div>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
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
              {locale === 'ar' ? 'طلبات الاسترداد' : 'Refund Requests'}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
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
        title={locale === 'ar' ? 'طلبات الاسترداد' : 'Refund Requests'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <ArrowLeftRight className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">{locale === 'ar' ? 'إجمالي الطلبات' : 'Total'}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-700">{locale === 'ar' ? 'في الانتظار' : 'Pending'}</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">{locale === 'ar' ? 'مصعّد للإدارة' : 'Escalated'}</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{stats.escalated}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">{locale === 'ar' ? 'معتمد' : 'Approved'}</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.approved}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">{locale === 'ar' ? 'تم التنفيذ' : 'Processed'}</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.processed}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-purple-700">{locale === 'ar' ? 'إجمالي المسترد' : 'Total Refunded'}</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.totalAmount, locale)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
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
              <option value="pending">{locale === 'ar' ? 'في الانتظار' : 'Pending'}</option>
              <option value="escalated">{locale === 'ar' ? 'مصعّد للإدارة' : 'Escalated'}</option>
              <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
              <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
              <option value="processed">{locale === 'ar' ? 'تم التنفيذ' : 'Processed'}</option>
              <option value="failed">{locale === 'ar' ? 'فشل' : 'Failed'}</option>
            </select>

            <Button
              variant="outline"
              onClick={() => loadRefunds()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Refunds Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المتجر' : 'Provider'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'السبب' : 'Reason'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRefunds.length > 0 ? (
                  filteredRefunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-slate-900">
                          #{refund.order?.order_number || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {refund.customer?.full_name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {locale === 'ar' ? refund.provider?.name_ar : refund.provider?.name_en || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-green-600">
                          {formatCurrency(refund.amount, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 line-clamp-1">
                          {refund.reason_ar || refund.reason || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">
                          {formatDate(refund.created_at, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(refund.status)}
                          {refund.escalated_to_admin && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3" />
                              {locale === 'ar' ? 'مصعّد' : 'Escalated'}
                            </span>
                          )}
                          {refund.provider_action && (
                            <span className="text-xs text-slate-500">
                              {refund.provider_action === 'cash_refund'
                                ? (locale === 'ar' ? 'رد نقدي' : 'Cash Refund')
                                : refund.provider_action === 'resend_item'
                                ? (locale === 'ar' ? 'إعادة إرسال' : 'Resend')
                                : refund.provider_action}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openDetail(refund)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title={locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">
                        {locale === 'ar' ? 'لا توجد طلبات استرداد' : 'No refund requests found'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {showDetailModal && selectedRefund && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'تفاصيل طلب الاسترداد' : 'Refund Request Details'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Order Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">
                    {locale === 'ar' ? 'معلومات الطلب' : 'Order Info'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">{locale === 'ar' ? 'رقم الطلب:' : 'Order #:'}</span>
                    <span className="font-mono font-medium mr-1">{selectedRefund.order?.order_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">{locale === 'ar' ? 'قيمة الطلب:' : 'Order Total:'}</span>
                    <span className="font-medium mr-1">{formatCurrency(selectedRefund.order?.total || 0, locale)}</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">
                    {locale === 'ar' ? 'العميل' : 'Customer'}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{selectedRefund.customer?.full_name}</p>
                <p className="text-sm text-slate-500">{selectedRefund.customer?.phone}</p>
              </div>

              {/* Provider Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">
                    {locale === 'ar' ? 'المتجر' : 'Provider'}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{selectedRefund.provider?.name_ar}</p>
              </div>

              {/* Refund Details */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-700">
                    {locale === 'ar' ? 'مبلغ الاسترداد' : 'Refund Amount'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(selectedRefund.amount, locale)}</p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'سبب الاسترداد' : 'Reason'}
                </label>
                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                  {selectedRefund.reason_ar || selectedRefund.reason}
                </div>
              </div>

              {/* Status & Additional Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">{locale === 'ar' ? 'الحالة:' : 'Status:'}</span>
                  {getStatusBadge(selectedRefund.status)}
                </div>

                {selectedRefund.escalated_to_admin && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">
                      {locale === 'ar' ? 'مصعّد للإدارة - العميل لم يستلم المبلغ' : 'Escalated - Customer did not receive refund'}
                    </span>
                  </div>
                )}

                {selectedRefund.provider_action && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{locale === 'ar' ? 'إجراء التاجر:' : 'Provider Action:'}</span>
                    <span className="text-sm font-medium text-slate-800">
                      {selectedRefund.provider_action === 'cash_refund'
                        ? (locale === 'ar' ? 'رد نقدي عبر المندوب' : 'Cash refund via rider')
                        : selectedRefund.provider_action === 'resend_item'
                        ? (locale === 'ar' ? 'إعادة إرسال المنتج' : 'Resend item')
                        : selectedRefund.provider_action === 'escalate_to_admin'
                        ? (locale === 'ar' ? 'تصعيد للإدارة' : 'Escalate to admin')
                        : selectedRefund.provider_action}
                    </span>
                  </div>
                )}

                {selectedRefund.provider_action === 'cash_refund' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{locale === 'ar' ? 'تأكيد العميل:' : 'Customer Confirmed:'}</span>
                    <span className={`text-sm font-medium ${selectedRefund.customer_confirmed ? 'text-green-600' : 'text-orange-600'}`}>
                      {selectedRefund.customer_confirmed
                        ? (locale === 'ar' ? 'تم الاستلام' : 'Received')
                        : (locale === 'ar' ? 'لم يؤكد بعد' : 'Not confirmed yet')}
                    </span>
                  </div>
                )}

                {selectedRefund.confirmation_deadline && !selectedRefund.customer_confirmed && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{locale === 'ar' ? 'مهلة التأكيد:' : 'Confirmation Deadline:'}</span>
                    <span className="text-sm text-slate-800">
                      {formatDate(selectedRefund.confirmation_deadline, locale)}
                    </span>
                  </div>
                )}
              </div>

              {/* Provider Notes */}
              {selectedRefund.provider_notes && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'ملاحظات التاجر' : 'Provider Notes'}
                  </label>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                    {selectedRefund.provider_notes}
                  </div>
                </div>
              )}

              {/* Review Notes (for pending/approved) */}
              {(selectedRefund.status === 'pending' || selectedRefund.status === 'approved') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'ملاحظات المراجعة' : 'Review Notes'}
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder={locale === 'ar' ? 'أدخل ملاحظاتك...' : 'Enter your notes...'}
                  />
                </div>
              )}

              {/* Previous Review Notes */}
              {selectedRefund.review_notes && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'ملاحظات سابقة' : 'Previous Notes'}
                  </label>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                    {selectedRefund.review_notes}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3 justify-end flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowDetailModal(false)}
              >
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </Button>

              {selectedRefund.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(selectedRefund)}
                    disabled={processingAction}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {locale === 'ar' ? 'رفض' : 'Reject'}
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedRefund)}
                    disabled={processingAction}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {locale === 'ar' ? 'اعتماد' : 'Approve'}
                  </Button>
                </>
              )}

              {selectedRefund.status === 'approved' && (
                <Button
                  onClick={() => handleProcess(selectedRefund)}
                  disabled={processingAction}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  {locale === 'ar' ? 'تنفيذ الاسترداد' : 'Process Refund'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
