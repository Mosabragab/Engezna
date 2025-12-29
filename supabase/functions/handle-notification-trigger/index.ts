import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Notification templates
const NOTIFICATION_TEMPLATES = {
  // Provider notifications
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
  low_stock: {
    title: 'Low Stock Alert',
    title_ar: 'تنبيه نفاذ المخزون',
    body: '{product_name} is running low on stock',
    body_ar: '{product_name} على وشك النفاذ',
    type: 'low_stock',
  },

  // Customer notifications
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
  promo_notification: {
    title: '{title}',
    title_ar: '{title_ar}',
    body: '{body}',
    body_ar: '{body_ar}',
    type: 'promo',
  },

  // Chat notifications
  new_message: {
    title: 'New Message',
    title_ar: 'رسالة جديدة',
    body: '{sender_name}: {message_preview}',
    body_ar: '{sender_name}: {message_preview}',
    type: 'chat_message',
  },

  // Admin notifications
  new_provider_request: {
    title: 'New Provider Request',
    title_ar: 'طلب شريك جديد',
    body: 'New provider registration: {provider_name}',
    body_ar: 'طلب تسجيل شريك جديد: {provider_name}',
    type: 'new_provider',
  },
  new_complaint: {
    title: 'New Complaint',
    title_ar: 'شكوى جديدة',
    body: 'New complaint from {customer_name}',
    body_ar: 'شكوى جديدة من {customer_name}',
    type: 'complaint',
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

    let notificationPayload: {
      user_id?: string
      provider_id?: string
      template: keyof typeof NOTIFICATION_TEMPLATES
      variables: Record<string, string>
      data: Record<string, string>
    } | null = null

    // Handle different tables/events
    switch (payload.table) {
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
          notificationPayload = {
            provider_id: order.provider_id,
            template: 'new_order',
            variables: { order_number: order.order_number },
            data: { order_id: order.id, type: 'new_order' },
          }
        } else if (payload.type === 'UPDATE' && payload.old_record) {
          const oldOrder = payload.old_record as { status: string }

          if (oldOrder.status !== order.status) {
            // Status changed - notify customer
            const statusTemplateMap: Record<string, keyof typeof NOTIFICATION_TEMPLATES> = {
              accepted: 'order_accepted',
              preparing: 'order_preparing',
              ready: 'order_ready',
              delivered: 'order_delivered',
              rejected: 'order_rejected',
              cancelled: 'order_cancelled',
            }

            const template = statusTemplateMap[order.status]
            if (template) {
              // Notify customer for most statuses
              if (['accepted', 'preparing', 'ready', 'delivered', 'rejected'].includes(order.status)) {
                notificationPayload = {
                  user_id: order.customer_id,
                  template,
                  variables: { order_number: order.order_number },
                  data: { order_id: order.id, type: 'order_update' },
                }
              }
              // Notify provider for cancellation
              else if (order.status === 'cancelled') {
                notificationPayload = {
                  provider_id: order.provider_id,
                  template,
                  variables: { order_number: order.order_number },
                  data: { order_id: order.id, type: 'order_cancelled' },
                }
              }
            }
          }
        }
        break
      }

      case 'reviews': {
        if (payload.type === 'INSERT') {
          const review = payload.record as {
            id: string
            provider_id: string
            rating: number
          }

          notificationPayload = {
            provider_id: review.provider_id,
            template: 'new_review',
            variables: { stars: String(review.rating) },
            data: { review_id: review.id, type: 'new_review' },
          }
        }
        break
      }

      case 'chat_messages': {
        if (payload.type === 'INSERT') {
          const message = payload.record as {
            id: string
            chat_id: string
            sender_id: string
            content: string
          }

          // Get chat to find recipient
          const { data: chat } = await supabase
            .from('chats')
            .select('customer_id, provider_id')
            .eq('id', message.chat_id)
            .single()

          if (chat) {
            // Get sender name
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', message.sender_id)
              .single()

            // Determine recipient
            const recipientId =
              message.sender_id === chat.customer_id ? chat.provider_id : chat.customer_id

            // For provider recipients, notify all staff
            if (recipientId === chat.provider_id) {
              notificationPayload = {
                provider_id: chat.provider_id,
                template: 'new_message',
                variables: {
                  sender_name: sender?.full_name || 'Someone',
                  message_preview: message.content.substring(0, 50),
                },
                data: { chat_id: message.chat_id, type: 'chat_message' },
              }
            } else {
              notificationPayload = {
                user_id: recipientId,
                template: 'new_message',
                variables: {
                  sender_name: sender?.full_name || 'Someone',
                  message_preview: message.content.substring(0, 50),
                },
                data: { chat_id: message.chat_id, type: 'chat_message' },
              }
            }
          }
        }
        break
      }

      case 'provider_notifications':
      case 'customer_notifications':
      case 'admin_notifications': {
        // These are app notifications - sync with push notifications
        if (payload.type === 'INSERT') {
          const notification = payload.record as {
            id: string
            user_id?: string
            provider_id?: string
            title: string
            title_ar?: string
            body: string
            body_ar?: string
            type: string
            data?: Record<string, string>
          }

          // Send push notification for app notification
          const sendNotificationUrl = `${supabaseUrl}/functions/v1/send-notification`

          await fetch(sendNotificationUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: notification.user_id,
              provider_id: notification.provider_id,
              title: notification.title,
              title_ar: notification.title_ar,
              body: notification.body,
              body_ar: notification.body_ar,
              data: {
                ...notification.data,
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

    // Send notification if payload was built
    if (notificationPayload) {
      const template = NOTIFICATION_TEMPLATES[notificationPayload.template]

      const sendNotificationUrl = `${supabaseUrl}/functions/v1/send-notification`

      const response = await fetch(sendNotificationUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: notificationPayload.user_id,
          provider_id: notificationPayload.provider_id,
          title: formatTemplate(template.title, notificationPayload.variables),
          title_ar: formatTemplate(template.title_ar, notificationPayload.variables),
          body: formatTemplate(template.body, notificationPayload.variables),
          body_ar: formatTemplate(template.body_ar, notificationPayload.variables),
          data: {
            ...notificationPayload.data,
            type: template.type,
          },
        }),
      })

      const result = await response.json()

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'No notification needed' }), {
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
