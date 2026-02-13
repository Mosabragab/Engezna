/**
 * API Route for Embedding Management
 *
 * GET: Get embedding statistics
 * POST: Trigger embedding generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// Helper to get the Supabase URL and key for Edge Function calls
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return { url, serviceKey, anonKey };
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Get embedding statistics
    const { data, error } = await supabase.rpc('get_embedding_stats');

    if (error) {
      // If function doesn't exist, calculate manually
      const { count: total } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true);

      const { count: withEmbedding } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)
        .not('embedding', 'is', null);

      const { count: pendingQueue } = await supabase
        .from('embedding_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return NextResponse.json({
        total_items: total || 0,
        items_with_embedding: withEmbedding || 0,
        items_without_embedding: (total || 0) - (withEmbedding || 0),
        coverage_percentage: total ? (((withEmbedding || 0) / total) * 100).toFixed(2) : '0',
        pending_in_queue: pendingQueue || 0,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error getting embedding stats', { error });
    return NextResponse.json({ error: 'Failed to get embedding statistics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode = 'catchup', item_id, item_ids, limit = 50 } = body;

    const { url, serviceKey } = getSupabaseConfig();

    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Call the Edge Function
    const response = await fetch(`${url}/functions/v1/generate-embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        mode,
        item_id,
        item_ids,
        limit,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Embedding generation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error triggering embedding generation', { error });
    return NextResponse.json({ error: 'Failed to trigger embedding generation' }, { status: 500 });
  }
}
