'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Send,
  Loader2,
  ArrowUpRight,
  User,
  Phone,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import Link from 'next/link'

interface TicketMessage {
  id: string
  sender_type: string
  message: string
  created_at: string
  sender?: {
    full_name: string
  }
}

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
  order_id: string | null
  order?: {
    order_number: string
  }
  customer?: {
    full_name: string
    phone: string
  }
  messages?: TicketMessage[]
}

const STATUS_CONFIG: Record<string, { label_ar: string; label_en: string; color: string; icon: typeof Clock }> = {
  open: { label_ar: 'مفتوحة', label_en: 'Open', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { label_ar: 'قيد المعالجة', label_en: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  waiting: { label_ar: 'في انتظار رد', label_en: 'Waiting', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  resolved: { label_ar: 'تم الحل', label_en: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  closed: { label_ar: 'مغلقة', label_en: 'Closed', color: 'bg-slate-100 text-slate-700', icon: XCircle },
}

const TICKET_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  payment: { ar: 'مشكلة دفع', en: 'Payment Issue' },
  delivery: { ar: 'مشكلة توصيل', en: 'Delivery Issue' },
  quality: { ar: 'جودة المنتج', en: 'Product Quality' },
  provider_issue: { ar: 'مشكلة مع المتجر', en: 'Store Issue' },
  account: { ar: 'مشكلة حساب', en: 'Account Issue' },
  other: { ar: 'أخرى', en: 'Other' },
}

export default function ProviderComplaintsPage() {
  const locale = useLocale()
  const isArabic = locale === 'ar'

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [activeTab, setActiveTab] = useState('open')

  // Stats
  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
  const waitingCount = tickets.filter(t => t.status === 'waiting').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length

  useEffect(() => {
    loadData()

    // Set up realtime subscription
    const supabase = createClient()
    const subscription = supabase
      .channel('provider_tickets_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages' },
        () => {
          if (selectedTicket) {
            loadTicketMessages(selectedTicket.id)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()

    // Get current user's provider
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!provider) return
    setProviderId(provider.id)

    // Fetch tickets
    const { data: ticketsData } = await supabase
      .from('support_tickets')
      .select(`
        *,
        order:orders(order_number),
        customer:profiles!support_tickets_user_id_fkey(full_name, phone)
      `)
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })

    if (ticketsData) {
      setTickets(ticketsData.map(t => ({
        ...t,
        order: t.order as SupportTicket['order'],
        customer: t.customer as SupportTicket['customer'],
      })))
    }

    setLoading(false)
  }

  async function loadTicketMessages(ticketId: string) {
    const supabase = createClient()

    const { data: messagesData } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles(full_name)
      `)
      .eq('ticket_id', ticketId)
      .eq('is_internal', false)
      .order('created_at', { ascending: true })

    if (messagesData && selectedTicket) {
      setSelectedTicket({
        ...selectedTicket,
        messages: messagesData.map(m => ({
          ...m,
          sender: m.sender as TicketMessage['sender'],
        })),
      })
    }
  }

  async function handleSelectTicket(ticket: SupportTicket) {
    const supabase = createClient()

    // Fetch messages
    const { data: messagesData } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles(full_name)
      `)
      .eq('ticket_id', ticket.id)
      .eq('is_internal', false)
      .order('created_at', { ascending: true })

    setSelectedTicket({
      ...ticket,
      messages: messagesData?.map(m => ({
        ...m,
        sender: m.sender as TicketMessage['sender'],
      })) || [],
    })
  }

  async function handleSendReply() {
    if (!replyText.trim() || !selectedTicket || !providerId) return

    setSendingReply(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    try {
      // Add message
      await supabase.from('ticket_messages').insert({
        ticket_id: selectedTicket.id,
        sender_type: 'provider',
        sender_id: user?.id,
        message: replyText.trim(),
        is_internal: false,
      })

      // Update ticket status to waiting (for customer response)
      await supabase.from('support_tickets').update({
        status: 'waiting',
        updated_at: new Date().toISOString(),
      }).eq('id', selectedTicket.id)

      setReplyText('')
      await loadTicketMessages(selectedTicket.id)
      await loadData()
    } catch (err) {
      console.error('Error sending reply:', err)
    } finally {
      setSendingReply(false)
    }
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: isArabic ? ar : enUS,
    })
  }

  const filterTickets = (tab: string) => {
    switch (tab) {
      case 'open':
        return tickets.filter(t => t.status === 'open' || t.status === 'in_progress')
      case 'waiting':
        return tickets.filter(t => t.status === 'waiting')
      case 'resolved':
        return tickets.filter(t => t.status === 'resolved' || t.status === 'closed')
      default:
        return tickets
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isArabic ? 'شكاوى العملاء' : 'Customer Complaints'}
          </h1>
          <p className="text-slate-500">
            {isArabic ? 'متابعة والرد على شكاوى العملاء' : 'Track and respond to customer complaints'}
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {isArabic ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{openCount}</p>
              <p className="text-sm text-yellow-600">
                {isArabic ? 'مفتوحة' : 'Open'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{waitingCount}</p>
              <p className="text-sm text-orange-600">
                {isArabic ? 'في انتظار رد العميل' : 'Waiting for Response'}
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
              <p className="text-2xl font-bold text-green-700">{resolvedCount}</p>
              <p className="text-sm text-green-600">
                {isArabic ? 'تم الحل' : 'Resolved'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="open" className="relative">
                {isArabic ? 'مفتوحة' : 'Open'}
                {openCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {openCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="waiting">
                {isArabic ? 'انتظار' : 'Waiting'}
              </TabsTrigger>
              <TabsTrigger value="resolved">
                {isArabic ? 'محلولة' : 'Resolved'}
              </TabsTrigger>
            </TabsList>

            {['open', 'waiting', 'resolved'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {filterTickets(tab).length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">
                      {isArabic ? 'لا توجد شكاوى' : 'No complaints'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filterTickets(tab).map((ticket) => {
                      const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
                      const isSelected = selectedTicket?.id === ticket.id

                      return (
                        <Card
                          key={ticket.id}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'ring-2 ring-primary' : 'hover:border-slate-300'
                          }`}
                          onClick={() => handleSelectTicket(ticket)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-mono">
                                  {ticket.ticket_number}
                                </span>
                                <Badge className={statusConfig.color}>
                                  {isArabic ? statusConfig.label_ar : statusConfig.label_en}
                                </Badge>
                              </div>
                              <span className="text-xs text-slate-400">
                                {formatDate(ticket.created_at)}
                              </span>
                            </div>

                            <h4 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                              {ticket.subject}
                            </h4>

                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <User className="w-3 h-3" />
                              <span>{ticket.customer?.full_name}</span>
                              {ticket.order && (
                                <>
                                  <span>•</span>
                                  <span>#{ticket.order.order_number}</span>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Ticket Detail / Chat */}
        <div>
          {selectedTicket ? (
            <Card className="h-[600px] flex flex-col">
              {/* Header */}
              <div className="p-4 border-b bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-slate-500">
                    {selectedTicket.ticket_number}
                  </span>
                  <Badge className={STATUS_CONFIG[selectedTicket.status]?.color}>
                    {isArabic
                      ? STATUS_CONFIG[selectedTicket.status]?.label_ar
                      : STATUS_CONFIG[selectedTicket.status]?.label_en
                    }
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-900">{selectedTicket.subject}</h3>

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="w-4 h-4" />
                    {selectedTicket.customer?.full_name}
                  </div>
                  <a
                    href={`tel:${selectedTicket.customer?.phone}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="w-3 h-3" />
                    {selectedTicket.customer?.phone}
                  </a>
                </div>

                {selectedTicket.order_id && (
                  <Link
                    href={`/${locale}/provider/orders/${selectedTicket.order_id}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {isArabic ? 'عرض الطلب' : 'View Order'}
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {/* Initial Description */}
                <div className="flex justify-end">
                  <div className="bg-white border rounded-xl p-3 max-w-[80%]">
                    <p className="text-sm text-slate-800">{selectedTicket.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(selectedTicket.created_at)}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                {selectedTicket.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'provider' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`rounded-xl p-3 max-w-[80%] ${
                        msg.sender_type === 'provider'
                          ? 'bg-primary text-white'
                          : 'bg-white border'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_type === 'provider' ? 'text-white/70' : 'text-slate-400'
                      }`}>
                        {formatDate(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <div className="p-4 border-t bg-white">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={isArabic ? 'اكتب ردك هنا...' : 'Write your reply...'}
                      className="resize-none"
                      rows={2}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || sendingReply}
                      className="self-end"
                    >
                      {sendingReply ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {isArabic ? 'اختر شكوى لعرض التفاصيل' : 'Select a complaint to view details'}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
