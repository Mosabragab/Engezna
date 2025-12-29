import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Notification templates
const NOTIFICATION_TEMPLATES = {
  // ============================================================================
  // Provider notifications
  // ============================================================================
  new_order: {
    title: 'New Order',
    title_ar: 'طلب جديد',
    body: 'You have received a new order #{order_number}',
    body_ar: 'لديك طلب جديد #{order_number}',
    type: 'new_order',
  },
  order_cancelled: {
    title: 'Order Cancelled',
    title_ar: 'تم إلغاء الطلب',
    body: 'Order #{order_number} has been cancelled',
    body_ar: 'تم إلغاء الطلب #{order_number}',
    type: 'order_cancelled',
  },
  new_review: {
    title: 'New Review',
    title_ar: 'تقييم جديد',
    body: 'You received a new {stars}-star review',
    body_ar: 'حصلت على تقييم جديد {stars} نجوم',
    type: 'new_review',
  },
  new_refund_request_provider: {
    title: 'New Refund Request',
    title_ar: 'طلب مرتجع جديد',
    body: 'Customer requested a refund for order #{order_number}',
    body_ar: 'العميل طلب مرتجع للطلب #{order_number}',
    type: 'refund_request',
  },

  // ============================================================================
  // Customer notifications
  // ============================================================================
  order_accepted: {
    title: 'Order Accepted',
    title_ar: 'تم قبول طلبك',
    body: 'Your order #{order_number} has been accepted',
    body_ar: 'تم قبول طلبك #{order_number}',
    type: 'order_update',
  },
  order_preparing: {
    title: 'Preparing Your Order',
    title_ar: 'جاري تحضير طلبك',
    body: 'Your order #{order_number} is being prepared',
    body_ar: 'جاري تحضير طلبك #{order_number}',
    type: 'order_update',
  },
  order_ready: {
    title: 'Order Ready',
    title_ar: 'طلبك جاهز',
    body: 'Your order #{order_number} is ready for pickup/delivery',
    body_ar: 'طلبك #{order_number} جاهز للاستلام/التوصيل',
    type: 'order_update',
  },
  order_out_for_delivery: {
    title: 'Out for Delivery',
    title_ar: 'طلبك في الطريق',
    body: 'Your order #{order_number} is on its way',
    body_ar: 'طلبك #{order_number} في الطريق إليك',
    type: 'order_update',
  },
  order_delivered: {
    title: 'Order Delivered',
    title_ar: 'تم توصيل طلبك',
    body: 'Your order #{order_number} has been delivered',
    body_ar: 'تم توصيل طلبك #{order_number}',
    type: 'order_update',
  },
  order_rejected: {
    title: 'Order Rejected',
    title_ar: 'تم رفض طلبك',
    body: 'Sorry, your order #{order_number} was rejected',
    body_ar: 'عذراً، تم رفض طلبك #{order_number}',
    type: 'order_update',
  },

  // Refund notifications for customer
  refund_approved: {
    title: 'Refund Approved',
    title_ar: 'تمت الموافقة على المرتجع',
    body: 'Your refund for order #{order_number} has been approved',
    body_ar: 'تمت الموافقة على طلب المرتجع للطلب #{order_number}',
    type: 'refund_update',
  },
  refund_rejected: {
    title: 'Refund Rejected',
    title_ar: 'تم رفض المرتجع',
    body: 'Your refund request for order #{order_number} was rejected',
    body_ar: 'تم رفض طلب المرتجع للطلب #{order_number}',
    type: 'refund_update',
  },
  refund_processed: {
    title: 'Refund Processed',
    title_ar: 'تم معالجة المرتجع',
    body: 'Your refund of {amount} EGP has been processed',
    body_ar: 'تم معالجة المرتجع بقيمة {amount} جنيه',
    type: 'refund_update',
  },

  // Support ticket notifications for customer
  ticket_reply: {
    title: 'Support Reply',
    title_ar: 'رد الدعم',
    body: 'You have a new reply on your support ticket #{ticket_number}',
    body_ar: 'لديك رد جديد على تذكرة الدعم #{ticket_number}',
    type: 'ticket_update',
  },
  ticket_resolved: {
    title: 'Ticket Resolved',
    title_ar: 'تم حل التذكرة',
    body: 'Your support ticket #{ticket_number} has been resolved',
    body_ar: 'تم حل تذكرة الدعم #{ticket_number}',
    type: 'ticket_update',
  },
  ticket_closed: {
    title: 'Ticket Closed',
    title_ar: 'تم إغلاق التذكرة',
    body: 'Your support ticket #{ticket_number} has been closed',
    body_ar: 'تم إغلاق تذكرة الدعم #{ticket_number}',
    type: 'ticket_update',
  },

  // ============================================================================
  // Chat notifications
  // ============================================================================
  new_message: {
    title: 'New Message',
    title_ar: 'رسالة جديدة',
    body: '{sender_name}: {message_preview}',
    body_ar: '{sender_name}: {message_preview}',
    type: 'chat_message',
  },

  // ============================================================================
  // Admin notifications
  // ============================================================================
  new_support_ticket: {
    title: 'New Support Ticket',
    title_ar: 'تذكرة دعم جديدة',
    body: 'New ticket #{ticket_number}: {subject}',
    body_ar: 'تذكرة جديدة #{ticket_number}: {subject}',
    type: 'new_ticket',
  },
  new_refund_request_admin: {
    title: 'New Refund Request',
    title_ar: 'طلب مرتجع جديد',
    body: 'New refund request for order #{order_number} - {amount} EGP',
    body_ar: 'طلب مرتجع جديد للطلب #{order_number} - {amount} جنيه',
    type: 'refund_request',
  },
  refund_escalated: {
    title: 'Refund Escalated',
    title_ar: 'تصعيد مرتجع',
    body: 'Refund for order #{order_number} has been escalated',
    body_ar: 'تم تصعيد المرتجع للطلب #{order_number}',
    type: 'refund_escalated',
  },
}

