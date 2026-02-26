/**
 * P7: Banner Analytics - Lightweight Event Tracking API
 *
 * POST /api/banners/track
 * Records impression and click events for banner analytics.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { withValidation } from '@/lib/api/validate';
import { successResponse } from '@/lib/api/error-handler';

const trackSchema = z.object({
  banner_id: z.string().min(1),
  event_type: z.enum(['impression', 'click']),
  user_id: z.string().nullable().optional(),
});

export const POST = withValidation(
  { body: trackSchema },
  async (_request: NextRequest, { body }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.from('banner_analytics').insert({
      banner_id: body.banner_id,
      event_type: body.event_type,
      user_id: body.user_id || null,
    });

    if (error) {
      logger.error('[Banner Track] Insert error', { error: error.message });
      throw new Error('Failed to record event');
    }

    return successResponse({ success: true });
  }
);
