/**
 * Broadcast Service - خدمة البث الثلاثي
 *
 * This service handles the Triple Broadcast system for custom orders:
 * - Create broadcasts to multiple providers
 * - Validate provider limits (max 3)
 * - Cancel broadcasts
 * - First to Close wins logic
 *
 * @version 1.0
 * @date January 2026
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CustomOrderBroadcast,
  CustomOrderRequest,
  CreateBroadcastPayload,
  CreateBroadcastResponse,
  BroadcastWithRequests,
  BroadcastStatusResponse,
  BroadcastStatus,
  CustomOrderInputType,
  CustomRequestStatus,
  OperationMode,
} from '@/types/custom-order';
import {
  MAX_BROADCAST_PROVIDERS,
  DEFAULT_CUSTOM_ORDER_SETTINGS,
} from '@/types/custom-order';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

interface BroadcastServiceConfig {
  supabase: AnySupabaseClient;
  customerId?: string;
  providerId?: string;
}

interface ValidatedProvider {
  id: string;
  name_ar: string;
  name_en: string;
  operation_mode: OperationMode;
  custom_order_settings: typeof DEFAULT_CUSTOM_ORDER_SETTINGS | null;
  delivery_fee: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service Error Types
// ═══════════════════════════════════════════════════════════════════════════════

export class BroadcastError extends Error {
  constructor(
    message: string,
    public code:
      | 'MAX_PROVIDERS_EXCEEDED'
      | 'PROVIDER_NOT_FOUND'
      | 'PROVIDER_NOT_CUSTOM_ORDER'
      | 'INVALID_INPUT'
      | 'BROADCAST_NOT_FOUND'
      | 'BROADCAST_NOT_ACTIVE'
      | 'DATABASE_ERROR'
      | 'UNAUTHORIZED'
  ) {
    super(message);
    this.name = 'BroadcastError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Broadcast Service Class
// ═══════════════════════════════════════════════════════════════════════════════

export class BroadcastService {
  private supabase: AnySupabaseClient;
  private customerId?: string;
  private providerId?: string;

  constructor(config: BroadcastServiceConfig) {
    this.supabase = config.supabase;
    this.customerId = config.customerId;
    this.providerId = config.providerId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Broadcast Creation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new broadcast to multiple providers
   * إنشاء بث جديد لعدة متاجر
   */
  async createBroadcast(
    payload: CreateBroadcastPayload
  ): Promise<CreateBroadcastResponse> {
    if (!this.customerId) {
      throw new BroadcastError('Customer ID is required', 'UNAUTHORIZED');
    }

    // Validate provider count
    if (payload.providerIds.length === 0) {
      throw new BroadcastError(
        'At least one provider is required',
        'INVALID_INPUT'
      );
    }

    if (payload.providerIds.length > MAX_BROADCAST_PROVIDERS) {
      throw new BroadcastError(
        `Maximum ${MAX_BROADCAST_PROVIDERS} providers allowed`,
        'MAX_PROVIDERS_EXCEEDED'
      );
    }

    // Validate input content
    if (!payload.text && !payload.voiceUrl && !payload.imageUrls?.length) {
      throw new BroadcastError(
        'Order must have text, voice, or images',
        'INVALID_INPUT'
      );
    }

    // Validate and get provider details
    const providers = await this.validateProviders(payload.providerIds);

    // Determine pricing deadline (use shortest timeout from providers)
    const pricingTimeoutHours = Math.min(
      ...providers.map(
        (p) =>
          p.custom_order_settings?.pricing_timeout_hours ??
          DEFAULT_CUSTOM_ORDER_SETTINGS.pricing_timeout_hours
      )
    );

    const now = new Date();
    const pricingDeadline = new Date(
      now.getTime() + pricingTimeoutHours * 60 * 60 * 1000
    );

    // Auto-cancel deadline (longest timeout from providers)
    const autoCancelHours = Math.max(
      ...providers.map(
        (p) =>
          p.custom_order_settings?.auto_cancel_after_hours ??
          DEFAULT_CUSTOM_ORDER_SETTINGS.auto_cancel_after_hours
      )
    );
    const expiresAt = new Date(
      now.getTime() + autoCancelHours * 60 * 60 * 1000
    );

    // Get delivery address if provided
    let deliveryAddress = null;
    if (payload.deliveryAddressId) {
      const { data: address } = await this.supabase
        .from('user_addresses')
        .select('*')
        .eq('id', payload.deliveryAddressId)
        .single();
      deliveryAddress = address;
    }

    // Create broadcast
    const { data: broadcast, error: broadcastError } = await this.supabase
      .from('custom_order_broadcasts')
      .insert({
        customer_id: this.customerId,
        provider_ids: payload.providerIds,
        original_input_type: payload.inputType,
        original_text: payload.text || null,
        voice_url: payload.voiceUrl || null,
        image_urls: payload.imageUrls || null,
        customer_notes: payload.notes || null,
        delivery_address_id: payload.deliveryAddressId || null,
        delivery_address: deliveryAddress,
        order_type: payload.orderType,
        status: 'active' as BroadcastStatus,
        pricing_deadline: pricingDeadline.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (broadcastError || !broadcast) {
      console.error('Error creating broadcast:', broadcastError);
      throw new BroadcastError(
        'Failed to create broadcast',
        'DATABASE_ERROR'
      );
    }

    // Create requests for each provider
    const requestsToCreate = providers.map((provider) => ({
      broadcast_id: broadcast.id,
      provider_id: provider.id,
      input_type: payload.inputType,
      original_text: payload.text || null,
      voice_url: payload.voiceUrl || null,
      image_urls: payload.imageUrls || null,
      customer_notes: payload.notes || null,
      status: 'pending' as CustomRequestStatus,
      items_count: 0,
      subtotal: 0,
      delivery_fee: provider.delivery_fee,
      total: 0,
      pricing_expires_at: pricingDeadline.toISOString(),
    }));

    const { data: requests, error: requestsError } = await this.supabase
      .from('custom_order_requests')
      .insert(requestsToCreate)
      .select();

    if (requestsError || !requests) {
      // Rollback: delete the broadcast
      await this.supabase
        .from('custom_order_broadcasts')
        .delete()
        .eq('id', broadcast.id);

      console.error('Error creating requests:', requestsError);
      throw new BroadcastError(
        'Failed to create provider requests',
        'DATABASE_ERROR'
      );
    }

    return {
      success: true,
      broadcast: broadcast as CustomOrderBroadcast,
      requests: requests as CustomOrderRequest[],
    };
  }

  /**
   * Validate that all providers exist and support custom orders
   */
  private async validateProviders(
    providerIds: string[]
  ): Promise<ValidatedProvider[]> {
    const { data: providers, error } = await this.supabase
      .from('providers')
      .select('id, name_ar, name_en, operation_mode, custom_order_settings, delivery_fee')
      .in('id', providerIds)
      .eq('is_approved', true)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching providers:', error);
      throw new BroadcastError('Failed to validate providers', 'DATABASE_ERROR');
    }

    if (!providers || providers.length !== providerIds.length) {
      const foundIds = new Set(providers?.map((p) => p.id) || []);
      const missingIds = providerIds.filter((id) => !foundIds.has(id));
      throw new BroadcastError(
        `Providers not found or inactive: ${missingIds.join(', ')}`,
        'PROVIDER_NOT_FOUND'
      );
    }

    // Check that all providers support custom orders
    const nonCustomProviders = providers.filter(
      (p) => p.operation_mode === 'standard'
    );
    if (nonCustomProviders.length > 0) {
      throw new BroadcastError(
        `Providers do not support custom orders: ${nonCustomProviders.map((p) => p.name_ar).join(', ')}`,
        'PROVIDER_NOT_CUSTOM_ORDER'
      );
    }

    return providers as ValidatedProvider[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Broadcast Status & Retrieval
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get broadcast with all requests (for comparison view)
   * الحصول على البث مع جميع الطلبات
   */
  async getBroadcastWithRequests(
    broadcastId: string
  ): Promise<BroadcastStatusResponse> {
    const { data: broadcast, error: broadcastError } = await this.supabase
      .from('custom_order_broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single();

    if (broadcastError || !broadcast) {
      return {
        success: false,
        error: 'Broadcast not found',
      };
    }

    // Verify customer authorization
    if (this.customerId && broadcast.customer_id !== this.customerId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Get requests with provider details
    const { data: requests, error: requestsError } = await this.supabase
      .from('custom_order_requests')
      .select(`
        *,
        provider:providers(
          id,
          name_ar,
          name_en,
          logo_url,
          rating,
          delivery_fee
        )
      `)
      .eq('broadcast_id', broadcastId)
      .order('created_at', { ascending: true });

    if (requestsError) {
      return {
        success: false,
        error: 'Failed to fetch requests',
      };
    }

    return {
      success: true,
      broadcast: {
        ...broadcast,
        requests: requests || [],
      } as BroadcastWithRequests,
    };
  }

  /**
   * Get active broadcasts for customer
   * الحصول على البثوث النشطة للعميل
   */
  async getActiveCustomerBroadcasts(): Promise<CustomOrderBroadcast[]> {
    if (!this.customerId) {
      throw new BroadcastError('Customer ID is required', 'UNAUTHORIZED');
    }

    const { data, error } = await this.supabase
      .from('custom_order_broadcasts')
      .select('*')
      .eq('customer_id', this.customerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active broadcasts:', error);
      return [];
    }

    return (data || []) as CustomOrderBroadcast[];
  }

  /**
   * Get broadcasts history for customer
   * الحصول على سجل البثوث للعميل
   */
  async getCustomerBroadcastsHistory(limit = 20): Promise<CustomOrderBroadcast[]> {
    if (!this.customerId) {
      throw new BroadcastError('Customer ID is required', 'UNAUTHORIZED');
    }

    const { data, error } = await this.supabase
      .from('custom_order_broadcasts')
      .select('*')
      .eq('customer_id', this.customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching broadcasts history:', error);
      return [];
    }

    return (data || []) as CustomOrderBroadcast[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Provider-side Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get pending pricing requests for provider
   * الحصول على طلبات التسعير المعلقة للتاجر
   */
  async getPendingRequests(): Promise<CustomOrderRequest[]> {
    if (!this.providerId) {
      throw new BroadcastError('Provider ID is required', 'UNAUTHORIZED');
    }

    const { data, error } = await this.supabase
      .from('custom_order_requests')
      .select(`
        *,
        broadcast:custom_order_broadcasts(
          customer_id,
          original_text,
          voice_url,
          image_urls,
          transcribed_text,
          customer_notes,
          delivery_address,
          order_type,
          pricing_deadline
        )
      `)
      .eq('provider_id', this.providerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }

    return (data || []) as CustomOrderRequest[];
  }

  /**
   * Get all requests for provider (for dashboard)
   * الحصول على جميع الطلبات للتاجر
   */
  async getProviderRequests(
    status?: CustomRequestStatus[]
  ): Promise<CustomOrderRequest[]> {
    if (!this.providerId) {
      throw new BroadcastError('Provider ID is required', 'UNAUTHORIZED');
    }

    let query = this.supabase
      .from('custom_order_requests')
      .select(`
        *,
        broadcast:custom_order_broadcasts(
          customer_id,
          customer:users!custom_order_broadcasts_customer_id_fkey(
            id,
            full_name,
            phone
          ),
          original_text,
          voice_url,
          image_urls,
          transcribed_text,
          customer_notes,
          delivery_address,
          order_type,
          pricing_deadline,
          status
        )
      `)
      .eq('provider_id', this.providerId)
      .order('created_at', { ascending: false });

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching provider requests:', error);
      return [];
    }

    return (data || []) as CustomOrderRequest[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Broadcast Cancellation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cancel a broadcast (customer only, if still active)
   * إلغاء البث (للعميل فقط، إذا كان نشطاً)
   */
  async cancelBroadcast(broadcastId: string): Promise<boolean> {
    if (!this.customerId) {
      throw new BroadcastError('Customer ID is required', 'UNAUTHORIZED');
    }

    // Verify ownership and status
    const { data: broadcast, error: fetchError } = await this.supabase
      .from('custom_order_broadcasts')
      .select('id, customer_id, status')
      .eq('id', broadcastId)
      .single();

    if (fetchError || !broadcast) {
      throw new BroadcastError('Broadcast not found', 'BROADCAST_NOT_FOUND');
    }

    if (broadcast.customer_id !== this.customerId) {
      throw new BroadcastError('Unauthorized', 'UNAUTHORIZED');
    }

    if (broadcast.status !== 'active') {
      throw new BroadcastError(
        'Cannot cancel non-active broadcast',
        'BROADCAST_NOT_ACTIVE'
      );
    }

    // Update broadcast status
    const { error: updateError } = await this.supabase
      .from('custom_order_broadcasts')
      .update({ status: 'cancelled' as BroadcastStatus })
      .eq('id', broadcastId);

    if (updateError) {
      console.error('Error cancelling broadcast:', updateError);
      throw new BroadcastError('Failed to cancel broadcast', 'DATABASE_ERROR');
    }

    // Cancel all pending requests
    await this.supabase
      .from('custom_order_requests')
      .update({ status: 'cancelled' as CustomRequestStatus })
      .eq('broadcast_id', broadcastId)
      .in('status', ['pending']);

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Statistics & Counts
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get count of pending pricing requests for provider badge
   * الحصول على عدد طلبات التسعير المعلقة
   */
  async getPendingRequestsCount(): Promise<number> {
    if (!this.providerId) {
      return 0;
    }

    const { count, error } = await this.supabase
      .from('custom_order_requests')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', this.providerId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching pending count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get count of active broadcasts for customer
   * الحصول على عدد البثوث النشطة للعميل
   */
  async getActiveBroadcastsCount(): Promise<number> {
    if (!this.customerId) {
      return 0;
    }

    const { count, error } = await this.supabase
      .from('custom_order_broadcasts')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', this.customerId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching active count:', error);
      return 0;
    }

    return count || 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a broadcast service for customer
 */
export function createCustomerBroadcastService(
  supabase: AnySupabaseClient,
  customerId: string
): BroadcastService {
  return new BroadcastService({
    supabase,
    customerId,
  });
}

/**
 * Create a broadcast service for provider
 */
export function createProviderBroadcastService(
  supabase: AnySupabaseClient,
  providerId: string
): BroadcastService {
  return new BroadcastService({
    supabase,
    providerId,
  });
}
