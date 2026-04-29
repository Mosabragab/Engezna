import type {
  AnySupabaseClient,
  GiftBoxEntry,
  GiftStamp,
  RetentionSettings,
  GrantGiftParams,
  UseGiftParams,
  FaultSource,
} from './types';
import { shouldClawback, getDefaultSettings } from './helpers';

const SETTINGS_TTL_MS = 60_000; // 1 minute

export class GiftEngine {
  private supabase: AnySupabaseClient;
  private settings: RetentionSettings | null = null;
  private settingsFetchedAt = 0;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Returns retention settings, with a 60-second TTL cache. Pass forceRefresh
   * after admin updates to invalidate the cache immediately.
   */
  async getSettings(forceRefresh = false): Promise<RetentionSettings> {
    const now = Date.now();
    if (!forceRefresh && this.settings && now - this.settingsFetchedAt < SETTINGS_TTL_MS) {
      return this.settings;
    }

    const { data, error } = await this.supabase
      .from('retention_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      this.settings = getDefaultSettings();
    } else {
      this.settings = data as RetentionSettings;
    }
    this.settingsFetchedAt = now;
    return this.settings;
  }

  /**
   * Grant a gift atomically via grant_gift_atomic RPC.
   * Budget check, queue check, insert, and financial log all in one transaction.
   * Returns the created entry, or null on budget/queue failure.
   */
  async grantGift(params: GrantGiftParams): Promise<GiftBoxEntry | null> {
    const { data, error } = await this.supabase.rpc('grant_gift_atomic', {
      p_user_id: params.userId,
      p_gift_id: params.giftId || null,
      p_source: params.source,
      p_rule_id: params.ruleId || null,
      p_bucket_name: params.bucketName,
      p_cost_piasters: params.costPiasters,
      p_funder_type: params.funderType || 'engezna',
      p_funder_provider_id: params.funderProviderId || null,
      p_expiry_days: params.expiryDays || null,
    });

    if (error) {
      console.error('[GiftEngine] grant_gift_atomic failed:', error);
      return null;
    }

    if (!data || (data as GiftBoxEntry).id === null || (data as GiftBoxEntry).id === undefined) {
      return null;
    }

    return data as GiftBoxEntry;
  }

  /**
   * Open a gift atomically via open_gift_atomic RPC.
   * Conditional update enforces ownership (via auth.uid()) + status + non-expired.
   */
  async openGift(giftEntryId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('open_gift_atomic', {
      p_id: giftEntryId,
    });

    if (error) {
      console.error('[GiftEngine] open_gift_atomic failed:', error);
      return false;
    }
    return Boolean(data);
  }

  /**
   * Use a gift atomically via use_gift_atomic RPC.
   * Conditional update + financial log in one transaction; returns 0 if not eligible.
   */
  async useGift(params: UseGiftParams): Promise<{
    success: boolean;
    discountPiasters: number;
  }> {
    const { data, error } = await this.supabase.rpc('use_gift_atomic', {
      p_id: params.giftEntryId,
      p_user_id: params.userId,
      p_order_id: params.orderId,
    });

    if (error) {
      console.error('[GiftEngine] use_gift_atomic failed:', error);
      return { success: false, discountPiasters: 0 };
    }

    const discount = Number(data) || 0;
    return { success: discount > 0, discountPiasters: discount };
  }

  /**
   * Expire a single gift atomically via expire_gift_entry RPC.
   * Conditional update enforces status + past-expiry; logs in same transaction.
   */
  async expireGift(giftEntryId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('expire_gift_entry', {
      p_id: giftEntryId,
    });

    if (error) {
      console.error('[GiftEngine] expire_gift_entry failed:', error);
      return false;
    }
    return Boolean(data);
  }

  /**
   * Revoke a gift atomically via revoke_gift_atomic RPC.
   * Conditional update (only revokes non-used gifts) + log in one transaction.
   */
  async revokeGift(giftEntryId: string, reason: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('revoke_gift_atomic', {
      p_id: giftEntryId,
      p_reason: reason,
    });

    if (error) {
      console.error('[GiftEngine] revoke_gift_atomic failed:', error);
      return false;
    }
    return Boolean(data);
  }

