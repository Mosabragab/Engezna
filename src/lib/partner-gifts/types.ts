import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export type PartnerOfferStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'paused'
  | 'ended'
  | 'rejected';

export type PartnerGiftType = 'discount_code' | 'discount_percent' | 'free_delivery';

export interface PartnerOffer {
  id: string;
  provider_id: string;
  gift_id: string;
  status: PartnerOfferStatus;
  max_orders: number;
  used_orders: number;
  max_discount_total_piasters: number | null;
  total_discount_used_piasters: number;
  starts_at: string;
  ends_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  terms_accepted: boolean;
  created_at: string;
}

/**
 * Inputs to create a partner offer. The gift template is created on the same
 * call so the provider can describe their custom offer in one step.
 */
export interface CreatePartnerOfferInput {
  // Gift template fields
  type: PartnerGiftType;
  /** Value in piasters; for discount_code = fixed amount, for discount_percent = percentage * 100 */
  value_piasters: number;
  max_discount_piasters?: number;
  min_order_piasters?: number;
  title_ar: string;
  title_en: string;
  description_ar?: string;
  description_en?: string;

  // Offer fields
  max_orders: number;
  max_discount_total_piasters?: number;
  starts_at: string; // ISO
  ends_at: string; // ISO
  terms_accepted: boolean;
}

export type CreateOfferResult =
  | { success: true; offerId: string; giftId: string }
  | {
      success: false;
      reason:
        | 'not_authenticated'
        | 'no_provider'
        | 'invalid_dates'
        | 'invalid_value'
        | 'terms_required'
        | 'system_error';
    };

export type StateTransitionResult =
  | { success: true; offer: PartnerOffer }
  | {
      success: false;
      reason:
        | 'not_authorized'
        | 'cannot_submit_offer'
        | 'cannot_approve_offer'
        | 'cannot_reject_offer'
        | 'cannot_pause_offer'
        | 'cannot_resume_offer'
        | 'reason_required'
        | 'not_found'
        | 'system_error';
    };

export interface PartnerOfferWithGift extends PartnerOffer {
  gift?: {
    id: string;
    type: PartnerGiftType;
    title_ar: string;
    title_en: string;
    value_piasters: number;
    max_discount_piasters: number | null;
    min_order_piasters: number;
  };
  provider?: {
    id: string;
    name_ar?: string | null;
    name_en?: string | null;
  };
}
