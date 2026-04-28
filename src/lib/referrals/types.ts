import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export type ReferralStatus = 'pending' | 'completed' | 'expired';

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_code: string;
  status: ReferralStatus;
  referrer_credit: number;
  referee_credit: number;
  referrer_credit_applied: boolean;
  referee_credit_applied: boolean;
  completed_at: string | null;
  referee_first_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralStats {
  code: string;
  total_referrals: number;
  pending_referrals: number;
  completed_referrals: number;
  monthly_completed: number;
  monthly_limit: number;
  monthly_remaining: number;
  rewards_earned_piasters: number;
}

export interface ReferralHistoryEntry {
  id: string;
  status: ReferralStatus;
  completed_at: string | null;
  created_at: string;
  referee_name: string | null;
}

export type ApplyReferralResult =
  | { success: true; referralId: string }
  | {
      success: false;
      reason:
        | 'invalid_code'
        | 'self_referral'
        | 'already_referred'
        | 'has_orders'
        | 'referrer_not_found';
    };

export type CompleteReferralResult =
  | {
      success: true;
      referralId: string;
      referrerGiftEntryId: string | null;
      refereeGiftEntryId: string | null;
    }
  | {
      success: false;
      reason:
        | 'no_pending_referral'
        | 'order_below_minimum'
        | 'monthly_cap_reached'
        | 'email_not_verified'
        | 'order_not_qualifying';
    };
