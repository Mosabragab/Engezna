import type { AnySupabaseClient, GiftBoxEntry, BucketName } from './types';
import { GiftEngine } from './engine';

type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'between';

interface Condition {
  fact: string;
  op: Operator;
  value: unknown;
}

interface ConditionGroup {
  all?: (Condition | ConditionGroup)[];
  any?: (Condition | ConditionGroup)[];
  none?: (Condition | ConditionGroup)[];
}

interface RuleAction {
  gift_type: string;
  value_piasters?: number;
  bucket: BucketName;
  mystery_wrapper?: boolean;
  expiry_days?: number;
  applicable_provider_ids?: string[];
  message_ar?: string;
  message_en?: string;
}

interface Rule {
  id: string;
  name: string;
  trigger: string;
  conditions: ConditionGroup;
  action: RuleAction;
  priority: number;
  is_active: boolean;
  budget_bucket: string;
  budget_cap_per_day: number | null;
  budget_cap_per_month: number | null;
  applied_count: number;
  total_cost_piasters: number;
}

export type Facts = Record<string, unknown>;

function evaluateCondition(condition: Condition, facts: Facts): boolean {
  const factValue = facts[condition.fact];
  if (factValue === undefined) return false;

  switch (condition.op) {
    case 'eq':
      return factValue === condition.value;
    case 'neq':
      return factValue !== condition.value;
    case 'gt':
      return (factValue as number) > (condition.value as number);
    case 'gte':
      return (factValue as number) >= (condition.value as number);
    case 'lt':
      return (factValue as number) < (condition.value as number);
    case 'lte':
      return (factValue as number) <= (condition.value as number);
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(factValue);
    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(factValue);
    case 'between': {
      const [min, max] = condition.value as [number, number];
      return (factValue as number) >= min && (factValue as number) <= max;
    }
    default:
      return false;
  }
}

function isConditionGroup(obj: unknown): obj is ConditionGroup {
  return typeof obj === 'object' && obj !== null && ('all' in obj || 'any' in obj || 'none' in obj);
}

function evaluateGroup(group: ConditionGroup, facts: Facts): boolean {
  if (group.all) {
    return group.all.every((item) =>
      isConditionGroup(item) ? evaluateGroup(item, facts) : evaluateCondition(item, facts)
    );
  }
  if (group.any) {
    return group.any.some((item) =>
      isConditionGroup(item) ? evaluateGroup(item, facts) : evaluateCondition(item, facts)
    );
  }
  if (group.none) {
    return group.none.every(
      (item) =>
        !(isConditionGroup(item) ? evaluateGroup(item, facts) : evaluateCondition(item, facts))
    );
  }
  return false;
}

export function evaluateConditions(conditions: ConditionGroup, facts: Facts): boolean {
  return evaluateGroup(conditions, facts);
}

