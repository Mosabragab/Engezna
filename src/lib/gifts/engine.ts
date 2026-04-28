import type {
  AnySupabaseClient,
  GiftBoxEntry,
  GiftStamp,
  RetentionSettings,
  GrantGiftParams,
  UseGiftParams,
  GiftFinancialLogEntry,
  FaultSource,
} from './types';
import { shouldClawback, getDefaultSettings } from './helpers';

export class GiftEngine {
  private supabase: AnySupabaseClient;
  private settings: RetentionSettings | null = null;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
  }

  async getSettings(): Promise<RetentionSettings> {
    if (this.settings) return this.settings;

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

    return this.settings;
  }

  private async logFinancial(entry: GiftFinancialLogEntry): Promise<void> {
    const { error } = await this.supabase.from('gift_financial_log').insert(entry);

    if (error) {
      throw new Error(
        `[GiftEngine] Financial log FAILED — ${error.message}. Entry: ${JSON.stringify({ type: entry.transaction_type, amount: entry.amount_piasters, user: entry.user_id })}`
      );
    }
  }

  /**
   * Grant a gift atomically via grant_gift_atomic RPC.
   * - Budget check, queue check, insert, and financial log all in one transaction.
   * - Returns the created entry, or null on budget/queue failure.
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

  async revokeGift(giftEntryId: string, reason: string): Promise<boolean> {
    const { data: entry } = await this.supabase
      .from('gift_box_entries')
      .select('user_id, cost_piasters, bucket_name, funder_type, funder_provider_id, status')
      .eq('id', giftEntryId)
      .single();

    if (!entry || entry.status === 'used') return false;

    const { error } = await this.supabase
      .from('gift_box_entries')
      .update({ status: 'revoked' })
      .eq('id', giftEntryId)
      .neq('status', 'used');

    if (error) return false;

    await this.logFinancial({
      transaction_type: 'revoke',
      amount_piasters: entry.cost_piasters,
      bucket: entry.bucket_name,
      funder_type: entry.funder_type,
      funder_provider_id: entry.funder_provider_id,
      user_id: entry.user_id,
      gift_entry_id: giftEntryId,
      notes: reason,
    });

    return true;
  }

  async processClawback(orderId: string, faultSource: FaultSource): Promise<void> {
    if (!shouldClawback(faultSource)) return;

    const { data: entries } = await this.supabase
      .from('gift_box_entries')
      .select('id, status, cost_piasters, user_id, bucket_name, funder_type, funder_provider_id')
      .eq('used_order_id', orderId)
      .eq('status', 'used');

    if (!entries || entries.length === 0) return;

    for (const entry of entries) {
      await this.logFinancial({
        transaction_type: 'clawback',
        amount_piasters: entry.cost_piasters,
        bucket: entry.bucket_name,
        funder_type: entry.funder_type,
        funder_provider_id: entry.funder_provider_id,
        user_id: entry.user_id,
        gift_entry_id: entry.id,
        order_id: orderId,
        notes: `Clawback due to ${faultSource} refund on order ${orderId}`,
      });
    }
  }

  /**
   * Add a stamp atomically via add_gift_stamp_atomic RPC.
   * Idempotent — duplicate orderId is silently ignored via UNIQUE constraint.
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

    // If card just completed, grant the golden box
    if (card.is_completed && !card.golden_box_id) {
      await this.grantGoldenBox(userId, card.id);
    }

    return card;
  }

  private async grantGoldenBox(userId: string, stampCardId: string): Promise<void> {
    const settings = await this.getSettings();
    const value = Math.min(settings.golden_box_default_piasters, settings.golden_box_max_piasters);

    // Resolve a golden_box gift template if one exists; otherwise grant with NULL gift_id
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

    if (goldenEntry) {
      await this.supabase
        .from('gift_stamps')
        .update({ golden_box_id: goldenEntry.id })
        .eq('id', stampCardId);
    }
  }

  async expireAllOverdue(): Promise<number> {
    const now = new Date().toISOString();
    const { data: expired } = await this.supabase
      .from('gift_box_entries')
      .select('id')
      .in('status', ['granted', 'opened'])
      .lt('expires_at', now);

    if (!expired || expired.length === 0) return 0;

    let count = 0;
    for (const entry of expired) {
      const success = await this.expireGift(entry.id);
      if (success) count++;
    }
    return count;
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
