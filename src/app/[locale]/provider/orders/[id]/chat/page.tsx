'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ProviderLayout } from '@/components/provider'
import { ArrowRight, ArrowLeft, ShoppingBag, Send, Loader2, MessageCircle } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface Message {
  id: string
  order_id: string
  sender_type: 'customer' | 'provider'
  sender_id: string
  message: string
  is_read: boolean
  created_at: string
}

type Order = {
  id: string
  order_number: string
  customer_id: string
  status: string
}

type Customer = {
  full_name: string
  phone: string | null
}

type ProviderInfo = {
  id: string
  name_ar: string
  name_en: string
}

export default function ProviderOrderChatPage() {
  const params = useParams()
  const router = useRouter()
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [provider, setProvider] = useState<ProviderInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    loadOrderData()
  }, [orderId])

  // Load messages
  useEffect(() => {
    if (provider) {
      loadMessages()
    }
  }, [provider, orderId])

  // Realtime subscription
  useEffect(() => {
    if (!orderId || !provider) return

    const supabase = createClient()

    const channel = supabase
      .channel(`chat-page-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // Mark as read if from customer
          if (newMsg.sender_type === 'customer') {
            markAsRead()
          }
          setTimeout(scrollToBottom, 100)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, provider])

  async function loadOrderData() {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login`)
      return
    }

    // Get provider for current user
    const { data: providerData } = await supabase
      .from('providers')
      .select('id, name_ar, name_en')
      .eq('owner_id', user.id)
      .single()

    if (!providerData) {
      router.push(`/${locale}/provider`)
      return
    }

    setProvider(providerData)

    // Get order
    const { data: orderData, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, status')
      .eq('id', orderId)
      .eq('provider_id', providerData.id)
      .single()

    if (error || !orderData) {
      router.push(`/${locale}/provider/orders`)
      return
    }

    setOrder(orderData)

    // Get customer info
    const { data: customerData } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', orderData.customer_id)
      .single()

    setCustomer(customerData)
    setLoading(false)
  }

  async function loadMessages() {
    setLoadingMessages(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
      // Mark customer messages as read
      markAsRead()
    }
    setLoadingMessages(false)
    setTimeout(scrollToBottom, 100)
    inputRef.current?.focus()
  }

  async function markAsRead() {
    const supabase = createClient()
    await supabase
      .from('order_messages')
      .update({ is_read: true })
      .eq('order_id', orderId)
      .eq('sender_type', 'customer')
      .eq('is_read', false)
  }

  async function handleSend() {
    if (!newMessage.trim() || sending || !provider) return

    setSending(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('order_messages')
      .insert({
        order_id: orderId,
        sender_type: 'provider',
        sender_id: provider.id,
        message: newMessage.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      setMessages((prev) => [...prev, data])
      setNewMessage('')
      setTimeout(scrollToBottom, 100)

      // Create notification for customer
      if (order?.customer_id) {
        const storeName = locale === 'ar' ? provider.name_ar : provider.name_en
        const messagePreview = data.message.length > 50 ? data.message.slice(0, 50) + '...' : data.message

        await supabase
          .from('customer_notifications')
          .insert({
            customer_id: order.customer_id,
            type: 'order_message',
            title_ar: `رسالة جديدة من ${provider.name_ar}`,
            title_en: `New Message from ${provider.name_en}`,
            body_ar: `${provider.name_ar}: ${messagePreview}`,
            body_en: `${provider.name_en}: ${messagePreview}`,
            related_order_id: orderId,
          })
      }
    }
    setSending(false)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </ProviderLayout>
    )
  }

  if (!order || !provider) {
    return null
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'محادثة الطلب', en: 'Order Chat' }}
      pageSubtitle={{ ar: `#${order.order_number}`, en: `#${order.order_number}` }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Back to Order Button */}
        <div className="mb-4">
          <Link href={`/${locale}/provider/orders/${orderId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {locale === 'ar' ? 'العودة للطلب' : 'Back to Order'}
            </Button>
          </Link>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
          {/* Header */}
          <div className="bg-primary text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">
                  {locale === 'ar' ? 'محادثة الطلب' : 'Order Chat'}
                </h3>
                <p className="text-sm opacity-80">
                  {customer?.full_name || (locale === 'ar' ? 'العميل' : 'Customer')}
                </p>
              </div>
            </div>
            <Link href={`/${locale}/provider/orders/${orderId}`}>
              <Button variant="secondary" size="sm">
                {locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
              </Button>
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageCircle className="w-12 h-12 mb-2" />
                <p className="text-sm">
                  {locale === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}
                </p>
                <p className="text-xs">
                  {locale === 'ar' ? 'ابدأ المحادثة الآن' : 'Start the conversation'}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_type === 'provider'
                const justifyClass = isRTL
                  ? (isOwn ? 'justify-start' : 'justify-end')
                  : (isOwn ? 'justify-end' : 'justify-start')
                const bubbleCorner = isRTL
                  ? (isOwn ? 'rounded-bl-sm' : 'rounded-br-sm')
                  : (isOwn ? 'rounded-br-sm' : 'rounded-bl-sm')
                return (
                  <div key={msg.id} className={`flex ${justifyClass}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${bubbleCorner} ${
                        isOwn
                          ? 'bg-primary text-white'
                          : 'bg-white border border-slate-200 text-slate-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
                        <span className="text-xs">{formatTime(msg.created_at)}</span>
                        {isOwn && msg.is_read && (
                          <span className="text-xs">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={locale === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProviderLayout>
  )
}