  /**
   * Process clawback atomically via clawback_order_atomic RPC.
   * Single transaction inserts a clawback row for every used gift on the order.
   * Throws on failure so callers (refund cron) can retry.
   */
  async processClawback(orderId: string, faultSource: FaultSource): Promise<number> {
    if (!shouldClawback(faultSource)) return 0;

    const { data, error } = await this.supabase.rpc('clawback_order_atomic', {
      p_order_id: orderId,
      p_fault_source: faultSource,
    });

    if (error) {
      throw new Error(`[GiftEngine] clawback_order_atomic failed: ${error.message}`);
    }
    return Number(data) || 0;
  }

  /**
   * Add a stamp atomically via add_gift_stamp_atomic RPC.
   * Idempotent — duplicate orderId is silently ignored via UNIQUE constraint.
   * If the card just completed, grants the golden box and assigns it
   * conditionally (only if golden_box_id is still null).
   */
  async addStamp(
    userId: string,
    orderId: string,
    subtotalPiasters: number
  ): Promise<GiftStamp | null> {
    const { data, error } = await this.supabase.rpc('add_gift_stamp_atomic', {
      p_user_id: userId,
      p_order_id: orderId,
      p_subtotal_piasters: subtotalPiasters,
    });

    if (error) {
      console.error('[GiftEngine] add_gift_stamp_atomic failed:', error);
      return null;
    }

    if (!data) return null;

    const card = data as GiftStamp;

    if (card.is_completed && !card.golden_box_id) {
      await this.grantGoldenBox(userId, card.id);
    }

    return card;
  }

  private async grantGoldenBox(userId: string, stampCardId: string): Promise<void> {
    const settings = await this.getSettings();
    const value = Math.min(settings.golden_box_default_piasters, settings.golden_box_max_piasters);

    const { data: goldenGift } = await this.supabase
      .from('gifts')
      .select('id')
      .eq('type', 'golden_box')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const goldenEntry = await this.grantGift({
      userId,
      giftId: goldenGift?.id || null,
      source: 'stamp_card',
      bucketName: 'stamp',
      costPiasters: value,
    });

    if (!goldenEntry) return;

    // Conditional assignment: only set golden_box_id if it's still null.
    // If a concurrent request already assigned a golden box, revoke this one
    // so we don't double-credit the user.
    const { data: assigned } = await this.supabase
      .from('gift_stamps')
      .update({ golden_box_id: goldenEntry.id })
      .eq('id', stampCardId)
      .is('golden_box_id', null)
      .select('id')
      .maybeSingle();

    if (!assigned) {
      await this.revokeGift(goldenEntry.id, 'duplicate_golden_box_race');
    }
  }

  /**
   * Batch-expire overdue gifts via expire_overdue_gifts_batch RPC.
   * Single transaction updates all overdue rows + inserts log entries.
   */
  async expireAllOverdue(): Promise<number> {
    const { data, error } = await this.supabase.rpc('expire_overdue_gifts_batch');

    if (error) {
      console.error('[GiftEngine] expire_overdue_gifts_batch failed:', error);
      return 0;
    }
    return Number(data) || 0;
  }

  async getUserGiftBox(userId: string): Promise<GiftBoxEntry[]> {
    const { data, error } = await this.supabase
      .from('gift_box_entries')
      .select('*, gift:gifts(*)')
      .eq('user_id', userId)
      .in('status', ['granted', 'opened'])
      .order('expires_at', { ascending: true });

    if (error) return [];
    return (data || []) as GiftBoxEntry[];
  }

  async getUserStampCard(userId: string): Promise<GiftStamp | null> {
    const { data } = await this.supabase
      .from('gift_stamps')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .single();

    return (data as GiftStamp) || null;
  }
}

export function createGiftEngine(supabase: AnySupabaseClient): GiftEngine {
  return new GiftEngine(supabase);
}
