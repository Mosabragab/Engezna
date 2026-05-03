import type {
  AnySupabaseClient,
  CampaignRow,
  CreateCampaignInput,
  CreateCampaignResult,
  ExecuteCampaignResult,
} from './types';

const PG_UNIQUE_VIOLATION = '23505';

/**
 * CampaignsService — admin-facing CRUD over gift_rules with trigger
 * 'manual_campaign' or 'birthday'. Execution of manual campaigns goes
 * through execute_manual_campaign_atomic RPC.
 */
export class CampaignsService {
  private supabase: AnySupabaseClient;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
  }

  async list(filter?: { activeOnly?: boolean; trigger?: string }): Promise<CampaignRow[]> {
    let query = this.supabase
      .from('gift_rules')
      .select(
        'id, name, description, trigger, conditions, action, is_active, budget_bucket, budget_cap_per_day, budget_cap_per_month, applied_count, total_cost_piasters, created_at, updated_at'
      )
      .in('trigger', ['manual_campaign', 'birthday'])
      .order('created_at', { ascending: false });

    if (filter?.activeOnly) {
      query = query.eq('is_active', true);
    }
    if (filter?.trigger) {
      query = query.eq('trigger', filter.trigger);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`CampaignsService.list failed: ${error.message}`);
    }
    return (data || []) as CampaignRow[];
  }

  async get(id: string): Promise<CampaignRow | null> {
    const { data, error } = await this.supabase
      .from('gift_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`CampaignsService.get failed: ${error.message}`);
    }
    return (data as CampaignRow) || null;
  }

  async create(input: CreateCampaignInput): Promise<CreateCampaignResult> {
    if (!input.name?.trim()) {
      return { success: false, reason: 'invalid_input' };
    }
    if (!input.action?.value_piasters || input.action.value_piasters <= 0) {
      return { success: false, reason: 'invalid_input' };
    }
    if (!input.action?.bucket) {
      return { success: false, reason: 'invalid_input' };
    }
    // Defensive runtime guard — TS narrows the type, but the service is also
    // called from API routes that accept JSON bodies at the boundary.
    if (input.trigger !== 'manual_campaign' && input.trigger !== 'birthday') {
      return { success: false, reason: 'invalid_input' };
    }

    const conditions: Record<string, unknown> = {};
    if (input.audience?.governorate_id) conditions.governorate_id = input.audience.governorate_id;
    if (input.audience?.segment) conditions.segment = input.audience.segment;

    const { data, error } = await this.supabase
      .from('gift_rules')
      .insert({
        name: input.name.trim(),
        description: input.description ?? null,
        trigger: input.trigger,
        conditions,
        action: input.action,
        is_active: input.is_active ?? true,
        budget_bucket: input.action.bucket,
        budget_cap_per_day: input.budget_cap_per_day ?? null,
        budget_cap_per_month: input.budget_cap_per_month ?? null,
      })
      .select('id')
      .single();

    if (error) {
      const isDuplicate =
        (error as { code?: string }).code === PG_UNIQUE_VIOLATION ||
        /duplicate key|unique/i.test(error.message || '');
      if (isDuplicate) {
        return { success: false, reason: 'duplicate_name' };
      }
      console.error('[CampaignsService] create failed:', error);
      return { success: false, reason: 'system_error' };
    }
    if (!data) return { success: false, reason: 'system_error' };
    return { success: true, campaignId: data.id };
  }

  async setActive(id: string, isActive: boolean): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('gift_rules')
      .update({ is_active: isActive })
      .eq('id', id)
      .in('trigger', ['manual_campaign', 'birthday'])
      .select('id');
    if (error) {
      console.error('[CampaignsService] setActive failed:', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  }

  async delete(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('gift_rules')
      .delete()
      .eq('id', id)
      .in('trigger', ['manual_campaign', 'birthday'])
      .select('id');
    if (error) {
      console.error('[CampaignsService] delete failed:', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  }

  /**
   * Manually fire a campaign — admin clicks "Run now" → walks the audience and
   * grants gifts via grant_gift_atomic in a single RPC.
   */
  async execute(id: string): Promise<ExecuteCampaignResult> {
    const { data, error } = await this.supabase.rpc('execute_manual_campaign_atomic', {
      p_rule_id: id,
    });

    if (error) {
      const message = error.message || '';
      const reason = (
        [
          'not_authorized',
          'campaign_not_found',
          'campaign_inactive',
          'not_a_manual_campaign',
        ] as const
      ).find((r) => message.includes(r));
      return {
        success: false,
        granted: 0,
        attempted: 0,
        totalCostPiasters: 0,
        reason: reason || 'system_error',
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return {
        success: false,
        granted: 0,
        attempted: 0,
        totalCostPiasters: 0,
        reason: 'system_error',
      };
    }

    return {
      success: true,
      granted: Number(row.granted) || 0,
      attempted: Number(row.attempted) || 0,
      totalCostPiasters: Number(row.total_cost_piasters) || 0,
    };
  }
}

export function createCampaignsService(supabase: AnySupabaseClient): CampaignsService {
  return new CampaignsService(supabase);
}
