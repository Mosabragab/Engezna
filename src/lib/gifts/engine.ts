import { Money } from '@/lib/finance/money';
import type {
  AnySupabaseClient,
  GiftBoxEntry,
  GiftStamp,
  RetentionSettings,
  GrantGiftParams,
  UseGiftParams,
  GiftFinancialLogEntry,
  BucketName,
  FaultSource,
} from './types';
import {
  checkBudgetAvailable,
  calculateGiftExpiry,
  clampGiftValue,
  shouldClawback,
  calculateClawbackPoints,
  getDefaultSettings,
} from './helpers';

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

  private async getBucketSpent(bucket: BucketName): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('gift_financial_log')
      .select('amount_piasters')
      .eq('bucket', bucket)
      .eq('funder_type', 'engezna')
      .gte('created_at', startOfMonth.toISOString())
      .in('transaction_type', ['grant']);

    if (error || !data) return 0;
    return data.reduce(
      (sum: number, row: { amount_piasters: number }) => sum + row.amount_piasters,
      0
    );
  }

  private async getActiveGiftCount(userId: string): Promise<{
    count: number;
    latestExpiry: Date | null;
  }> {
    const { data, error } = await this.supabase
      .from('gift_box_entries')
      .select('expires_at')
      .eq('user_id', userId)
      .in('status', ['granted', 'opened'])
      .order('expires_at', { ascending: false })
      .limit(1);

    if (error || !data) return { count: 0, latestExpiry: null };

    const { count } = await this.supabase
      .from('gift_box_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['granted', 'opened']);

    return {
      count: count || 0,
      latestExpiry: data.length > 0 ? new Date(data[0].expires_at) : null,
    };
  }

  async grantGift(params: GrantGiftParams): Promise<GiftBoxEntry | null> {
    const settings = await this.getSettings();

    const bucketSpent = await this.getBucketSpent(params.bucketName as BucketName);
    const budget = checkBudgetAvailable(
      params.bucketName as BucketName,
      bucketSpent,
      params.costPiasters,
      settings
    );

    if (budget.is_exhausted) {
      console.warn(`[GiftEngine] Budget exhausted for bucket ${params.bucketName}`);
      return null;
    }

    const { count, latestExpiry } = await this.getActiveGiftCount(params.userId);
    const expiryDays = params.expiryDays || settings.gift_default_expiry_days;
    const { canGrant, expiresAt } = calculateGiftExpiry(
      count,
      latestExpiry,
      expiryDays,
      settings.gift_max_queue_size
    );

    if (!canGrant || !expiresAt) {
      console.warn(
        `[GiftEngine] Gift queue full for user ${params.userId} (${count}/${settings.gift_max_queue_size})`
      );
      return null;
    }

    const { data: entry, error } = await this.supabase
      .from('gift_box_entries')
      .insert({
        user_id: params.userId,
        gift_id: params.giftId,
        source: params.source,
        rule_id: params.ruleId || null,
        status: 'granted',
        expires_at: expiresAt.toISOString(),
        bucket_name: params.bucketName,
        cost_piasters: params.costPiasters,
        funder_type: params.funderType || 'engezna',
        funder_provider_id: params.funderProviderId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[GiftEngine] Failed to grant gift:', error);
      return null;
    }

    await this.logFinancial({
      transaction_type: 'grant',
      amount_piasters: params.costPiasters,
      bucket: params.bucketName,
      funder_type: params.funderType || 'engezna',
      funder_provider_id: params.funderProviderId || null,
      user_id: params.userId,
      gift_entry_id: entry.id,
    });

    return entry as GiftBoxEntry;
  }

  async openGift(giftEntryId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('gift_box_entries')
      .update({ status: 'opened', opened_at: new Date().toISOString() })
      .eq('id', giftEntryId)
      .eq('user_id', userId)
      .eq('status', 'granted');

    if (error) {
      console.error('[GiftEngine] Failed to open gift:', error);
      return false;
    }
    return true;
  }

  async useGift(params: UseGiftParams): Promise<{
    success: boolean;
    discountPiasters: number;
  }> {
    const { data: entry, error: fetchError } = await this.supabase
      .from('gift_box_entries')
      .select('*, gift:gifts(*)')
      .eq('id', params.giftEntryId)
      .eq('user_id', params.userId)
      .in('status', ['granted', 'opened'])
      .single();

    if (fetchError || !entry) {
      return { success: false, discountPiasters: 0 };
    }

    const now = new Date();
    if (new Date(entry.expires_at) < now) {
      await this.expireGift(params.giftEntryId);
      return { success: false, discountPiasters: 0 };
    }

    const { error: updateError } = await this.supabase
      .from('gift_box_entries')
      .update({
        status: 'used',
        used_at: now.toISOString(),
        used_order_id: params.orderId,
      })
      .eq('id', params.giftEntryId);

    if (updateError) {
      console.error('[GiftEngine] Failed to use gift:', updateError);
      return { success: false, discountPiasters: 0 };
    }

    await this.logFinancial({
      transaction_type: 'use',
      amount_piasters: entry.cost_piasters,
      bucket: entry.bucket_name,
      funder_type: entry.funder_type,
      funder_provider_id: entry.funder_provider_id,
      user_id: params.userId,
      gift_entry_id: params.giftEntryId,
      order_id: params.orderId,
    });

    return { success: true, discountPiasters: entry.cost_piasters };
  }

  async expireGift(giftEntryId: string): Promise<boolean> {
    const { data: entry } = await this.supabase
      .from('gift_box_entries')
      .select('user_id, cost_piasters, bucket_name, funder_type, funder_provider_id')
      .eq('id', giftEntryId)
      .in('status', ['granted', 'opened'])
      .single();

    if (!entry) return false;

    const { error } = await this.supabase
      .from('gift_box_entries')
      .update({ status: 'expired' })
      .eq('id', giftEntryId);

    if (error) return false;

    await this.logFinancial({
      transaction_type: 'expire',
      amount_piasters: entry.cost_piasters,
      bucket: entry.bucket_name,
      funder_type: entry.funder_type,
      funder_provider_id: entry.funder_provider_id,
      user_id: entry.user_id,
      gift_entry_id: giftEntryId,
      notes: 'Auto-expired',
    });

    return true;
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
      .eq('id', giftEntryId);

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

  async addStamp(
    userId: string,
    orderId: string,
    subtotalPiasters: number
  ): Promise<GiftStamp | null> {
    const settings = await this.getSettings();

    if (subtotalPiasters < settings.stamp_min_order_piasters) {
      return null;
    }

    const { data: activeCard } = await this.supabase
      .from('gift_stamps')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .single();

    const now = new Date();

    if (activeCard && new Date(activeCard.card_expires_at) < now) {
      await this.supabase
        .from('gift_stamps')
        .update({ is_completed: true })
        .eq('id', activeCard.id);
    }

    const validCard = activeCard && new Date(activeCard.card_expires_at) >= now ? activeCard : null;

    if (validCard) {
      const newCount = validCard.stamp_count + 1;
      const orderIds = [...(validCard.order_ids || []), orderId];
      const isCompleted = newCount >= settings.stamp_card_size;

      const { data: updated, error } = await this.supabase
        .from('gift_stamps')
        .update({
          stamp_count: newCount,
          order_ids: orderIds,
          is_completed: isCompleted,
        })
        .eq('id', validCard.id)
        .select()
        .single();

      if (error) return null;

      if (isCompleted) {
        await this.grantGoldenBox(userId, updated.id, settings);
      }

      return updated as GiftStamp;
    }

    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + settings.stamp_card_validity_days);

    const { data: newCard, error } = await this.supabase
      .from('gift_stamps')
      .insert({
        user_id: userId,
        stamp_count: 1,
        order_ids: [orderId],
        card_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) return null;
    return newCard as GiftStamp;
  }

  private async grantGoldenBox(
    userId: string,
    stampCardId: string,
    settings: RetentionSettings
  ): Promise<void> {
    const value = Math.min(settings.golden_box_default_piasters, settings.golden_box_max_piasters);

    const { data: goldenGift } = await this.supabase
      .from('gifts')
      .select('id')
      .eq('type', 'golden_box')
      .eq('is_active', true)
      .limit(1)
      .single();

    const goldenEntry = await this.grantGift({
      userId,
      giftId: goldenGift?.id || '',
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
