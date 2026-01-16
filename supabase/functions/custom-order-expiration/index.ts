import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Custom Order Auto-Expiration Edge Function
 * وظيفة انتهاء صلاحية الطلبات المفتوحة
 *
 * This function runs on a schedule (cron) to:
 * 1. Expire broadcasts that have passed their pricing deadline
 * 2. Expire individual requests that haven't been priced in time
 * 3. Cancel customer approval windows that have expired
 * 4. Send notifications to affected users
 *
 * Schedule: Every 5 minutes via pg_cron or external scheduler
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const results = {
      expiredBroadcasts: 0,
      expiredRequests: 0,
      expiredApprovals: 0,
      notificationsSent: 0,
    };

    // =========================================================================
    // 1. Expire Broadcasts Past Pricing Deadline
    // =========================================================================
    const { data: expiredBroadcasts, error: broadcastError } = await supabase
      .from('custom_order_broadcasts')
      .select('id, customer_id, provider_ids')
      .eq('status', 'active')
      .lt('pricing_deadline', now);

    if (broadcastError) {
      console.error('Error fetching expired broadcasts:', broadcastError);
    } else if (expiredBroadcasts && expiredBroadcasts.length > 0) {
      // Check if any request was priced
      for (const broadcast of expiredBroadcasts) {
        const { data: pricedRequests } = await supabase
          .from('custom_order_requests')
          .select('id')
          .eq('broadcast_id', broadcast.id)
          .eq('status', 'priced')
          .limit(1);

        if (!pricedRequests || pricedRequests.length === 0) {
          // No pricing received - expire the broadcast
          const { error: updateError } = await supabase
            .from('custom_order_broadcasts')
            .update({
              status: 'expired',
              updated_at: now,
            })
            .eq('id', broadcast.id);

          if (!updateError) {
            results.expiredBroadcasts++;

            // Also expire all pending requests
            await supabase
              .from('custom_order_requests')
              .update({
                status: 'expired',
                updated_at: now,
              })
              .eq('broadcast_id', broadcast.id)
              .eq('status', 'pending');

            // Notify customer that no pricing was received
            await sendNotification(supabase, supabaseUrl, supabaseServiceKey, {
              user_id: broadcast.customer_id,
              title: 'Order Expired',
              title_ar: 'انتهت صلاحية الطلب',
              body: 'No merchants responded to your custom order',
              body_ar: 'لم يستجب أي تاجر لطلبك المفتوح',
              data: { broadcast_id: broadcast.id, type: 'custom_order_expired' },
            });
            results.notificationsSent++;
          }
        }
      }
    }

    // =========================================================================
    // 2. Expire Individual Requests Past Pricing Timeout
    // =========================================================================
    const { data: expiredRequests, error: requestError } = await supabase
      .from('custom_order_requests')
      .select(
        `
        id,
        provider_id,
        broadcast_id,
        broadcast:custom_order_broadcasts(customer_id)
      `
      )
      .eq('status', 'pending')
      .lt('pricing_expires_at', now);

    if (requestError) {
      console.error('Error fetching expired requests:', requestError);
    } else if (expiredRequests && expiredRequests.length > 0) {
      for (const request of expiredRequests) {
        const { error: updateError } = await supabase
          .from('custom_order_requests')
          .update({
            status: 'expired',
            updated_at: now,
          })
          .eq('id', request.id);

        if (!updateError) {
          results.expiredRequests++;

          // Notify merchant that they missed the deadline
          await sendNotification(supabase, supabaseUrl, supabaseServiceKey, {
            provider_id: request.provider_id,
            title: 'Pricing Deadline Missed',
            title_ar: 'فاتتك مهلة التسعير',
            body: 'A custom order pricing deadline has passed',
            body_ar: 'انتهت مهلة تسعير طلب مفتوح',
            data: { request_id: request.id, type: 'pricing_expired' },
          });
          results.notificationsSent++;
        }
      }
    }

    // =========================================================================
    // 3. Expire Customer Approval Windows
    // =========================================================================
    // Find priced requests where customer hasn't responded in time
    const approvalTimeout = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

    const { data: pendingApprovals, error: approvalError } = await supabase
      .from('custom_order_requests')
      .select(
        `
        id,
        provider_id,
        order_id,
        broadcast:custom_order_broadcasts(customer_id)
      `
      )
      .eq('status', 'priced')
      .lt('priced_at', approvalTimeout);

    if (approvalError) {
      console.error('Error fetching pending approvals:', approvalError);
    } else if (pendingApprovals && pendingApprovals.length > 0) {
      for (const request of pendingApprovals) {
        // Update request status
        const { error: updateError } = await supabase
          .from('custom_order_requests')
          .update({
            status: 'expired',
            updated_at: now,
          })
          .eq('id', request.id);

        if (!updateError) {
          results.expiredApprovals++;

          // Also update the order if exists
          if (request.order_id) {
            await supabase
              .from('orders')
              .update({
                status: 'cancelled',
                cancelled_at: now,
                cancellation_reason: 'Customer approval timeout',
              })
              .eq('id', request.order_id);
          }

          // Notify merchant
          await sendNotification(supabase, supabaseUrl, supabaseServiceKey, {
            provider_id: request.provider_id,
            title: 'Quote Expired',
            title_ar: 'انتهت صلاحية التسعيرة',
            body: 'Customer did not respond to your quote',
            body_ar: 'لم يستجب العميل لتسعيرتك',
            data: { request_id: request.id, type: 'approval_expired' },
          });
          results.notificationsSent++;

          // Notify customer
          const broadcast = Array.isArray(request.broadcast)
            ? request.broadcast[0]
            : request.broadcast;
          if (broadcast?.customer_id) {
            await sendNotification(supabase, supabaseUrl, supabaseServiceKey, {
              user_id: broadcast.customer_id,
              title: 'Quote Expired',
              title_ar: 'انتهت صلاحية العرض',
              body: 'Your quote approval window has expired',
              body_ar: 'انتهت مهلة الموافقة على العرض',
              data: { request_id: request.id, type: 'approval_expired' },
            });
            results.notificationsSent++;
          }
        }
      }
    }

    // =========================================================================
    // 4. Clean up completed broadcasts
    // =========================================================================
    // Mark broadcasts as completed if all requests are either priced, expired, or cancelled
    const { data: activeBroadcasts } = await supabase
      .from('custom_order_broadcasts')
      .select('id')
      .eq('status', 'active')
      .lt('expires_at', now);

    if (activeBroadcasts && activeBroadcasts.length > 0) {
      for (const broadcast of activeBroadcasts) {
        // Check if broadcast has any winning order
        const { data: winningRequest } = await supabase
          .from('custom_order_requests')
          .select('order_id')
          .eq('broadcast_id', broadcast.id)
          .eq('status', 'customer_approved')
          .single();

        if (winningRequest?.order_id) {
          // Has a winner - mark as completed
          await supabase
            .from('custom_order_broadcasts')
            .update({
              status: 'completed',
              winning_order_id: winningRequest.order_id,
              completed_at: now,
              updated_at: now,
            })
            .eq('id', broadcast.id);
        } else {
          // No winner - mark as expired
          await supabase
            .from('custom_order_broadcasts')
            .update({
              status: 'expired',
              updated_at: now,
            })
            .eq('id', broadcast.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in custom-order-expiration:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to send notifications
async function sendNotification(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: {
    user_id?: string;
    provider_id?: string;
    title: string;
    title_ar: string;
    body: string;
    body_ar: string;
    data: Record<string, string>;
  }
) {
  try {
    const sendNotificationUrl = `${supabaseUrl}/functions/v1/send-notification`;

    await fetch(sendNotificationUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
