import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export type CampaignTrigger = 'manual_campaign' | 'birthday';

export interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  trigger: CampaignTrigger;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  is_active: boolean;
  budget_bucket: string;
  budget_cap_per_day: number | null;
  budget_cap_per_month: number | null;
  applied_count: number;
  total_cost_piasters: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  trigger: CampaignTrigger;
  /** Optional governorate / segment audience filter (manual_campaign only) */
  audience?: {
    governorate_id?: string;
    segment?: string;
  };
  action: {
    value_piasters: number;
    bucket: string;
    expiry_days?: number;
    /** Cap recipients per execution for manual campaigns */
    max_recipients?: number;
    /** Optional bilingual customer-facing message */
    message_ar?: string;
    message_en?: string;
  };
  budget_cap_per_day?: number;
  budget_cap_per_month?: number;
  is_active?: boolean;
}

export type CreateCampaignResult =
  | { success: true; campaignId: string }
  | {
      success: false;
      reason: 'not_authorized' | 'invalid_input' | 'duplicate_name' | 'system_error';
    };

export interface ExecuteCampaignResult {
  success: boolean;
  granted: number;
  attempted: number;
  totalCostPiasters: number;
  reason?:
    | 'not_authorized'
    | 'campaign_not_found'
    | 'campaign_inactive'
    | 'not_a_manual_campaign'
    | 'system_error';
}
