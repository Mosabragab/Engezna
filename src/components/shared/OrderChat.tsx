'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, Send, X, Loader2 } from 'lucide-react'

interface Message {
  id: string
  order_id: string
  sender_type: 'customer' | 'provider'
  sender_id: string
  message: string
  is_read: boolean
  created_at: string
}

interface OrderChatProps {
  orderId: string
  userType: 'customer' | 'provider'
  userId: string
  locale: string
  providerName?: string
  customerName?: string
}

export function OrderChat({
  orderId,
  userType,
  userId,
  locale,
  providerName,
  customerName,
}: OrderChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load messages
  const loadMessages = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
      // Count unread messages from the other party
      const unread = data.filter(
        (m) => m.sender_type !== userType && !m.is_read
      ).length
      setUnreadCount(unread)
    }
    setLoading(false)
  }

  // Mark messages as read
  const markAsRead = async () => {
    const supabase = createClient()
    await supabase
      .from('order_messages')
      .update({ is_read: true })
      .eq('order_id', orderId)
      .neq('sender_type', userType)
      .eq('is_read', false)

    setUnreadCount(0)
  }

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('order_messages')
      .insert({
        order_id: orderId,
        sender_type: userType,
        sender_id: userId,
        message: newMessage.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      setMessages((prev) => [...prev, data])
      setNewMessage('')
      setTimeout(scrollToBottom, 100)
    }
    setSending(false)
  }

  // Realtime subscription
  useEffect(() => {
    if (!orderId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`chat-${orderId}`)
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
          // Only add if not already in messages (avoid duplicates from own sends)
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // Update unread count if message is from other party
          if (newMsg.sender_type !== userType) {
            if (isOpen) {
              // Mark as read immediately if chat is open
              markAsRead()
            } else {
              setUnreadCount((prev) => prev + 1)
            }
          }
          setTimeout(scrollToBottom, 100)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, userType, isOpen])

  // Load messages on mount
  useEffect(() => {
    loadMessages()
  }, [orderId])

  // Mark as read when opening chat
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAsRead()
    }
    if (isOpen) {
      setTimeout(scrollToBottom, 100)
      inputRef.current?.focus()
    }
  }, [isOpen])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const otherPartyName = userType === 'customer' ? providerName : customerName

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl h-[80vh] sm:h-[70vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-primary text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">
                  {locale === 'ar' ? 'محادثة الطلب' : 'Order Chat'}
                </h3>
                <p className="text-sm opacity-80">
                  {otherPartyName || (locale === 'ar' ? 'محادثة' : 'Chat')}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageCircle className="w-12 h-12 mb-2" />
                  <p className="text-sm">
                    {locale === 'ar'
                      ? 'لا توجد رسائل بعد'
                      : 'No messages yet'}
                  </p>
                  <p className="text-xs">
                    {locale === 'ar'
                      ? 'ابدأ المحادثة الآن'
                      : 'Start the conversation'}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_type === userType
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-white/70' : 'text-slate-400'
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-200 bg-white">
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
                  placeholder={
                    locale === 'ar' ? 'اكتب رسالتك...' : 'Type a message...'
                  }
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
      )}
    </>
  )
}
