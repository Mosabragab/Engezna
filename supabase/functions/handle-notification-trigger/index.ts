import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Build click_action URL based on notification type and table
// This determines where the user navigates when clicking the push notification
// ============================================================================
function buildClickAction(
  record: Record<string, unknown>,
  tableName: string
): string {
  const type = String(record.type || '');
  const relatedOrderId = record.related_order_id as string | undefined;
  const data = record.data as Record<string, unknown> | undefined;
  const orderId = relatedOrderId || (data?.order_id as string | undefined);
  const broadcastId = data?.broadcast_id as string | undefined;
  const ticketId = data?.ticket_id as string | undefined;
  const conversationId = data?.conversation_id as string | undefined;

  // Customer notifications
  if (tableName === 'customer_notifications') {
    // Standard order notifications
    if (type.startsWith('order_') && orderId) {
      if (type === 'order_message') {
        return `/ar/orders/${orderId}?openChat=true`;
      }
      return `/ar/orders/${orderId}`;
    }
    // Custom order notifications
    if (
      (type === 'custom_order_priced' || type === 'CUSTOM_ORDER_PRICED') &&
      broadcastId
    ) {
      return `/ar/orders/custom-review/${broadcastId}`;
    }
    if (type === 'custom_order_expired' || type === 'CUSTOM_ORDER_EXPIRED') {
      return `/ar/notifications`;
    }
    // Refund notifications
    if (type.includes('refund') && orderId) {
      return `/ar/orders/${orderId}`;
    }
    // Support ticket notifications
    if (type.includes('ticket') || type === 'support_message') {
      return `/ar/notifications`;
    }
    // Chat messages
    if (type === 'chat_message' && conversationId) {
      return `/ar/chat/${conversationId}`;
    }
    // Default for customer
    if (orderId) return `/ar/orders/${orderId}`;
    return `/ar/notifications`;
  }

  // Provider notifications
  if (tableName === 'provider_notifications') {
    if (type === 'new_order' && orderId) {
      return `/ar/provider/orders/${orderId}`;
    }
    if (type.startsWith('order_') && orderId) {
      return `/ar/provider/orders/${orderId}`;
    }
    if (type === 'new_review') {
      return `/ar/provider/reviews`;
    }
    if (
      type === 'new_custom_order' ||
      type === 'custom_order_approved' ||
      type === 'custom_order_rejected' ||
      type === 'pricing_expired'
    ) {
      return `/ar/provider/custom-orders`;
    }
    if (type.includes('refund') && orderId) {
      return `/ar/provider/orders/${orderId}`;
    }
    if (type === 'order_message' && orderId) {
      return `/ar/provider/orders/${orderId}?openChat=true`;
    }
    // Default for provider
    if (orderId) return `/ar/provider/orders/${orderId}`;
    return `/ar/provider/notifications`;
  }

  // Admin notifications
  if (tableName === 'admin_notifications') {
    if (type === 'new_ticket' && ticketId) {
      return `/ar/admin/support/${ticketId}`;
    }
    if (type.includes('refund') && orderId) {
      return `/ar/admin/refunds`;
    }
    return `/ar/admin/notifications`;
  }

  return `/ar/notifications`;
}

