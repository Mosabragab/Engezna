'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProviderLayout } from '@/components/provider'
import {
  RefreshCw,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Loader2,
  Phone,
  MapPin,
  Send,
  Ban,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import Link from 'next/link'

interface Refund {
  id: string
  order_id: string
  customer_id: string
  amount: number
  reason: string
  reason_ar: string | null
  issue_type: string | null
  status: string
  provider_action: string
  customer_confirmed: boolean
  confirmation_deadline: string | null
  evidence_images: string[] | null
  created_at: string
  order?: {
    order_number: string
    total: number
    delivery_address: {
      full_name?: string
      phone?: string
      address?: string
    } | null
  }
  customer?: {
    full_name: string
    phone: string
  }
}

const ISSUE_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  missing_items: { ar: 'أصناف ناقصة', en: 'Missing items' },
  wrong_items: { ar: 'أصناف خاطئة', en: 'Wrong items' },
  quality_issue: { ar: 'مشكلة في الجودة', en: 'Quality issue' },
  never_received: { ar: 'لم يستلم الطلب', en: 'Never received' },
  other: { ar: 'مشكلة أخرى', en: 'Other issue' },
}

const STATUS_CONFIG: Record<string, { label_ar: string; label_en: string; color: string }> = {
  pending: { label_ar: 'جديد', label_en: 'New', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved: { label_ar: 'تمت الموافقة', label_en: 'Approved', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  rejected: { label_ar: 'مرفوض', label_en: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200' },
  processed: { label_ar: 'مكتمل', label_en: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
}

export default function ProviderRefundsPage() {
  const locale = useLocale()
  const isArabic = locale === 'ar'

  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pending')

  // Stats
  const pendingCount = refunds.filter(r => r.status === 'pending').length
  const approvedCount = refunds.filter(r => r.status === 'approved' || r.provider_action === 'cash_refund').length
  const completedCount = refunds.filter(r => r.status === 'processed' && r.customer_confirmed).length

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()

    // Get current user's provider
    const { data: { user } } = await supabase.auth.getUser()
    console.log('🔍 DEBUG - Current user:', user?.id, user?.email)
    if (!user) {
      console.log('❌ DEBUG - No user logged in!')
      setLoading(false)
      return
    }

    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    console.log('🔍 DEBUG - Provider lookup:', { provider, providerError, owner_id: user.id })

    if (!provider) {
      console.log('❌ DEBUG - No provider found for user!')
      setLoading(false)
      return
    }
    setProviderId(provider.id)

    // Fetch refunds
    // Note: Using !customer_id to specify the exact foreign key relationship
    // since refunds has multiple FKs to profiles (customer_id, requested_by, reviewed_by, processed_by)
    const { data: refundsData, error: refundsError } = await supabase
      .from('refunds')
      .select(`
        *,
        order:orders(order_number, total, delivery_address),
        customer:profiles!customer_id(full_name, phone)
      `)
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })

    console.log('🔍 DEBUG - Refunds query:', {
      provider_id: provider.id,
      refundsCount: refundsData?.length,
      refundsError,
      refundsData
    })

    if (refundsData) {
      setRefunds(refundsData.map(r => ({
        ...r,
        order: r.order as Refund['order'],
        customer: r.customer as Refund['customer'],
      })))
    }

    setLoading(false)
  }

  // Handle cash refund action
  async function handleCashRefund(refundId: string) {
    setActionLoading(refundId)
    const supabase = createClient()

    try {
      // Use the helper function
      const { error } = await supabase.rpc('provider_respond_to_refund', {
        p_refund_id: refundId,
        p_action: 'cash_refund',
        p_notes: null
      })

      if (error) {
        // Fallback to direct update
        await supabase.from('refunds').update({
          provider_action: 'cash_refund',
          status: 'approved',
          provider_responded_at: new Date().toISOString(),
          confirmation_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        }).eq('id', refundId)
      }

      await loadData()
    } catch (err) {
      console.error('Error processing refund:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle item resend
  async function handleItemResend(refundId: string) {
    setActionLoading(refundId)
    const supabase = createClient()

    try {
      const { error } = await supabase.rpc('provider_respond_to_refund', {
        p_refund_id: refundId,
        p_action: 'item_resend',
        p_notes: null
      })

      if (error) {
        await supabase.from('refunds').update({
          provider_action: 'item_resend',
          status: 'approved',
          provider_responded_at: new Date().toISOString(),
          affects_settlement: false
        }).eq('id', refundId)
      }

      await loadData()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle escalate to admin
  async function handleEscalate(refundId: string) {
    setActionLoading(refundId)
    const supabase = createClient()

    try {
      const { error } = await supabase.rpc('provider_respond_to_refund', {
        p_refund_id: refundId,
        p_action: 'escalated',
        p_notes: 'Provider requested admin review'
      })

      if (error) {
        await supabase.from('refunds').update({
          provider_action: 'escalated',
          escalated_to_admin: true,
          escalation_reason: 'Provider requested admin review'
        }).eq('id', refundId)
      }

      await loadData()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: isArabic ? ar : enUS,
    })
  }

  const filterRefunds = (tab: string) => {
    switch (tab) {
      case 'pending':
        return refunds.filter(r => r.status === 'pending' && r.provider_action === 'pending')
      case 'in_progress':
        return refunds.filter(r =>
          (r.status === 'approved' && !r.customer_confirmed) ||
          r.provider_action === 'item_resend'
        )
      case 'completed':
        return refunds.filter(r => r.status === 'processed' || r.customer_confirmed)
      default:
        return refunds
    }
  }

  if (loading) {
    return (
      <ProviderLayout
        pageTitle={{ ar: 'طلبات الاسترداد', en: 'Refund Requests' }}
        pageSubtitle={{ ar: 'إدارة طلبات الاسترداد من العملاء', en: 'Manage customer refund requests' }}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ProviderLayout>
    )
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'طلبات الاسترداد', en: 'Refund Requests' }}
      pageSubtitle={{ ar: 'إدارة طلبات الاسترداد من العملاء', en: 'Manage customer refund requests' }}
    >
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isArabic ? 'طلبات الاسترداد' : 'Refund Requests'}
          </h1>
          <p className="text-slate-500">
            {isArabic ? 'إدارة طلبات الاسترداد من العملاء' : 'Manage customer refund requests'}
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {isArabic ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
              <p className="text-sm text-yellow-600">
                {isArabic ? 'بانتظار ردك' : 'Pending Your Action'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{approvedCount}</p>
              <p className="text-sm text-blue-600">
                {isArabic ? 'قيد التنفيذ' : 'In Progress'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{completedCount}</p>
              <p className="text-sm text-green-600">
                {isArabic ? 'مكتمل' : 'Completed'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="pending" className="relative">
            {isArabic ? 'جديدة' : 'New'}
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            {isArabic ? 'قيد التنفيذ' : 'In Progress'}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {isArabic ? 'مكتملة' : 'Completed'}
          </TabsTrigger>
        </TabsList>

        {['pending', 'in_progress', 'completed'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            {filterRefunds(tab).length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {isArabic ? 'لا توجد طلبات في هذا القسم' : 'No requests in this section'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filterRefunds(tab).map((refund) => (
                  <Card key={refund.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {refund.order?.order_number || `#${refund.order_id.slice(0, 8)}`}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatDate(refund.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xl font-bold text-orange-600">
                            {refund.amount.toFixed(2)} {isArabic ? 'ج.م' : 'EGP'}
                          </p>
                          <Badge className={STATUS_CONFIG[refund.status]?.color || STATUS_CONFIG.pending.color}>
                            {isArabic
                              ? STATUS_CONFIG[refund.status]?.label_ar
                              : STATUS_CONFIG[refund.status]?.label_en
                            }
                          </Badge>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4">
                        {/* Customer Info */}
                        <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">
                              {refund.customer?.full_name || refund.order?.delivery_address?.full_name}
                            </p>
                            <p className="text-sm text-slate-500" dir="ltr">
                              {refund.customer?.phone || refund.order?.delivery_address?.phone}
                            </p>
                          </div>
                          <a
                            href={`tel:${refund.customer?.phone || refund.order?.delivery_address?.phone}`}
                            className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200"
                          >
                            <Phone className="w-5 h-5 text-green-600" />
                          </a>
                        </div>

                        {/* Issue Type */}
                        <div className="mb-4">
                          <span className="text-sm font-medium text-slate-700">
                            {isArabic ? 'نوع المشكلة:' : 'Issue Type:'}
                          </span>
                          <span className="mr-2 text-slate-900">
                            {refund.issue_type
                              ? (isArabic ? ISSUE_TYPE_LABELS[refund.issue_type]?.ar : ISSUE_TYPE_LABELS[refund.issue_type]?.en)
                              : refund.reason
                            }
                          </span>
                        </div>

                        {/* Description */}
                        {refund.reason_ar && (
                          <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm text-orange-900">{refund.reason_ar}</p>
                          </div>
                        )}

                        {/* Evidence Images */}
                        {refund.evidence_images && refund.evidence_images.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              {isArabic ? 'صور الإثبات:' : 'Evidence:'}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {refund.evidence_images.map((img, idx) => (
                                <a
                                  key={idx}
                                  href={img}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-16 h-16 rounded-lg overflow-hidden border hover:opacity-80"
                                >
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Waiting for confirmation */}
                        {refund.provider_action === 'cash_refund' && !refund.customer_confirmed && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-700">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {isArabic
                                  ? 'في انتظار تأكيد العميل لاستلام المبلغ'
                                  : 'Waiting for customer to confirm receipt'
                                }
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Actions - Only for pending refunds */}
                        {refund.status === 'pending' && refund.provider_action === 'pending' && (
                          <div className="flex flex-wrap gap-2 pt-4 border-t">
                            <Button
                              onClick={() => handleCashRefund(refund.id)}
                              disabled={actionLoading === refund.id}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {actionLoading === refund.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  {isArabic ? 'تم رد المبلغ كاش' : 'Cash Refunded'}
                                </>
                              )}
                            </Button>

                            <Button
                              onClick={() => handleItemResend(refund.id)}
                              disabled={actionLoading === refund.id}
                              variant="outline"
                              className="flex-1"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {isArabic ? 'إعادة الصنف' : 'Resend Item'}
                            </Button>

                            <Button
                              onClick={() => handleEscalate(refund.id)}
                              disabled={actionLoading === refund.id}
                              variant="outline"
                              className="border-orange-300 text-orange-600 hover:bg-orange-50"
                            >
                              <ArrowUpRight className="w-4 h-4 mr-2" />
                              {isArabic ? 'تصعيد للإدارة' : 'Escalate'}
                            </Button>
                          </div>
                        )}

                        {/* Link to order */}
                        <Link
                          href={`/${locale}/provider/orders/${refund.order_id}`}
                          className="mt-4 flex items-center justify-center gap-2 text-primary text-sm font-medium hover:underline"
                        >
                          {isArabic ? 'عرض تفاصيل الطلب' : 'View Order Details'}
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Info Box */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2">
            {isArabic ? 'كيف يعمل نظام الاسترداد؟' : 'How does refund work?'}
          </h4>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              • {isArabic
                ? 'عند الضغط على "تم رد المبلغ كاش"، سيُطلب من العميل تأكيد استلام المبلغ'
                : 'When you click "Cash Refunded", customer will be asked to confirm receipt'
              }
            </li>
            <li>
              • {isArabic
                ? 'يتم تأكيد الاسترداد تلقائياً بعد 48 ساعة إذا لم يرد العميل'
                : 'Refund is auto-confirmed after 48 hours if customer does not respond'
              }
            </li>
            <li>
              • {isArabic
                ? 'بعد التأكيد، يتم تصفير عمولة إنجزنا لهذا الطلب'
                : 'After confirmation, Engezna commission is zeroed for this order'
              }
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
    </ProviderLayout>
  )
}
