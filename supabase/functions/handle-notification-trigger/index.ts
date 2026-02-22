import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Firebase project configuration
const FIREBASE_PROJECT_ID = 'engezna-6edd0';

interface FCMMessage {
  token?: string;
  topic?: string;
  notification: {
    title: string;
    body: string;
    image?: string;
  };
  data?: Record<string, string>;
  webpush?: {
    fcm_options?: { link?: string };
    notification?: {
      icon?: string;
      badge?: string;
      vibrate?: number[];
      requireInteraction?: boolean;
      tag?: string;
      renotify?: boolean;
    };
  };
  android?: {
    priority: string;
    notification: {
      click_action?: string;
      icon?: string;
      color?: string;
      sound?: string;
      channel_id?: string;
      default_sound?: boolean;
      default_vibrate_timings?: boolean;
    };
  };
  apns?: {
    payload: {
      aps: {
        sound: string;
        badge?: number;
        'mutable-content'?: number;
      };
    };
  };
}

// ============================================================================
// FCM Direct Integration (avoids function-to-function HTTP call)
// ============================================================================

// Get OAuth2 access token using Firebase service account
async function getFirebaseAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable not set');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const claimsB64 = btoa(JSON.stringify(claims))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const signatureInput = `${headerB64}.${claimsB64}`;

  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), (c: string) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get Firebase access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Send a single FCM message
async function sendFCMMessageOnce(
  accessToken: string,
  message: FCMMessage
): Promise<{ success: boolean; error?: string; retryable?: boolean }> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    const errorCode = error.error?.details?.[0]?.errorCode;
    const errorMessage = error.error?.message || 'Unknown FCM error';
    const statusCode = response.status;

    console.error(
      `[FCM] Error (HTTP ${statusCode}):`,
      JSON.stringify({
        errorCode,
        message: errorMessage,
        token: message.token ? `${message.token.substring(0, 10)}...` : 'topic',
      })
    );

    if (errorCode === 'UNREGISTERED')
      return { success: false, error: 'UNREGISTERED', retryable: false };
    if (errorCode === 'INVALID_ARGUMENT' || statusCode === 400)
      return { success: false, error: errorMessage, retryable: false };
    if (statusCode >= 500 || statusCode === 429)
      return { success: false, error: errorMessage, retryable: true };
    return { success: false, error: errorMessage, retryable: false };
  }

  return { success: true };
}

// Send FCM message with retry
async function sendFCMMessage(
  accessToken: string,
  message: FCMMessage,
  maxRetries = 2
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await sendFCMMessageOnce(accessToken, message);
    if (result.success) return { success: true };
    if (!result.retryable) return { success: false, error: result.error };
    if (attempt < maxRetries) {
      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`[FCM] Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

// Mark token as invalid in database
async function markTokenInvalid(supabase: ReturnType<typeof createClient>, token: string) {
  await supabase.rpc('mark_fcm_token_invalid', { p_token: token });
}

// Determine if notification requires user interaction (won't auto-dismiss)
function isImportantNotification(type: string): boolean {
  const importantTypes = [
    'new_order',
    'order_cancelled',
    'refund_request',
    'refund_escalated',
    'new_ticket',
    'new_custom_order',
  ];
  return importantTypes.includes(type);
}

// Build FCM message for a token
function buildFCMMessage(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  clickAction: string,
  imageUrl?: string
): FCMMessage {
  const notificationType = data?.type || 'default';
  const notificationTag = `engezna-${notificationType}`;

  return {
    token,
    notification: { title, body, image: imageUrl },
    data: { ...data, click_action: clickAction },
    webpush: {
      fcm_options: { link: clickAction },
      notification: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        requireInteraction: isImportantNotification(notificationType),
        tag: notificationTag,
        renotify: true,
      },
    },
    android: {
      priority: 'high',
      notification: {
        click_action: clickAction || 'FLUTTER_NOTIFICATION_CLICK',
        icon: 'ic_notification',
        color: '#008B8B',
        sound: 'default',
        channel_id: 'engezna_notifications',
        default_sound: true,
        default_vibrate_timings: true,
      },
    },
    apns: {
      payload: {
        aps: { sound: 'default', 'mutable-content': 1 },
      },
    },
  };
}

// Send FCM push to user(s) or provider directly
async function sendPushNotifications(
  supabase: ReturnType<typeof createClient>,
  accessToken: string,
  params: {
    userId?: string;
    userIds?: string[];
    providerId?: string;
    title: string;
    body: string;
    data: Record<string, string>;
    clickAction: string;
    imageUrl?: string;
  }
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  const sendToToken = async (token: string) => {
    const message = buildFCMMessage(
      token,
      params.title,
      params.body,
      params.data,
      params.clickAction,
      params.imageUrl
    );
    const result = await sendFCMMessage(accessToken, message);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(result.error || 'Unknown error');
      if (result.error === 'UNREGISTERED') {
        await markTokenInvalid(supabase, token);
      }
    }
  };

  // Send to specific user(s)
  if (params.userId || params.userIds) {
    const userIds = params.userIds || [params.userId!];
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token, user_id')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
    } else if (tokens && tokens.length > 0) {
      for (const { token } of tokens) {
        await sendToToken(token);
      }
    }
  }

  // Send to provider staff
  if (params.providerId) {
    const { data: tokens, error: tokensError } = await supabase.rpc('get_provider_staff_tokens', {
      p_provider_id: params.providerId,
    });

    if (tokensError) {
      console.error('Error fetching provider tokens:', tokensError);
    } else if (tokens && tokens.length > 0) {
      for (const tokenData of tokens) {
        await sendToToken(tokenData.token);
      }
    }
  }

  return results;
}

// ============================================================================
// Build click_action URL based on notification type and table
// This determines where the user navigates when clicking the push notification
// ============================================================================
function buildClickAction(record: Record<string, unknown>, tableName: string): string {
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
    if ((type === 'custom_order_priced' || type === 'CUSTOM_ORDER_PRICED') && broadcastId) {
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
function extractNotificationData(record: Record<string, unknown>): Record<string, string> {
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

    // ========================================================================
    // PRIMARY PATH: Notification tables → FCM Push (Direct)
    // DB triggers INSERT into notification tables → this trigger fires →
    // FCM push is sent directly (no function-to-function HTTP call).
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
          notification.user_id || notification.customer_id || notification.admin_id;
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

        const title = notification.title_ar || notification.title || '';
        const body = notification.body_ar || notification.body || '';

        console.log(
          `[handle-notification-trigger] Sending FCM for ${payload.table} id=${notification.id} type=${notification.type} click_action=${clickAction}`
        );

        // Get Firebase access token and send directly
        let fcmResult: { sent: number; failed: number; errors: string[] } = {
          sent: 0,
          failed: 0,
          errors: [],
        };
        try {
          const accessToken = await getFirebaseAccessToken();

          fcmResult = await sendPushNotifications(supabase, accessToken, {
            userId: targetUserId || undefined,
            userIds: targetUserIds,
            providerId: targetProviderId || undefined,
            title,
            body,
            data: fcmData,
            clickAction,
          });
        } catch (fcmError) {
          console.error(
            `[handle-notification-trigger] FCM error for ${payload.table} id=${notification.id}:`,
            fcmError.message
          );
          fcmResult.errors.push(fcmError.message);
        }

        return new Response(
          JSON.stringify({
            success: true,
            synced: true,
            table: payload.table,
            notification_id: notification.id,
            notification_type: notification.type,
            click_action: clickAction,
            fcm_result: fcmResult,
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
    console.error('[handle-notification-trigger] Error:', JSON.stringify(errorContext));

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
