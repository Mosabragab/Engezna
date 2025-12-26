'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Loader2,
  Store,
  User as UserIcon,
  Info,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_type: 'customer' | 'provider' | 'admin' | 'system'
  recipient_type?: string
  message: string
  created_at: string
  is_internal: boolean
  sender?: {
    full_name: string
  } | null
}

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  description: string
  status: string
  priority: string
  created_at: string
  resolved_at: string | null
  provider_id: string | null
  order_id: string | null
  order?: {
    order_number: string
  } | null
  provider?: {
    name_ar: string
    name_en: string
  } | null
}

const STATUS_CONFIG: Record<string, { label_ar: string; label_en: string; color: string; icon: typeof Clock }> = {
  open: { label_ar: 'مفتوحة', label_en: 'Open', color: 'bg-blue-100 text-blue-700', icon: Clock },
  in_progress: { label_ar: 'قيد المعالجة', label_en: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  waiting: { label_ar: 'في انتظار ردك', label_en: 'Waiting for you', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  resolved: { label_ar: 'تم الحل', label_en: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  closed: { label_ar: 'مغلقة', label_en: 'Closed', color: 'bg-slate-100 text-slate-700', icon: XCircle },
}

export default function CustomerTicketDetailPage() {
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string
  const { user, loading: authLoading } = useAuth()
  const isArabic = locale === 'ar'

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadTicket = useCallback(async () => {
    if (!user) return

    const supabase = createClient()

    // Load ticket
    const { data: ticketData, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        order:orders(order_number),
        provider:providers(name_ar, name_en)
      `)
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single()

    if (error || !ticketData) {
      console.error('Error loading ticket:', error)
      router.push(`/${locale}/profile/support`)
      return
    }

    setTicket(ticketData as SupportTicket)

    // Load messages (excluding internal notes)
    const { data: messagesData } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles(full_name)
      `)
      .eq('ticket_id', ticketId)
      .eq('is_internal', false)
      .or('recipient_type.is.null,recipient_type.eq.customer,recipient_type.eq.admin,sender_type.eq.customer')
      .order('created_at', { ascending: true })

    if (messagesData) {
      setMessages(messagesData as TicketMessage[])
    }

    setLoading(false)
  }, [user, ticketId, locale, router])

  useEffect(() => {
    if (!authLoading && user) {
      loadTicket()
    } else if (!authLoading && !user) {
      router.push(`/${locale}/auth/login`)
    }
  }, [authLoading, user, loadTicket, locale, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!ticketId || !user) return

    const supabase = createClient()
    const channel = supabase
      .channel(`customer-ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        async (payload) => {
          // Only add if not internal and relevant to customer
          if (payload.new.is_internal) return
          if (payload.new.recipient_type === 'provider') return

          const { data: newMsg } = await supabase
            .from('ticket_messages')
            .select(`*, sender:profiles(full_name)`)
            .eq('id', payload.new.id)
            .single()

          if (newMsg) {
            setMessages(prev => [...prev, newMsg as TicketMessage])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, user])

  async function handleSendMessage() {
    if (!newMessage.trim() || !user || !ticket) return

    setSendingMessage(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_type: 'customer',
        recipient_type: 'admin',
        message: newMessage.trim(),
        is_internal: false,
      })

    if (error) {
      console.error('Error sending message:', error)
      alert(isArabic ? 'حدث خطأ أثناء إرسال الرسالة' : 'Error sending message')
    } else {
      setNewMessage('')

      // Update ticket status to in_progress if it was waiting
      if (ticket.status === 'waiting') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', ticketId)
        await loadTicket()
      }
    }

    setSendingMessage(false)
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: isArabic ? ar : enUS,
    })
  }

  if (authLoading || loading) {
    return (
      <CustomerLayout showBottomNav={true}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    )
  }

  if (!ticket) {
    return (
      <CustomerLayout showBottomNav={true}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">
              {isArabic ? 'التذكرة غير موجودة' : 'Ticket Not Found'}
            </h1>
            <Button onClick={() => router.push(`/${locale}/profile/support`)}>
              {isArabic ? 'العودة للدعم' : 'Back to Support'}
            </Button>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
  const StatusIcon = statusConfig.icon

  return (
    <CustomerLayout showBottomNav={true}>
      <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
          <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => router.push(`/${locale}/profile/support`)}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
            >
              {isArabic ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
            <div className={`flex-1 ${isArabic ? 'text-right' : ''}`}>
              <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <h1 className="font-bold text-slate-900">{ticket.subject}</h1>
                <Badge className={statusConfig.color}>
                  {isArabic ? statusConfig.label_ar : statusConfig.label_en}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono">#{ticket.ticket_number}</p>
            </div>
            <button
              onClick={loadTicket}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
            >
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Ticket Info Card */}
        <div className="px-4 py-3 bg-white border-b border-slate-100">
          <p className="text-sm text-slate-600 mb-2">{ticket.description}</p>
          <div className={`flex items-center gap-4 text-xs text-slate-500 ${isArabic ? 'flex-row-reverse' : ''}`}>
            {ticket.provider && (
              <div className={`flex items-center gap-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Store className="w-3 h-3" />
                <span>{isArabic ? ticket.provider.name_ar : ticket.provider.name_en}</span>
              </div>
            )}
            {ticket.order && (
              <div className={`flex items-center gap-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <Info className="w-3 h-3" />
                <span>{isArabic ? 'طلب #' : 'Order #'}{ticket.order.order_number}</span>
              </div>
            )}
            <span>{formatDate(ticket.created_at)}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>{isArabic ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
              <p className="text-xs mt-1">
                {isArabic ? 'سيقوم فريق الدعم بالرد قريباً' : 'Support team will respond soon'}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMyMessage = msg.sender_type === 'customer'
              const isAdmin = msg.sender_type === 'admin'
              const isProvider = msg.sender_type === 'provider'

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMyMessage ? (isArabic ? 'justify-start' : 'justify-end') : (isArabic ? 'justify-end' : 'justify-start')}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      isMyMessage
                        ? 'bg-primary text-white'
                        : isAdmin
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : isProvider
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : 'bg-white text-slate-900 border border-slate-200'
                    }`}
                  >
                    {/* Sender label for non-customer messages */}
                    {!isMyMessage && (
                      <div className={`flex items-center gap-1 mb-1 text-xs ${
                        isAdmin ? 'text-blue-600' : isProvider ? 'text-purple-600' : 'text-slate-500'
                      }`}>
                        {isAdmin ? (
                          <>
                            <UserIcon className="w-3 h-3" />
                            <span>{isArabic ? 'فريق الدعم' : 'Support Team'}</span>
                          </>
                        ) : isProvider ? (
                          <>
                            <Store className="w-3 h-3" />
                            <span>{isArabic ? 'المتجر' : 'Store'}</span>
                          </>
                        ) : null}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                    <div className={`text-xs mt-1 ${isMyMessage ? 'text-white/70' : 'text-slate-400'}`}>
                      {formatDate(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
          <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0">
            <div className={`flex gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isArabic ? 'اكتب رسالتك...' : 'Type your message...'}
                className={`flex-1 p-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${
                  isArabic ? 'text-right' : ''
                }`}
                rows={2}
                dir={isArabic ? 'rtl' : 'ltr'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="px-4 bg-primary hover:bg-primary/90"
              >
                {sendingMessage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className={`w-5 h-5 ${isArabic ? 'rotate-180' : ''}`} />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Resolved/Closed Message */}
        {(ticket.status === 'closed' || ticket.status === 'resolved') && (
          <div className="bg-green-50 border-t border-green-200 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">
                {isArabic ? 'تم حل هذه الشكوى' : 'This ticket has been resolved'}
              </span>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
