import type {
  AnySupabaseClient,
  BucketDistribution,
  DailyGrantsPoint,
  GiftRuleRow,
  GiftsOverviewKpis,
  RetentionSettingsPatch,
  RetentionSettingsRow,
  SegmentDistribution,
} from './types';

/**
 * AdminGiftsService — read-only aggregations over the gift system tables
 * (gift_box_entries, gift_financial_log, customer_segments_daily, etc.)
 * plus CRUD on gift_rules and retention_settings for the admin dashboard.
 *
 * All callers must be authorized admins; routes layer is responsible for
 * the auth/permission check before invoking these methods.
 */
export class AdminGiftsService {
  private supabase: AnySupabaseClient;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
  }

  // ─── Overview KPIs ─────────────────────────────────────────────────────
  async getOverview(): Promise<GiftsOverviewKpis> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run independent counts in parallel — Supabase head:true returns count only
    const [
      activeGiftsRes,
      grantedTodayRes,
      usedTodayRes,
      expiredTodayRes,
      grantedLast30Res,
      usedLast30Res,
      partnerPendingRes,
      activeRulesRes,
      activeCampaignsRes,
      financialThisMonthRes,
      retentionRes,
    ] = await Promise.all([
      this.supabase
        .from('gift_box_entries')
        .select('id', { count: 'exact', head: true })
        .in('status', ['granted', 'opened']),
      this.supabase
        .from('gift_box_entries')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString()),
      this.supabase
        .from('gift_box_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'used')
        .gte('used_at', startOfDay.toISOString()),
      this.supabase
        .from('gift_box_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'expired')
        .gte('expires_at', startOfDay.toISOString())
        .lte('expires_at', now.toISOString()),
      this.supabase
        .from('gift_box_entries')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      this.supabase
        .from('gift_box_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'used')
        .gte('used_at', thirtyDaysAgo.toISOString()),
      this.supabase
        .from('gift_partner_offers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      this.supabase
        .from('gift_rules')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('trigger', 'in', '(manual_campaign,birthday)'),
      this.supabase
        .from('gift_rules')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('trigger', ['manual_campaign', 'birthday']),
      this.supabase
        .from('gift_financial_log')
        .select('amount_piasters, bucket')
        .eq('transaction_type', 'grant')
        .gte('created_at', startOfMonth.toISOString()),
      this.supabase
        .from('retention_settings')
        .select('monthly_total_budget_piasters')
        .eq('id', 1)
        .maybeSingle(),
    ]);

    // Sum spend + group by bucket
    let totalSpendThisMonthPiasters = 0;
    const spendByBucketMap = new Map<string, number>();
    for (const row of financialThisMonthRes.data ?? []) {
      const amount = Number(row.amount_piasters) || 0;
      totalSpendThisMonthPiasters += amount;
      const bucket = (row.bucket as string) || 'unknown';
      spendByBucketMap.set(bucket, (spendByBucketMap.get(bucket) ?? 0) + amount);
    }
    const spendByBucket: BucketDistribution['piasters'] extends number
      ? Array<{ bucket: string; piasters: number }>
      : never = Array.from(spendByBucketMap.entries())
      .map(([bucket, piasters]) => ({ bucket, piasters }))
      .sort((a, b) => b.piasters - a.piasters);

    const grantedLast30 = grantedLast30Res.count ?? 0;
    const usedLast30 = usedLast30Res.count ?? 0;
    const conversionRate = grantedLast30 > 0 ? usedLast30 / grantedLast30 : 0;

    return {
      activeGifts: activeGiftsRes.count ?? 0,
      giftsGrantedToday: grantedTodayRes.count ?? 0,
      giftsUsedToday: usedTodayRes.count ?? 0,
      giftsExpiredToday: expiredTodayRes.count ?? 0,
      totalSpendThisMonthPiasters,
      monthlyBudgetPiasters: Number(retentionRes.data?.monthly_total_budget_piasters) || 0,
      spendByBucket,
      pendingPartnerOffers: partnerPendingRes.count ?? 0,
      activeRules: activeRulesRes.count ?? 0,
      activeCampaigns: activeCampaignsRes.count ?? 0,
      grantedLast30,
      usedLast30,
      conversionRate,
    };
  }

  // ─── Daily grant time series for charts ────────────────────────────────
  async getDailyGrants(days: number): Promise<DailyGrantsPoint[]> {
    const cap = Math.max(1, Math.min(days, 90));
    const since = new Date(Date.now() - cap * 24 * 60 * 60 * 1000);
    since.setUTCHours(0, 0, 0, 0);

    const [grantedRes, usedRes] = await Promise.all([
      this.supabase
        .from('gift_box_entries')
        .select('created_at')
        .gte('created_at', since.toISOString()),
      this.supabase
        .from('gift_box_entries')
        .select('used_at')
        .eq('status', 'used')
        .gte('used_at', since.toISOString()),
    ]);

    const days_map = new Map<string, { granted: number; used: number }>();
    for (let i = 0; i < cap; i++) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      days_map.set(key, { granted: 0, used: 0 });
    }
    for (const row of grantedRes.data ?? []) {
      const key = String(row.created_at).slice(0, 10);
      const slot = days_map.get(key);
      if (slot) slot.granted++;
    }
    for (const row of usedRes.data ?? []) {
      const key = String(row.used_at).slice(0, 10);
      const slot = days_map.get(key);
      if (slot) slot.used++;
    }

    return Array.from(days_map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, granted: v.granted, used: v.used }));
  }

  // ─── Bucket distribution (count + spend) over last 30 days ─────────────
  async getBucketDistribution(): Promise<BucketDistribution[]> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [entriesRes, financialRes] = await Promise.all([
      this.supabase
        .from('gift_box_entries')
        .select('bucket_name')
        .gte('created_at', since.toISOString()),
      this.supabase
        .from('gift_financial_log')
        .select('amount_piasters, bucket')
        .eq('transaction_type', 'grant')
        .gte('created_at', since.toISOString()),
    ]);

    const map = new Map<string, BucketDistribution>();
    for (const row of entriesRes.data ?? []) {
      const bucket = (row.bucket_name as string) || 'unknown';
      const slot = map.get(bucket) ?? { bucket, count: 0, piasters: 0 };
      slot.count++;
      map.set(bucket, slot);
    }
    for (const row of financialRes.data ?? []) {
      const bucket = (row.bucket as string) || 'unknown';
      const slot = map.get(bucket) ?? { bucket, count: 0, piasters: 0 };
      slot.piasters += Number(row.amount_piasters) || 0;
      map.set(bucket, slot);
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  // ─── Customer segment distribution (most-recent snapshot) ──────────────
  async getSegmentDistribution(): Promise<SegmentDistribution[]> {
    // Fetch the latest snapshot date first; then count segments on that date.
    const { data: latest } = await this.supabase
      .from('customer_segments_daily')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest?.snapshot_date) return [];

    const { data } = await this.supabase
      .from('customer_segments_daily')
      .select('segment')
      .eq('snapshot_date', latest.snapshot_date);

    const map = new Map<string, number>();
    for (const row of data ?? []) {
      const seg = String(row.segment);
      map.set(seg, (map.get(seg) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ─── Rules CRUD ────────────────────────────────────────────────────────
  async listRules(): Promise<GiftRuleRow[]> {
    // Excludes manual_campaign + birthday rules — those are managed under /admin/gifts/campaigns
    const { data, error } = await this.supabase
      .from('gift_rules')
      .select('*')
      .not('trigger', 'in', '(manual_campaign,birthday)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`AdminGiftsService.listRules failed: ${error.message}`);
    }
    return (data || []) as GiftRuleRow[];
  }

  async setRuleActive(id: string, isActive: boolean): Promise<GiftRuleRow | null> {
    // Validate the rule belongs to this surface (excludes manual_campaign + birthday
    // which live under /admin/gifts/campaigns) before updating. Doing the check in
    // two steps — instead of via .not(...) in the UPDATE — avoids a quirk where
    // supabase-js negated-IN filters on UPDATE silently match zero rows.
    const { data: existing, error: fetchErr } = await this.supabase
      .from('gift_rules')
      .select('id, trigger')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[AdminGiftsService] setRuleActive lookup failed:', fetchErr);
      return null;
    }
    if (!existing) return null;
    if (existing.trigger === 'manual_campaign' || existing.trigger === 'birthday') {
      // Caller should be using /admin/gifts/campaigns instead
      return null;
    }

    const { data, error } = await this.supabase
      .from('gift_rules')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[AdminGiftsService] setRuleActive failed:', error);
      return null;
    }
    return (data as GiftRuleRow) || null;
  }

  async updateRule(
    id: string,
    patch: {
      is_active?: boolean;
      budget_cap_per_day?: number | null;
      budget_cap_per_month?: number | null;
      action_value_piasters?: number;
      description?: string | null;
    }
  ): Promise<GiftRuleRow | null> {
    const { data: existing, error: fetchErr } = await this.supabase
      .from('gift_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[AdminGiftsService] updateRule lookup failed:', fetchErr);
      return null;
    }
    if (!existing) return null;
    if (existing.trigger === 'manual_campaign' || existing.trigger === 'birthday') {
      return null;
    }

    const updates: Record<string, unknown> = {};
    if (patch.is_active !== undefined) updates.is_active = patch.is_active;
    if (patch.budget_cap_per_day !== undefined)
      updates.budget_cap_per_day = patch.budget_cap_per_day;
    if (patch.budget_cap_per_month !== undefined) {
      updates.budget_cap_per_month = patch.budget_cap_per_month;
    }
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.action_value_piasters !== undefined) {
      const currentAction = (existing.action as Record<string, unknown>) || {};
      updates.action = { ...currentAction, value_piasters: patch.action_value_piasters };
    }

    if (Object.keys(updates).length === 0) {
      return existing as GiftRuleRow;
    }

    const { data, error } = await this.supabase
      .from('gift_rules')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[AdminGiftsService] updateRule failed:', error);
      return null;
    }
    return (data as GiftRuleRow) || null;
  }

  // ─── Retention settings ────────────────────────────────────────────────
  async getRetentionSettings(): Promise<RetentionSettingsRow | null> {
    const { data, error } = await this.supabase
      .from('retention_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      throw new Error(`AdminGiftsService.getRetentionSettings failed: ${error.message}`);
    }
    return (data as RetentionSettingsRow) || null;
  }

  async updateRetentionSettings(
    patch: RetentionSettingsPatch,
    actorId: string
  ): Promise<RetentionSettingsRow | null> {
    const { data, error } = await this.supabase
      .from('retention_settings')
      .update({
        ...patch,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select('*')
      .maybeSingle();
    if (error) {
      console.error('[AdminGiftsService] updateRetentionSettings failed:', error);
      return null;
    }
    return (data as RetentionSettingsRow) || null;
  }
}

export function createAdminGiftsService(supabase: AnySupabaseClient): AdminGiftsService {
  return new AdminGiftsService(supabase);
}
