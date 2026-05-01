import type {
  AnySupabaseClient,
  CreatePartnerOfferInput,
  CreateOfferResult,
  PartnerOffer,
  PartnerOfferWithGift,
  StateTransitionResult,
} from './types';

/**
 * PartnerGiftsService — provider/admin facing CRUD + workflow for partner-funded
 * gift offers. State transitions go through Postgres RPCs (atomic + RLS-aware).
 */
export class PartnerGiftsService {
  private supabase: AnySupabaseClient;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Resolve the provider id owned by the current authenticated user.
   * Returns null if not authenticated or no provider.
   */
  async getOwnedProviderId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('providers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    return data.id as string;
  }

  /**
   * Create a partner offer in one shot — creates a custom gift template (with
   * partner_gift type metadata pointing to the provider) AND the offer row
   * referencing it. Both rows are created in sequence; if the offer insert
   * fails after the gift insert, the gift row stays around (it's harmless
   * since nothing references it yet).
   */
  async createDraftOffer(input: CreatePartnerOfferInput): Promise<CreateOfferResult> {
    const providerId = await this.getOwnedProviderId();
    if (!providerId) return { success: false, reason: 'no_provider' };

    if (!input.terms_accepted) {
      return { success: false, reason: 'terms_required' };
    }

    if (
      !input.value_piasters ||
      input.value_piasters <= 0 ||
      !input.max_orders ||
      input.max_orders <= 0
    ) {
      return { success: false, reason: 'invalid_value' };
    }

    const startsAt = new Date(input.starts_at);
    const endsAt = new Date(input.ends_at);
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      endsAt.getTime() <= startsAt.getTime()
    ) {
      return { success: false, reason: 'invalid_dates' };
    }

    // 1. Create the underlying gift template (type = partner_gift)
    const { data: gift, error: giftErr } = await this.supabase
      .from('gifts')
      .insert({
        type: 'partner_gift',
        value_piasters: input.value_piasters,
        max_discount_piasters: input.max_discount_piasters ?? null,
        min_order_piasters: input.min_order_piasters ?? 30000,
        title_ar: input.title_ar,
        title_en: input.title_en,
        description_ar: input.description_ar ?? null,
        description_en: input.description_en ?? null,
        applicable_provider_ids: [providerId],
        metadata: {
          partner_gift_type: input.type,
          partner_provider_id: providerId,
        },
        is_active: true,
      })
      .select('id')
      .single();

    if (giftErr || !gift) {
      console.error('[PartnerGiftsService] Failed to create gift template:', giftErr);
      return { success: false, reason: 'system_error' };
    }

    // 2. Create the offer in draft status
    const { data: offer, error: offerErr } = await this.supabase
      .from('gift_partner_offers')
      .insert({
        provider_id: providerId,
        gift_id: gift.id,
        status: 'draft',
        max_orders: input.max_orders,
        max_discount_total_piasters: input.max_discount_total_piasters ?? null,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        terms_accepted: input.terms_accepted,
      })
      .select('id')
      .single();

    if (offerErr || !offer) {
      console.error('[PartnerGiftsService] Failed to create offer:', offerErr);
      return { success: false, reason: 'system_error' };
    }

