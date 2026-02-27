/**
 * Webhook Handler for Menu Item Changes
 *
 * This endpoint receives webhooks from Supabase Database Webhooks
 * when menu_items are inserted or updated, and triggers embedding generation.
 *
 * Setup in Supabase Dashboard:
 * 1. Go to Database > Webhooks
 * 2. Create a new webhook
 * 3. Table: menu_items
 * 4. Events: INSERT, UPDATE
 * 5. URL: https://your-domain.com/api/webhooks/menu-item
 * 6. Add a secret header for verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

// Verify webhook signature (if configured)
function verifyWebhookSignature(request: NextRequest): boolean {
  const signature = request.headers.get('x-webhook-signature');
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;

  // If no secret is configured, skip verification (not recommended for production)
  if (!secret) {
    logger.warn('SUPABASE_WEBHOOK_SECRET not configured - skipping signature verification');
    return true;
  }

  // Verify signature matches
  return signature === secret;
}

// Helper to get the Supabase config
function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    name_ar: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    price: number;
    is_available: boolean;
    provider_id: string;
    provider_category_id?: string;
    embedding?: unknown;
  };
  old_record?: {
    id: string;
    name_ar: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    price: number;
    provider_category_id?: string;
  };
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Verify webhook signature
  if (!verifyWebhookSignature(request)) {
    logger.error('Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload: WebhookPayload = await request.json();

  logger.info(`[Webhook] Received ${payload.type} event for menu_items`);

  // Only process INSERT and UPDATE events
  if (payload.type === 'DELETE') {
    return NextResponse.json({ success: true, message: 'DELETE event ignored' });
  }

  const record = payload.record;
  const oldRecord = payload.old_record;

  // Skip if item is not available
  if (!record.is_available) {
    return NextResponse.json({
      success: true,
      message: 'Item not available, skipping embedding generation',
    });
  }

  // For UPDATE, check if relevant fields changed
  if (payload.type === 'UPDATE' && oldRecord) {
    const relevantFieldsChanged =
      record.name_ar !== oldRecord.name_ar ||
      record.name_en !== oldRecord.name_en ||
      record.description_ar !== oldRecord.description_ar ||
      record.description_en !== oldRecord.description_en ||
      record.price !== oldRecord.price ||
      record.provider_category_id !== oldRecord.provider_category_id;

    if (!relevantFieldsChanged) {
      return NextResponse.json({
        success: true,
        message: 'No relevant fields changed, skipping embedding generation',
      });
    }
  }

  // Trigger embedding generation
  const { url, serviceKey } = getSupabaseConfig();

  if (!url || !serviceKey) {
    logger.error('Supabase configuration missing');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  logger.info('[Webhook] Triggering embedding generation', { itemId: record.id });

  const response = await fetch(`${url}/functions/v1/generate-embedding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      item_id: record.id,
      mode: 'single',
    }),
  });

  const result = await response.json();

  if (!result.success) {
    logger.error('[Webhook] Embedding generation failed', { error: result.error });
    // Don't return error - webhook should always return 200 to prevent retries
    return NextResponse.json({
      success: false,
      message: 'Embedding generation queued for retry',
      error: result.error,
    });
  }

  logger.info('[Webhook] Embedding generated successfully', { itemId: record.id });

  return NextResponse.json({
    success: true,
    message: 'Embedding generated',
    item_id: record.id,
  });
});

// Handle GET for health check
export const GET = withErrorHandler(async () => {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'menu-item webhook',
    description: 'Receives INSERT/UPDATE events from menu_items table',
  });
});
