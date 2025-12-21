'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import { CustomerLayout } from '@/components/customer/layout'
import { RefundConfirmationCard } from '@/components/customer/support'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Package,
  DollarSign,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import Link from 'next/link'

interface SupportTicket {
  id: string
  ticket_number: string
  type: string
  subject: string
  description: string
  status: string
  priority: string
  created_at: string
  resolved_at: string | null
  order?: {
    order_number: string
  }
  provider?: {
    name_ar: string
    name_en: string
  }
}

interface Refund {
  id: string
  order_id: string
  amount: number
  reason: string
  reason_ar: string
  status: string
  provider_action: string
  customer_confirmed: boolean
  confirmation_deadline: string | null
  provider_notes: string | null
  created_at: string
  processed_at: string | null
  order?: {
    order_number: string
  }
  provider?: {
    name_ar: string
    name_en: string
  }
}

const TICKET_STATUS_CONFIG: Record<string, { label_ar: string; label_en: string; color: string; icon: typeof Clock }> = {
  open: { label_ar: 'مفتوحة', label_en: 'Open', color: 'bg-blue-100 text-blue-700', icon: Clock },
  in_progress: { label_ar: 'قيد المعالجة', label_en: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  waiting: { label_ar: 'في انتظار ردك', label_en: 'Waiting for you', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  resolved: { label_ar: 'تم الحل', label_en: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  closed: { label_ar: 'مغلقة', label_en: 'Closed', color: 'bg-slate-100 text-slate-700', icon: XCircle },
}

const REFUND_STATUS_CONFIG: Record<string, { label_ar: string; label_en: string; color: string }> = {
  pending: { label_ar: 'قيد المراجعة', label_en: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label_ar: 'تمت الموافقة', label_en: 'Approved', color: 'bg-blue-100 text-blue-700' },
  rejected: { label_ar: 'مرفوض', label_en: 'Rejected', color: 'bg-red-100 text-red-700' },
  processed: { label_ar: 'تم التنفيذ', label_en: 'Processed', color: 'bg-green-100 text-green-700' },
  failed: { label_ar: 'فشل', label_en: 'Failed', color: 'bg-red-100 text-red-700' },
}

export default function CustomerSupportPage() {
  const locale = useLocale()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const isArabic = locale === 'ar'

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('refunds')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/auth/login?redirect=/profile/support`)
      return
    }
    if (user) {
      loadData()
    }
  }, [user, authLoading])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()

    // Fetch support tickets
    const { data: ticketsData } = await supabase
      .from('support_tickets')
      .select(`
        id,
        ticket_number,
        type,
        subject,
        description,
        status,
        priority,
        created_at,
        resolved_at,
        order:orders(order_number),
        provider:providers(name_ar, name_en)
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    if (ticketsData) {
      setTickets(ticketsData.map(t => ({
        ...t,
        order: Array.isArray(t.order) ? t.order[0] : t.order,
        provider: Array.isArray(t.provider) ? t.provider[0] : t.provider,
      })))
    }

    // Fetch refunds
    const { data: refundsData } = await supabase
      .from('refunds')
      .select(`
        id,
        order_id,
        amount,
        reason,
        reason_ar,
        status,
        provider_action,
        customer_confirmed,
        confirmation_deadline,
        provider_notes,
        created_at,
        processed_at,
        order:orders(order_number),
        provider:providers(name_ar, name_en)
      `)
      .eq('customer_id', user?.id)
      .order('created_at', { ascending: false })

    if (refundsData) {
      setRefunds(refundsData.map(r => ({
        ...r,
        order: Array.isArray(r.order) ? r.order[0] : r.order,
        provider: Array.isArray(r.provider) ? r.provider[0] : r.provider,
      })))
    }

    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: isArabic ? ar : enUS,
    })
  }

  // Separate refunds that need confirmation
  const refundsNeedingConfirmation = refunds.filter(
    r => r.provider_action === 'cash_refund' && !r.customer_confirmed
  )
  const otherRefunds = refunds.filter(
    r => !(r.provider_action === 'cash_refund' && !r.customer_confirmed)
  )

  if (loading || authLoading) {
    return (
      <CustomerLayout showBottomNav={true}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-slate-500">
              {isArabic ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout showBottomNav={true}>
      <div className="px-4 py-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/${locale}/profile`)}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
            >
              {isArabic ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isArabic ? 'الدعم والمساعدة' : 'Support & Help'}
              </h1>
              <p className="text-sm text-slate-500">
                {isArabic ? 'تتبع طلباتك وشكاويك' : 'Track your requests and complaints'}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20"
          >
            <RefreshCw className="w-5 h-5 text-primary" />
          </button>
        </div>

        {/* Refunds Needing Confirmation */}
        {refundsNeedingConfirmation.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              {isArabic ? 'يتطلب تأكيدك' : 'Needs Your Confirmation'}
            </h2>
            <div className="space-y-3">
              {refundsNeedingConfirmation.map((refund) => (
                <RefundConfirmationCard
                  key={refund.id}
                  refund={{
                    id: refund.id,
                    order_id: refund.order_id,
                    amount: refund.amount,
                    provider_action: refund.provider_action,
                    customer_confirmed: refund.customer_confirmed,
                    confirmation_deadline: refund.confirmation_deadline || '',
                    provider_notes: refund.provider_notes || undefined,
                    provider: refund.provider,
                    order: refund.order,
                  }}
                  locale={locale}
                  onConfirm={loadData}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="refunds" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {isArabic ? 'المرتجعات' : 'Refunds'}
              {otherRefunds.length > 0 && (
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {otherRefunds.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {isArabic ? 'التذاكر' : 'Tickets'}
              {tickets.length > 0 && (
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {tickets.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="mt-0">
            {otherRefunds.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  {isArabic ? 'لا توجد طلبات استرداد' : 'No refund requests'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {isArabic
                    ? 'يمكنك طلب استرداد من صفحة تفاصيل الطلب'
                    : 'You can request a refund from the order details page'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {otherRefunds.map((refund) => {
                  const statusConfig = REFUND_STATUS_CONFIG[refund.status] || REFUND_STATUS_CONFIG.pending

                  return (
                    <Card key={refund.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {refund.amount.toFixed(2)} {isArabic ? 'ج.م' : 'EGP'}
                            </p>
                            <p className="text-sm text-slate-500">
                              {isArabic ? 'طلب #' : 'Order #'}
                              {refund.order?.order_number || refund.order_id.slice(0, 8)}
                            </p>
                          </div>
                          <Badge className={statusConfig.color}>
                            {isArabic ? statusConfig.label_ar : statusConfig.label_en}
                          </Badge>
                        </div>

                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                          {refund.reason_ar || refund.reason}
                        </p>

                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{formatDate(refund.created_at)}</span>
                          {refund.provider && (
                            <span>
                              {isArabic ? refund.provider.name_ar : refund.provider.name_en}
                            </span>
                          )}
                        </div>

                        {refund.order_id && (
                          <Link
                            href={`/${locale}/orders/${refund.order_id}`}
                            className="mt-3 flex items-center justify-center gap-2 text-primary text-sm font-medium hover:underline"
                          >
                            {isArabic ? 'عرض الطلب' : 'View Order'}
                            {isArabic ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="mt-0">
            {tickets.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  {isArabic ? 'لا توجد تذاكر دعم' : 'No support tickets'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {isArabic
                    ? 'يمكنك تقديم شكوى من صفحة تفاصيل الطلب'
                    : 'You can submit a complaint from the order details page'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const statusConfig = TICKET_STATUS_CONFIG[ticket.status] || TICKET_STATUS_CONFIG.open
                  const StatusIcon = statusConfig.icon

                  return (
                    <Card key={ticket.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-400 font-mono">
                              {ticket.ticket_number}
                            </span>
                          </div>
                          <Badge className={statusConfig.color}>
                            {isArabic ? statusConfig.label_ar : statusConfig.label_en}
                          </Badge>
                        </div>

                        <h4 className="font-semibold text-slate-900 mb-1">
                          {ticket.subject}
                        </h4>

                        {ticket.description && (
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                            {ticket.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{formatDate(ticket.created_at)}</span>
                          {ticket.order && (
                            <span>
                              {isArabic ? 'طلب #' : 'Order #'}
                              {ticket.order.order_number}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  )
}