// ============================================================================
// Extract FCM data payload from a notification record
// Ensures order_id, conversation_id, etc. are included for deep linking
// ============================================================================
function extractNotificationData(
  record: Record<string, unknown>
): Record<string, string> {
  const data: Record<string, string> = {
    notification_id: String(record.id || ''),
    type: String(record.type || ''),
  };

  // Include related_order_id if present (standard orders, messages, refunds)
  if (record.related_order_id) {
    data.order_id = String(record.related_order_id);
  }

  // Include related_provider_id if present
  if (record.related_provider_id) {
    data.provider_id = String(record.related_provider_id);
  }

  // Include related_customer_id if present (provider notifications)
  if (record.related_customer_id) {
    data.customer_id = String(record.related_customer_id);
  }

  // Extract additional data from JSONB 'data' column
  // This includes: broadcast_id, request_id, ticket_id, conversation_id, etc.
  if (record.data && typeof record.data === 'object') {
    const jsonData = record.data as Record<string, unknown>;
    for (const [key, value] of Object.entries(jsonData)) {
      if (value !== null && value !== undefined) {
        data[key] = String(value);
      }
    }
  }

  return data;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
  schema: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let payload: WebhookPayload | null = null;

  try {
    payload = await req.json();

    if (!payload) {
      return new Response(JSON.stringify({ error: 'Empty payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sendNotificationUrl = `${supabaseUrl}/functions/v1/send-notification`;

    // ========================================================================
    // PRIMARY PATH: Notification tables → FCM Push Sync
    // This is the ONLY path for FCM push delivery.
    // DB triggers (notify_customer_order_status, notify_provider_new_order, etc.)
    // INSERT into notification tables → this trigger fires → FCM push is sent.
    // ========================================================================
    if (
      payload.table === 'customer_notifications' ||
      payload.table === 'provider_notifications' ||
      payload.table === 'admin_notifications'
    ) {
      if (payload.type === 'INSERT') {
        const notification = payload.record as {
          id: string;
          user_id?: string;
          customer_id?: string;
          provider_id?: string;
          admin_id?: string;
          title?: string;
          title_ar?: string;
          title_en?: string;
          body?: string;
          body_ar?: string;
          body_en?: string;
          type: string;
          related_order_id?: string;
          related_provider_id?: string;
          related_customer_id?: string;
          data?: Record<string, unknown>;
        };

        // Extract complete data payload for deep linking
        const fcmData = extractNotificationData(notification);

        // Build click_action URL for navigation
        const clickAction = buildClickAction(notification, payload.table);

        // Determine the target user/provider for FCM delivery
        const targetUserId =
          notification.user_id ||
          notification.customer_id ||
          notification.admin_id;
        const targetProviderId = notification.provider_id;

        // For admin notifications table, get admin user IDs
        let targetUserIds: string[] | undefined;
        if (payload.table === 'admin_notifications' && !targetUserId) {
          const { data: admins } = await supabase
            .from('admin_users')
            .select('user_id')
            .eq('is_active', true)
            .limit(50);

          if (admins && admins.length > 0) {
            targetUserIds = admins.map((a: { user_id: string }) => a.user_id);
          }
        }

        const fcmPayload = {
          user_id: targetUserId || undefined,
          user_ids: targetUserIds,
          provider_id: targetProviderId || undefined,
          title: notification.title || notification.title_en || '',
          title_ar: notification.title_ar || notification.title || '',
          body: notification.body || notification.body_en || '',
          body_ar: notification.body_ar || notification.body || '',
          data: fcmData,
          click_action: clickAction,
        };

        console.log(
          `[handle-notification-trigger] Sending FCM for ${payload.table} id=${notification.id} type=${notification.type} click_action=${clickAction}`
        );

        const response = await fetch(sendNotificationUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmPayload),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error(
            `[handle-notification-trigger] FCM send failed for ${payload.table} id=${notification.id}:`,
            JSON.stringify(result)
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            synced: true,
            table: payload.table,
            notification_id: notification.id,
            notification_type: notification.type,
            click_action: clickAction,
            fcm_result: result,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Non-INSERT events on notification tables (UPDATE/DELETE) - no action needed
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'non-INSERT event' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // LEGACY PATH: Source table events (orders, reviews, etc.)
    // After migration 20260219000001, the direct webhook triggers on these
    // tables have been REMOVED. This code is kept as a safety net in case
    // any old trigger still fires, but it should NOT be reached in normal
    // operation. Log a warning if it does.
    // ========================================================================
    console.warn(
      `[handle-notification-trigger] Received event from source table '${payload.table}' ` +
        `(type=${payload.type}). This path should have been removed by migration ` +
        `20260219000001. The notification should flow through notification tables instead.`
    );

    return new Response(
      JSON.stringify({
        success: true,
        skipped: true,
        reason: `Legacy path: ${payload.table} events should flow through notification tables`,
        table: payload.table,
        type: payload.type,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // Enhanced error logging with full context for debugging
    const errorContext = {
      table: payload?.table || 'unknown',
      type: payload?.type || 'unknown',
      record_id: payload?.record?.id || 'unknown',
      error_message: error.message,
      error_stack: error.stack,
    };
    console.error(
      '[handle-notification-trigger] Error:',
      JSON.stringify(errorContext)
    );

    return new Response(
      JSON.stringify({
        error: error.message,
        context: {
          table: errorContext.table,
          type: errorContext.type,
          record_id: errorContext.record_id,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
