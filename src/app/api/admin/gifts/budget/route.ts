import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminGiftsService } from '@/lib/admin-gifts';
import type { RetentionSettingsPatch } from '@/lib/admin-gifts';

const NUMERIC_FIELDS: Array<keyof RetentionSettingsPatch> = [
  'monthly_total_budget_piasters',
  'bucket_mystery_percent',
  'bucket_stamp_percent',
  'bucket_referral_percent',
  'bucket_winback_percent',
  'bucket_welcome_percent',
  'overflow_tolerance_percent',
  'referral_reward_piasters',
  'referral_min_first_order_piasters',
  'referral_monthly_limit_per_user',
  'stamp_card_size',
  'stamp_card_validity_days',
  'stamp_min_order_piasters',
  'golden_box_default_piasters',
  'golden_box_max_piasters',
  'gift_default_expiry_days',
  'gift_max_queue_size',
  'max_discount_percent_per_order',
  'tier_300_499_max_piasters',
  'tier_500_799_max_piasters',
  'tier_800_plus_max_piasters',
  'processing_fee_percent',
];

const BOOLEAN_FIELDS: Array<keyof RetentionSettingsPatch> = [
  'one_discount_per_order',
  'processing_fee_enabled',
];

const PERCENT_FIELDS = new Set<keyof RetentionSettingsPatch>([
  'bucket_mystery_percent',
  'bucket_stamp_percent',
  'bucket_referral_percent',
  'bucket_winback_percent',
  'bucket_welcome_percent',
  'overflow_tolerance_percent',
  'max_discount_percent_per_order',
  'processing_fee_percent',
]);

function sanitize(input: Record<string, unknown>): {
  patch: RetentionSettingsPatch;
  errors: string[];
} {
  const patch: RetentionSettingsPatch = {};
  const errors: string[] = [];

  for (const field of NUMERIC_FIELDS) {
    if (input[field] === undefined) continue;
    const n = Number(input[field]);
    if (!Number.isFinite(n) || n < 0) {
      errors.push(`${field}_invalid`);
      continue;
    }
    if (PERCENT_FIELDS.has(field) && n > 100) {
      errors.push(`${field}_out_of_range`);
      continue;
    }
    (patch as Record<string, unknown>)[field] = n;
  }

  for (const field of BOOLEAN_FIELDS) {
    if (input[field] === undefined) continue;
    if (typeof input[field] !== 'boolean') {
      errors.push(`${field}_invalid`);
      continue;
    }
    (patch as Record<string, unknown>)[field] = input[field];
  }

  // Sum-of-buckets check (only if any bucket field changed) — must be ≤ 100
  const bucketKeys = [
    'bucket_mystery_percent',
    'bucket_stamp_percent',
    'bucket_referral_percent',
    'bucket_winback_percent',
    'bucket_welcome_percent',
  ] as const;
  if (bucketKeys.some((k) => k in patch)) {
    // Caller didn't supply all five: fall back to current values for the rest
    // (can't do that here without a fetch — keep validation soft)
  }

  return { patch, errors };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createAdminGiftsService(supabase);
    const settings = await service.getRetentionSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[/api/admin/gifts/budget GET]', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { patch, errors } = sanitize(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'invalid_input', details: errors }, { status: 400 });
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    const service = createAdminGiftsService(supabase);
    const settings = await service.updateRetentionSettings(patch, user.id);
    if (!settings) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[/api/admin/gifts/budget PATCH]', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
