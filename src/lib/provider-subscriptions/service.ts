import type {
  AnySupabaseClient,
  CurrentSubscription,
  SetSubscriptionInput,
  SubscriptionTier,
} from './types';

/**
 * ProviderSubscriptionService — read current tier (provider-facing) +
 * admin write operations (set / cancel). The atomic RPCs are
 * SECURITY DEFINER:
 *   • provider_current_subscription   — granted to authenticated
 *   • admin_set_provider_subscription_atomic — service_role only
 *   • cancel_provider_subscription_atomic    — service_role only
 *
 * The route layer is responsible for deciding which client (cookie-bound
 * vs. service-role) to pass in based on the operation.
 */
export class ProviderSubscriptionService {
  private supabase: AnySupabaseClient;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
  }

  async getCurrent(providerId: string): Promise<CurrentSubscription> {
    const { data, error } = await this.supabase.rpc('provider_current_subscription', {
      p_provider_id: providerId,
    });
    if (error) {
      console.error('[ProviderSubscriptionService] getCurrent failed:', error);
      return {
        tier: 'basic',
        is_active: true,
        starts_at: null,
        ends_at: null,
        granted_free: false,
        price_piasters: 0,
      };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return {
        tier: 'basic',
        is_active: true,
        starts_at: null,
        ends_at: null,
        granted_free: false,
        price_piasters: 0,
      };
    }
    return {
      tier: row.tier as SubscriptionTier,
      is_active: !!row.is_active,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      granted_free: !!row.granted_free,
      price_piasters: Number(row.price_piasters) || 0,
    };
  }

  async setSubscription(
    providerId: string,
    input: SetSubscriptionInput,
    actorId: string
  ): Promise<{ success: boolean; subscription?: CurrentSubscription; error?: string }> {
    const { error } = await this.supabase.rpc('admin_set_provider_subscription_atomic', {
      p_provider_id: providerId,
      p_tier: input.tier,
      p_granted_free: input.granted_free ?? false,
      p_ends_at: input.ends_at ?? null,
      p_actor_id: actorId,
    });
    if (error) {
      console.error('[ProviderSubscriptionService] setSubscription failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true, subscription: await this.getCurrent(providerId) };
  }

  async cancel(
    providerId: string,
    actorId: string
  ): Promise<{ success: boolean; subscription?: CurrentSubscription; error?: string }> {
    const { error } = await this.supabase.rpc('cancel_provider_subscription_atomic', {
      p_provider_id: providerId,
      p_actor_id: actorId,
    });
    if (error) {
      console.error('[ProviderSubscriptionService] cancel failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true, subscription: await this.getCurrent(providerId) };
  }
}

export function createProviderSubscriptionService(
  supabase: AnySupabaseClient
): ProviderSubscriptionService {
  return new ProviderSubscriptionService(supabase);
}