export class RuleEngine {
  private supabase: AnySupabaseClient;
  private giftEngine: GiftEngine;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
    this.giftEngine = new GiftEngine(supabase);
  }

  private async getActiveRules(trigger: string): Promise<Rule[]> {
    const { data, error } = await this.supabase
      .from('gift_rules')
      .select('*')
      .eq('trigger', trigger)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      throw new Error(
        `[RuleEngine] Failed to load rules for trigger "${trigger}": ${error.message}`
      );
    }

    return (data || []) as Rule[];
  }

  private async checkRuleDailyBudget(rule: Rule, requestedAmount: number): Promise<boolean> {
    if (!rule.budget_cap_per_day) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('gift_financial_log')
      .select('amount_piasters')
      .gte('created_at', today.toISOString())
      .eq('bucket', rule.budget_bucket)
      .eq('transaction_type', 'grant');

    if (error) {
      console.error(`[RuleEngine] Budget check failed for rule ${rule.id}: ${error.message}`);
      return false;
    }

    const spent = (data || []).reduce(
      (sum: number, r: { amount_piasters: number }) => sum + r.amount_piasters,
      0
    );
    return spent + requestedAmount <= rule.budget_cap_per_day;
  }

  private async resolveGiftId(giftType: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('gifts')
      .select('id')
      .eq('type', giftType)
      .eq('is_active', true)
      .limit(1)
      .single();

    return data?.id || null;
  }

  async evaluateTrigger(trigger: string, facts: Facts, userId: string): Promise<GiftBoxEntry[]> {
    const rules = await this.getActiveRules(trigger);
    const results: GiftBoxEntry[] = [];

    for (const rule of rules) {
      const matches = evaluateConditions(rule.conditions as ConditionGroup, facts);
      if (!matches) continue;

      const costPiasters = rule.action.value_piasters || 500;

      const withinBudget = await this.checkRuleDailyBudget(rule, costPiasters);
      if (!withinBudget) continue;

      const giftId = await this.resolveGiftId(rule.action.gift_type);

      const giftEntry = await this.giftEngine.grantGift({
        userId,
        giftId,
        source: 'mystery_box',
        ruleId: rule.id,
        bucketName: rule.action.bucket || rule.budget_bucket,
        costPiasters,
        expiryDays: rule.action.expiry_days,
      });

      if (giftEntry) {
        results.push(giftEntry);

        await this.supabase.rpc('increment_gift_rule_stats', {
          p_rule_id: rule.id,
          p_cost_piasters: costPiasters,
        });
      }
    }

    return results;
  }

  async buildUserFacts(userId: string): Promise<Facts> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('created_at, governorate_id, city_id, last_segment, loyalty_tier')
      .eq('id', userId)
      .single();

    const { data: orders } = await this.supabase
      .from('orders')
      .select('id, subtotal, provider_id, created_at, discount, status')
      .eq('customer_id', userId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    const { count: giftCount } = await this.supabase
      .from('gift_box_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'used');

    const { count: referralCount } = await this.supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('status', 'completed');

    const { data: stampCard } = await this.supabase
      .from('gift_stamps')
      .select('stamp_count')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .single();

    const orderList = orders || [];
    const totalOrders = orderList.length;
    const totalSpent = orderList.reduce(
      (s: number, o: { subtotal: number }) => s + (o.subtotal || 0),
      0
    );
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const uniqueProviders = new Set(orderList.map((o: { provider_id: string }) => o.provider_id))
      .size;

    let daysSinceLastOrder = 9999;
    if (orderList.length > 0) {
      const lastOrderDate = new Date(orderList[0].created_at);
      daysSinceLastOrder = Math.floor(
        (Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const discountedOrders = orderList.filter(
      (o: { discount: number }) => (o.discount || 0) > 0
    ).length;
    const usesPromoRate = totalOrders > 0 ? discountedOrders / totalOrders : 0;

    const ageDays = profile
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      segment: profile?.last_segment || 'undefined',
      loyalty_tier: profile?.loyalty_tier || 'bronze',
      governorate: profile?.governorate_id || null,
      city: profile?.city_id || null,
      total_orders: totalOrders,
      total_spent: totalSpent,
      avg_order_value: avgOrderValue,
      days_since_last_order: daysSinceLastOrder,
      unique_providers_ordered_from: uniqueProviders,
      has_used_gift_before: (giftCount || 0) > 0,
      referrals_count: referralCount || 0,
      stamp_count: stampCard?.stamp_count || 0,
      age_days: ageDays,
      uses_promo_rate: usesPromoRate,
      last_order_value: orderList.length > 0 ? orderList[0].subtotal : 0,
    };
  }

  async processOrderCompleted(userId: string, orderId: string): Promise<GiftBoxEntry[]> {
    const facts = await this.buildUserFacts(userId);

    const { data: order } = await this.supabase
      .from('orders')
      .select('subtotal, provider_id')
      .eq('id', orderId)
      .single();

    if (order) {
      const { data: prevOrders } = await this.supabase
        .from('orders')
        .select('id')
        .eq('customer_id', userId)
        .eq('provider_id', order.provider_id)
        .eq('status', 'delivered')
        .limit(2);

      facts.first_order_from_provider = (prevOrders || []).length <= 1;
      facts.last_order_value = order.subtotal;
    }

    return this.evaluateTrigger('order_completed', facts, userId);
  }
}

export function createRuleEngine(supabase: AnySupabaseClient): RuleEngine {
  return new RuleEngine(supabase);
}
