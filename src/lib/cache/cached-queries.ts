/**
 * Cached Database Queries
 *
 * Wraps frequently-accessed, rarely-changing data with the existing cache layer.
 * This eliminates hundreds of thousands of unnecessary database queries.
 *
 * Impact: governorates alone had 576,006 queries for 27 static rows.
 */

import { staticCache, appCache } from '@/lib/cache/index';
import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// Governorates Cache (27 rows, rarely change — TTL: 1 hour)
// Before: 576,006 queries | After: ~24 queries/day
// ═══════════════════════════════════════════════════════════════════════════

interface CachedGovernorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

export async function getCachedGovernorates(): Promise<CachedGovernorate[]> {
  const result = await staticCache.getOrSet('governorates:active', async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('governorates')
      .select('id, name_ar, name_en, is_active')
      .eq('is_active', true)
      .order('name_ar');
    return data || [];
  });
  return result as CachedGovernorate[];
}

export async function getCachedAllGovernorates(): Promise<CachedGovernorate[]> {
  const result = await staticCache.getOrSet('governorates:all', async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('governorates')
      .select('id, name_ar, name_en, is_active')
      .order('name_ar');
    return data || [];
  });
  return result as CachedGovernorate[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Business Categories Cache (6 categories — TTL: 1 hour)
// ═══════════════════════════════════════════════════════════════════════════

interface CachedBusinessCategory {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export async function getCachedBusinessCategories(): Promise<CachedBusinessCategory[]> {
  const result = await staticCache.getOrSet('business_categories:active', async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('business_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    return data || [];
  });
  return result as CachedBusinessCategory[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Provider Delivery Fees Cache (per-provider, TTL: 5 min)
// ═══════════════════════════════════════════════════════════════════════════

export async function getCachedDeliveryFees(providerId: string) {
  return appCache.getOrSet(`delivery_fees:${providerId}`, async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('delivery_fees')
      .select('*')
      .eq('provider_id', providerId);
    return data || [];
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Cache Invalidation
// ═══════════════════════════════════════════════════════════════════════════

/** Call when admin updates governorates */
export function invalidateGovernoratesCache() {
  staticCache.delete('governorates:active');
  staticCache.delete('governorates:all');
}

/** Call when admin updates business categories */
export function invalidateCategoriesCache() {
  staticCache.delete('business_categories:active');
}

/** Call when provider updates delivery fees */
export function invalidateDeliveryFeesCache(providerId: string) {
  appCache.delete(`delivery_fees:${providerId}`);
}
