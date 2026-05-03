import type {
  AnySupabaseClient,
  ClaimForwardReason,
  ClaimForwardResult,
  CreateForwardReason,
  CreateForwardResult,
  ForwardPreview,
} from './types';

const CREATE_REASONS: readonly CreateForwardReason[] = [
  'not_authenticated',
  'gift_not_found',
  'not_authorized',
  'gift_not_forwardable',
  'gift_expired',
  'gift_type_not_forwardable',
  'forward_rate_limit_exceeded',
] as const;

const CLAIM_REASONS: readonly ClaimForwardReason[] = [
  'not_authenticated',
  'forward_not_found',
  'forward_already_claimed',
  'forward_expired',
  'cannot_claim_own_forward',
  'gift_not_found',
  'grant_failed',
] as const;

function matchReason<T extends string>(message: string, knownReasons: readonly T[]): T | null {
  return knownReasons.find((r) => message.includes(r)) ?? null;
}

/**
 * GiftForwardService — peer-to-peer gift sharing (Phase 11 Gift-it Forward).
 * Wraps the SECURITY DEFINER RPCs that handle the atomic state transitions.
 */
export class GiftForwardService {
  private supabase: AnySupabaseClient;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Sender turns one of their unused gifts into a share token.
   * Returns the token + 48h expiry so the caller can build a WhatsApp link.
   */
  async createForward(giftEntryId: string): Promise<CreateForwardResult> {
    const { data, error } = await this.supabase.rpc('create_gift_forward_atomic', {
      p_gift_entry_id: giftEntryId,
    });

    if (error) {
      const reason = matchReason(error.message || '', CREATE_REASONS);
      if (reason) return { success: false, reason };
      console.error('[GiftForwardService] createForward failed:', error);
      return { success: false, reason: 'system_error' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.forward_token) {
      return { success: false, reason: 'system_error' };
    }

    return {
      success: true,
      forwardId: row.forward_id,
      forwardToken: row.forward_token,
      expiresAt: row.expires_at,
    };
  }

  /**
   * Public-safe preview for the /gift/[token] landing page.
   * Returns 'not_found' status (rather than throwing) so the page can render
   * a friendly empty state for invalid tokens.
   */
  async peek(token: string): Promise<ForwardPreview> {
    const { data, error } = await this.supabase.rpc('peek_gift_forward', { p_token: token });

    if (error) {
      console.error('[GiftForwardService] peek failed:', error);
      return {
        status: 'not_found',
        senderFirstName: '',
        giftTitleAr: '',
        giftTitleEn: '',
        giftValuePiasters: 0,
        expiresAt: new Date(0).toISOString(),
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return {
        status: 'not_found',
        senderFirstName: '',
        giftTitleAr: '',
        giftTitleEn: '',
        giftValuePiasters: 0,
        expiresAt: new Date(0).toISOString(),
      };
    }

    return {
      status: row.status,
      senderFirstName: row.sender_first_name || '',
      giftTitleAr: row.gift_title_ar || '',
      giftTitleEn: row.gift_title_en || '',
      giftValuePiasters: Number(row.gift_value_piasters) || 0,
      expiresAt: row.expires_at,
    };
  }

  /**
   * Recipient claims the forward. Mints a brand-new gift_box_entry for them
   * and awards the sender +10 loyalty points (best effort — never fatal).
   */
  async claim(
    token: string,
    deviceId: string | null,
    ip: string | null
  ): Promise<ClaimForwardResult> {
    const { data, error } = await this.supabase.rpc('claim_gift_forward_atomic', {
      p_token: token,
      p_device_id: deviceId,
      p_ip: ip,
    });

    if (error) {
      const reason = matchReason(error.message || '', CLAIM_REASONS);
      if (reason) return { success: false, reason };
      console.error('[GiftForwardService] claim failed:', error);
      return { success: false, reason: 'system_error' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.gift_entry_id) {
      return { success: false, reason: 'system_error' };
    }

    return {
      success: true,
      giftEntryId: row.gift_entry_id,
      senderId: row.sender_id,
      costPiasters: Number(row.cost_piasters) || 0,
    };
  }

  /**
   * Lazy: restore any of the caller's expired-unclaimed forwards back to
   * the sender's box. Safe to call on /rewards page load.
   */
  async expirePending(): Promise<number> {
    const { data, error } = await this.supabase.rpc('expire_pending_gift_forwards');
    if (error) {
      console.error('[GiftForwardService] expirePending failed:', error);
      return 0;
    }
    return Number(data) || 0;
  }
}

export function createGiftForwardService(supabase: AnySupabaseClient): GiftForwardService {
  return new GiftForwardService(supabase);
}
