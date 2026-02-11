/**
 * P7: Banner Analytics - Lightweight Event Tracking API
 *
 * POST /api/banners/track
 * Records impression and click events for banner analytics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface TrackRequest {
  banner_id: string;
  event_type: 'impression' | 'click';
  user_id?: string | null;
}

interface TrackResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TrackResponse>> {
  let body: TrackRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { banner_id, event_type, user_id } = body;

  if (!banner_id || !event_type) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: banner_id, event_type' },
      { status: 400 }
    );
  }

  if (!['impression', 'click'].includes(event_type)) {
    return NextResponse.json(
      { success: false, error: 'event_type must be impression or click' },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const { error } = await supabase.from('banner_analytics').insert({
      banner_id,
      event_type,
      user_id: user_id || null,
    });

    if (error) {
      console.error('[Banner Track] Insert error:', error.message);
      return NextResponse.json(
        { success: false, error: 'Failed to record event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Banner Track] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
