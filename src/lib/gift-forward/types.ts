import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export type ForwardStatus = 'pending' | 'claimed' | 'expired' | 'not_found';

export interface ForwardPreview {
  status: ForwardStatus;
  senderFirstName: string;
  giftTitleAr: string;
  giftTitleEn: string;
  giftValuePiasters: number;
  expiresAt: string;
}

export interface CreateForwardSuccess {
  success: true;
  forwardId: string;
  forwardToken: string;
  expiresAt: string;
}

export type CreateForwardReason =
  | 'not_authenticated'
  | 'gift_not_found'
  | 'not_authorized'
  | 'gift_not_forwardable'
  | 'gift_expired'
  | 'gift_type_not_forwardable'
  | 'forward_rate_limit_exceeded'
  | 'system_error';

export interface CreateForwardFailure {
  success: false;
  reason: CreateForwardReason;
}

export type CreateForwardResult = CreateForwardSuccess | CreateForwardFailure;

export interface ClaimForwardSuccess {
  success: true;
  giftEntryId: string;
  senderId: string;
  costPiasters: number;
}

export type ClaimForwardReason =
  | 'not_authenticated'
  | 'forward_not_found'
  | 'forward_already_claimed'
  | 'forward_expired'
  | 'cannot_claim_own_forward'
  | 'gift_not_found'
  | 'grant_failed'
  | 'system_error';

export interface ClaimForwardFailure {
  success: false;
  reason: ClaimForwardReason;
}

export type ClaimForwardResult = ClaimForwardSuccess | ClaimForwardFailure;
