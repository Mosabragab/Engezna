/**
 * PATCH /api/admin/tier-rewards/[tier]
 *
 * Updates a single tier's benefits config. Admin-only.
 *
 * Body: any subset of {
 *   deliveryDiscountPercent, freeDeliveriesPerMonth,
 *   freeDeliveryMinOrderPiasters, freeDeliveryUnlimited,
 *   monthlyBoxValuePiasters, prioritySupport, accountManager
 * }
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §6.1.A (v2.5.2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { TierRewardsService } from '@/lib/tier-rewards';
import type { LoyaltyTier, TierConfig } from '@/lib/tier-rewards';

const VALID_TIERS: ReadonlySet<LoyaltyTier> = new Set(['bronze', 'silver', 'gold', 'platinum']);

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin() {
  const userClient = await createServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 as const };

  const { data: adminRow } = await userClient
    .from('admin_users')
    .select('id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!adminRow) return { error: 'Forbidden', status: 403 as const };

  return { admin: adminRow };
}

type IncomingPatch = Partial<Omit<TierConfig, 'tier'>>;

function validatePatch(input: unknown): { patch: IncomingPatch; errors: string[] } {
  const errors: string[] = [];
  const patch: IncomingPatch = {};

  if (!input || typeof input !== 'object') {
    return { patch, errors: ['invalid_body'] };
  }
  const body = input as Record<string, unknown>;

  const numericFields: Array<keyof IncomingPatch> = [
    'deliveryDiscountPercent',
    'freeDeliveriesPerMonth',
    'freeDeliveryMinOrderPiasters',
    'monthlyBoxValuePiasters',
  ];

  for (const field of numericFields) {
    if (body[field] === undefined || body[field] === null) continue;
    const n = Number(body[field]);
    if (!Number.isFinite(n) || n < 0) {
      errors.push(`${field}_invalid`);
      continue;
    }
    if (field === 'deliveryDiscountPercent' && n > 100) {
      errors.push('deliveryDiscountPercent_out_of_range');
      continue;
    }
    (patch as Record<string, unknown>)[field] = n;
  }

  const booleanFields: Array<keyof IncomingPatch> = [
    'freeDeliveryUnlimited',
    'prioritySupport',
    'accountManager',
  ];
  for (const field of booleanFields) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'boolean') {
      errors.push(`${field}_invalid`);
      continue;
    }
    (patch as Record<string, unknown>)[field] = body[field];
  }

  return { patch, errors };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tier: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ('error' in guard) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { tier } = await params;
    if (!VALID_TIERS.has(tier as LoyaltyTier)) {
      return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const { patch, errors } = validatePatch(body);
    if (errors.length) {
      return NextResponse.json({ error: 'validation_failed', errors }, { status: 400 });
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'empty_patch' }, { status: 400 });
    }

    const service = new TierRewardsService(getAdminSupabase());
    await service.updateConfig(tier as LoyaltyTier, patch);

    const tiers = await service.getAllConfig();
    const updated = tiers.find((t) => t.tier === tier);

    return NextResponse.json({ tier: updated });
  } catch (error) {
    console.error('[/api/admin/tier-rewards/[tier] PATCH]', error);
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
  }
}