// Replace template variables
function formatTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    result = result.replace(new RegExp(`#\\{${key}\\}`, 'g'), `#${value}`)
  }
  return result
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Record<string, unknown>
  old_record?: Record<string, unknown>
  schema: string
}

interface NotificationPayload {
  user_id?: string
  user_ids?: string[]
  provider_id?: string
  admin_notify?: boolean
  template: keyof typeof NOTIFICATION_TEMPLATES
  variables: Record<string, string>
  data: Record<string, string>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: WebhookPayload = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const notifications: NotificationPayload[] = []

    // Handle different tables/events
    switch (payload.table) {
      // ============================================================================
      // ORDERS
      // ============================================================================
      case 'orders': {
        const order = payload.record as {
          id: string
          order_number: string
          customer_id: string
          provider_id: string
          status: string
        }

        if (payload.type === 'INSERT') {
          // New order - notify provider
          notifications.push({
            provider_id: order.provider_id,
            template: 'new_order',
            variables: { order_number: order.order_number },
            data: { order_id: order.id, type: 'new_order' },
          })
        } else if (payload.type === 'UPDATE' && payload.old_record) {
          const oldOrder = payload.old_record as { status: string }

          if (oldOrder.status !== order.status) {
            const statusTemplateMap: Record<string, keyof typeof NOTIFICATION_TEMPLATES> = {
              accepted: 'order_accepted',
              preparing: 'order_preparing',
              ready: 'order_ready',
              out_for_delivery: 'order_out_for_delivery',
              delivered: 'order_delivered',
              rejected: 'order_rejected',
              cancelled: 'order_cancelled',
            }

            const template = statusTemplateMap[order.status]
            if (template) {
              if (['accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'rejected'].includes(order.status)) {
                // Notify customer
                notifications.push({
                  user_id: order.customer_id,
                  template,
                  variables: { order_number: order.order_number },
                  data: { order_id: order.id, type: 'order_update' },
                })
              } else if (order.status === 'cancelled') {
                // Notify provider
                notifications.push({
                  provider_id: order.provider_id,
                  template,
                  variables: { order_number: order.order_number },
                  data: { order_id: order.id, type: 'order_cancelled' },
                })
              }
            }
          }
        }
        break
      }

      // ============================================================================
      // REVIEWS
      // ============================================================================
      case 'reviews': {
        if (payload.type === 'INSERT') {
          const review = payload.record as {
            id: string
            provider_id: string
            rating: number
          }

          notifications.push({
            provider_id: review.provider_id,
            template: 'new_review',
            variables: { stars: String(review.rating) },
            data: { review_id: review.id, type: 'new_review' },
          })
        }
        break
      }

      // ============================================================================
      // CHAT MESSAGES
      // ============================================================================
      case 'chat_messages': {
        if (payload.type === 'INSERT') {
          const message = payload.record as {
            id: string
            conversation_id: string
            sender_id: string
            content: string
          }

          // Get conversation to find recipient
          const { data: conversation } = await supabase
            .from('chat_conversations')
            .select('customer_id, provider_id')
            .eq('id', message.conversation_id)
            .single()

          if (conversation) {
            // Get sender name
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', message.sender_id)
              .single()

            const senderName = sender?.full_name || 'مستخدم'
            const messagePreview = message.content?.substring(0, 50) || ''

            // Determine recipient and notify
            if (message.sender_id === conversation.customer_id) {
              // Customer sent message - notify provider
              notifications.push({
                provider_id: conversation.provider_id,
                template: 'new_message',
                variables: { sender_name: senderName, message_preview: messagePreview },
                data: { conversation_id: message.conversation_id, type: 'chat_message' },
              })
            } else {
              // Provider sent message - notify customer
              notifications.push({
                user_id: conversation.customer_id,
                template: 'new_message',
                variables: { sender_name: senderName, message_preview: messagePreview },
                data: { conversation_id: message.conversation_id, type: 'chat_message' },
              })
            }
          }
        }
        break
      }

      // ============================================================================
      // SUPPORT TICKETS
      // ============================================================================
      case 'support_tickets': {
        const ticket = payload.record as {
          id: string
          ticket_number: string
          user_id: string
          provider_id: string
          subject: string
          status: string
          assigned_to: string
        }

        if (payload.type === 'INSERT') {
          // New ticket - notify admins
          notifications.push({
            admin_notify: true,
            template: 'new_support_ticket',
            variables: {
              ticket_number: ticket.ticket_number,
              subject: ticket.subject || 'تذكرة دعم'
            },
            data: { ticket_id: ticket.id, type: 'new_ticket' },
          })
        } else if (payload.type === 'UPDATE' && payload.old_record) {
          const oldTicket = payload.old_record as { status: string }

          if (oldTicket.status !== ticket.status) {
            // Status changed - notify customer
            if (ticket.status === 'resolved') {
              notifications.push({
                user_id: ticket.user_id,
                template: 'ticket_resolved',
                variables: { ticket_number: ticket.ticket_number },
                data: { ticket_id: ticket.id, type: 'ticket_update' },
              })
            } else if (ticket.status === 'closed') {
              notifications.push({
                user_id: ticket.user_id,
                template: 'ticket_closed',
                variables: { ticket_number: ticket.ticket_number },
                data: { ticket_id: ticket.id, type: 'ticket_update' },
              })
            }
          }
        }
        break
      }

      // ============================================================================
      // TICKET MESSAGES
      // ============================================================================
      case 'ticket_messages': {
        if (payload.type === 'INSERT') {
          const message = payload.record as {
            id: string
            ticket_id: string
            sender_type: string
            sender_id: string
            message: string
            is_internal: boolean
          }

          // Don't notify for internal messages
          if (message.is_internal) break

          // Get ticket info
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('ticket_number, user_id')
            .eq('id', message.ticket_id)
            .single()

          if (ticket && message.sender_type !== 'customer') {
            // Admin replied - notify customer
            notifications.push({
              user_id: ticket.user_id,
              template: 'ticket_reply',
              variables: { ticket_number: ticket.ticket_number },
              data: { ticket_id: message.ticket_id, type: 'ticket_update' },
            })
          }
        }
        break
      }

      // ============================================================================
      // REFUNDS
      // ============================================================================
      case 'refunds': {
        const refund = payload.record as {
          id: string
          order_id: string
          customer_id: string
          provider_id: string
          amount: number
          status: string
          escalated_to_admin: boolean
        }

        // Get order number
        const { data: order } = await supabase
          .from('orders')
          .select('order_number')
          .eq('id', refund.order_id)
          .single()

        const orderNumber = order?.order_number || refund.order_id

        if (payload.type === 'INSERT') {
          // New refund request - notify provider and admin
          notifications.push({
            provider_id: refund.provider_id,
            template: 'new_refund_request_provider',
            variables: { order_number: orderNumber },
            data: { refund_id: refund.id, order_id: refund.order_id, type: 'refund_request' },
          })

          notifications.push({
            admin_notify: true,
            template: 'new_refund_request_admin',
            variables: {
              order_number: orderNumber,
              amount: String(refund.amount)
            },
            data: { refund_id: refund.id, order_id: refund.order_id, type: 'refund_request' },
          })
        } else if (payload.type === 'UPDATE' && payload.old_record) {
          const oldRefund = payload.old_record as { status: string; escalated_to_admin: boolean }

          // Status changed
          if (oldRefund.status !== refund.status) {
            if (refund.status === 'approved') {
              notifications.push({
                user_id: refund.customer_id,
                template: 'refund_approved',
                variables: { order_number: orderNumber },
                data: { refund_id: refund.id, type: 'refund_update' },
              })
            } else if (refund.status === 'rejected') {
              notifications.push({
                user_id: refund.customer_id,
                template: 'refund_rejected',
                variables: { order_number: orderNumber },
                data: { refund_id: refund.id, type: 'refund_update' },
              })
            } else if (refund.status === 'processed' || refund.status === 'completed') {
              notifications.push({
                user_id: refund.customer_id,
                template: 'refund_processed',
                variables: {
                  order_number: orderNumber,
                  amount: String(refund.amount)
                },
                data: { refund_id: refund.id, type: 'refund_update' },
              })
            }
          }

          // Escalation
          if (!oldRefund.escalated_to_admin && refund.escalated_to_admin) {
            notifications.push({
              admin_notify: true,
              template: 'refund_escalated',
              variables: { order_number: orderNumber },
              data: { refund_id: refund.id, type: 'refund_escalated' },
            })
          }
        }
        break
      }

      // ============================================================================
      // SYNC APP NOTIFICATIONS WITH PUSH
      // ============================================================================
      case 'provider_notifications':
      case 'customer_notifications':
      case 'admin_notifications': {
        if (payload.type === 'INSERT') {
          const notification = payload.record as {
            id: string
            user_id?: string
            customer_id?: string
            provider_id?: string
            admin_id?: string
            title?: string
            title_ar?: string
            title_en?: string
            body?: string
            body_ar?: string
            body_en?: string
            type: string
          }

          const sendNotificationUrl = `${supabaseUrl}/functions/v1/send-notification`

          await fetch(sendNotificationUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: notification.user_id || notification.customer_id || notification.admin_id,
              provider_id: notification.provider_id,
              title: notification.title || notification.title_en || '',
              title_ar: notification.title_ar || notification.title || '',
              body: notification.body || notification.body_en || '',
              body_ar: notification.body_ar || notification.body || '',
              data: {
                notification_id: notification.id,
                type: notification.type,
              },
            }),
          })

          return new Response(JSON.stringify({ success: true, synced: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        break
      }
    }

    // Send all notifications
    const sendNotificationUrl = `${supabaseUrl}/functions/v1/send-notification`
    const results = []

    for (const notif of notifications) {
      const template = NOTIFICATION_TEMPLATES[notif.template]

      // For admin notifications, get admin user IDs
      let targetUserIds: string[] = []
      if (notif.admin_notify) {
        const { data: admins } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('is_active', true)
          .limit(50)

        targetUserIds = admins?.map(a => a.user_id) || []
      }

      const response = await fetch(sendNotificationUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: notif.user_id,
          user_ids: targetUserIds.length > 0 ? targetUserIds : notif.user_ids,
          provider_id: notif.provider_id,
          title: formatTemplate(template.title, notif.variables),
          title_ar: formatTemplate(template.title_ar, notif.variables),
          body: formatTemplate(template.body, notif.variables),
          body_ar: formatTemplate(template.body_ar, notif.variables),
          data: {
            ...notif.data,
            type: template.type,
          },
        }),
      })

      results.push(await response.json())
    }

    return new Response(JSON.stringify({
      success: true,
      notifications_sent: notifications.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