    return { success: true, offerId: offer.id, giftId: gift.id };
  }

  async listProviderOffers(): Promise<PartnerOfferWithGift[]> {
    const providerId = await this.getOwnedProviderId();
    if (!providerId) return [];

    const { data, error } = await this.supabase
      .from('gift_partner_offers')
      .select(
        'id, provider_id, gift_id, status, max_orders, used_orders, max_discount_total_piasters, total_discount_used_piasters, starts_at, ends_at, approved_by, approved_at, rejection_reason, terms_accepted, created_at, gift:gifts(id, type, title_ar, title_en, value_piasters, max_discount_piasters, min_order_piasters)'
      )
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`listProviderOffers failed: ${error.message}`);
    }
    return (data || []) as unknown as PartnerOfferWithGift[];
  }

  async getOffer(offerId: string): Promise<PartnerOfferWithGift | null> {
    const { data, error } = await this.supabase
      .from('gift_partner_offers')
      .select(
        'id, provider_id, gift_id, status, max_orders, used_orders, max_discount_total_piasters, total_discount_used_piasters, starts_at, ends_at, approved_by, approved_at, rejection_reason, terms_accepted, created_at, gift:gifts(id, type, title_ar, title_en, value_piasters, max_discount_piasters, min_order_piasters), provider:providers(id, name_ar, name_en)'
      )
      .eq('id', offerId)
      .maybeSingle();

    if (error) {
      throw new Error(`getOffer failed: ${error.message}`);
    }
    return (data as unknown as PartnerOfferWithGift) || null;
  }

  async deleteDraft(offerId: string): Promise<boolean> {
    // RLS policy "Providers can delete own drafts" guards this.
    const { error } = await this.supabase
      .from('gift_partner_offers')
      .delete()
      .eq('id', offerId)
      .eq('status', 'draft');
    return !error;
  }

  async submit(offerId: string): Promise<StateTransitionResult> {
    return this.callTransition('submit_partner_offer_atomic', { p_offer_id: offerId });
  }

  async approve(offerId: string): Promise<StateTransitionResult> {
    return this.callTransition('approve_partner_offer_atomic', { p_offer_id: offerId });
  }

  async reject(offerId: string, reason: string): Promise<StateTransitionResult> {
    return this.callTransition('reject_partner_offer_atomic', {
      p_offer_id: offerId,
      p_reason: reason,
    });
  }

  async pause(offerId: string): Promise<StateTransitionResult> {
    return this.callTransition('pause_partner_offer_atomic', { p_offer_id: offerId });
  }

  async resume(offerId: string): Promise<StateTransitionResult> {
    return this.callTransition('resume_partner_offer_atomic', { p_offer_id: offerId });
  }

  /**
   * Admin: list offers across providers, optionally filtered by status.
   */
  async listForAdmin(filter?: {
    status?: string;
    limit?: number;
  }): Promise<PartnerOfferWithGift[]> {
    let query = this.supabase
      .from('gift_partner_offers')
      .select(
        'id, provider_id, gift_id, status, max_orders, used_orders, max_discount_total_piasters, total_discount_used_piasters, starts_at, ends_at, approved_by, approved_at, rejection_reason, terms_accepted, created_at, gift:gifts(id, type, title_ar, title_en, value_piasters, max_discount_piasters, min_order_piasters), provider:providers(id, name_ar, name_en)'
      )
      .order('created_at', { ascending: false })
      .limit(filter?.limit ?? 50);

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`listForAdmin failed: ${error.message}`);
    }
    return (data || []) as unknown as PartnerOfferWithGift[];
  }

  private async callTransition(
    rpc: string,
    params: Record<string, unknown>
  ): Promise<StateTransitionResult> {
    const { data, error } = await this.supabase.rpc(rpc, params);

    if (error) {
      const message = error.message || '';
      const knownReasons = [
        'not_authorized',
        'not_authenticated',
        'cannot_submit_offer',
        'cannot_approve_offer',
        'cannot_reject_offer',
        'cannot_pause_offer',
        'cannot_resume_offer',
        'reason_required',
      ] as const;
      const reason = knownReasons.find((r) => message.includes(r));
      if (reason) {
        return {
          success: false,
          reason: reason === 'not_authenticated' ? 'not_authorized' : reason,
        };
      }
      console.error(`[PartnerGiftsService] ${rpc} failed:`, error);
      return { success: false, reason: 'system_error' };
    }

    if (!data) return { success: false, reason: 'not_found' };
    return { success: true, offer: data as PartnerOffer };
  }
}

export function createPartnerGiftsService(supabase: AnySupabaseClient): PartnerGiftsService {
  return new PartnerGiftsService(supabase);
}
