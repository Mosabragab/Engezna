/**
 * Providers Repository
 *
 * Phase 3.2: Repository Pattern Implementation
 *
 * Centralizes all provider-related database operations.
 * Replaces direct Supabase calls in hooks and services.
 */

import {
  BaseRepository,
  QueryOptions,
  RepositoryResult,
  RepositoryListResult,
  PaginatedResult,
} from './base-repository';

// Provider status types
export type ProviderStatus =
  | 'pending_approval'
  | 'incomplete'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'open'
  | 'closed'
  | 'temporarily_paused'
  | 'on_vacation';

// Business hours structure (JSONB in database)
export interface BusinessHours {
  monday?: { open: string; close: string; is_open?: boolean };
  tuesday?: { open: string; close: string; is_open?: boolean };
  wednesday?: { open: string; close: string; is_open?: boolean };
  thursday?: { open: string; close: string; is_open?: boolean };
  friday?: { open: string; close: string; is_open?: boolean };
  saturday?: { open: string; close: string; is_open?: boolean };
  sunday?: { open: string; close: string; is_open?: boolean };
}

// Provider entity type
// NOTE: Columns verified against actual database schema:
// - is_verified: doesn't exist
// - address: replaced with address_ar, address_en
// - opening_time, closing_time: replaced with business_hours (JSONB)
export interface Provider {
  id: string;
  owner_id: string | null;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  category: string; // USER-DEFINED enum in database
  logo_url: string | null;
  cover_image_url: string | null;
  status: ProviderStatus;
  rejection_reason: string | null;
  commission_rate: number;
  rating: number;
  total_reviews: number;
  total_orders: number;
  is_featured: boolean;
  // NOTE: is_verified column doesn't exist in database
  phone: string | null;
  email: string | null;
  address_ar: string | null;
  address_en: string | null;
  governorate_id: string | null;
  city_id: string | null;
  business_hours: BusinessHours | null;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  created_at: string;
  updated_at: string;
  // Relations (when joined)
  governorate?: { id: string; name_ar: string; name_en: string };
  city?: { id: string; name_ar: string; name_en: string };
  owner?: { id: string; full_name: string; email: string };
}

// Provider insert type
export type ProviderInsert = Omit<
  Provider,
  'id' | 'created_at' | 'updated_at' | 'governorate' | 'city' | 'owner'
>;

// Provider update type
export type ProviderUpdate = Partial<ProviderInsert>;

// Provider listing options
// NOTE: isVerified removed - column doesn't exist in database
export interface ProviderListOptions {
  status?: ProviderStatus | ProviderStatus[];
  category?: string;
  cityId?: string;
  governorateId?: string;
  isFeatured?: boolean;
  search?: string;
  sort?: 'rating' | 'delivery_time' | 'delivery_fee' | 'created_at' | 'name_ar' | 'total_orders';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Provider with relations select string
// NOTE: Verified against actual database schema
const PROVIDER_WITH_RELATIONS = `
  id, owner_id, name_ar, name_en, description_ar, description_en, category,
  logo_url, cover_image_url, status, rejection_reason, commission_rate,
  rating, total_reviews, total_orders, is_featured,
  phone, email, address_ar, address_en, governorate_id, city_id,
  business_hours, delivery_fee, min_order_amount,
  estimated_delivery_time_min, created_at, updated_at,
  governorate:governorates(id, name_ar, name_en),
  city:cities(id, name_ar, name_en)
`;

// Optimized select for customer-facing provider listings (Phase 4.1)
// NOTE: is_verified removed - doesn't exist in database
const PROVIDER_LIST_SELECT = `
  id, name_ar, name_en, category, logo_url, cover_image_url,
  status, rating, total_reviews, is_featured,
  delivery_fee, min_order_amount, estimated_delivery_time_min,
  governorate_id, city_id
`;

// Optimized select for provider detail pages
// NOTE: Verified against actual database schema
const PROVIDER_DETAIL_SELECT = `
  id, owner_id, name_ar, name_en, description_ar, description_en, category,
  logo_url, cover_image_url, status, rating, total_reviews, total_orders,
  is_featured, phone, email, address_ar, address_en,
  governorate_id, city_id, business_hours,
  delivery_fee, min_order_amount, estimated_delivery_time_min, created_at
`;

// Select for admin statistics (minimal)
const PROVIDER_STATS_SELECT = 'id, status, is_featured';

/**
 * Providers Repository
 *
 * Provides centralized access to provider data with common operations
 * optimized for the Engezna platform.
 */
class ProvidersRepositoryClass extends BaseRepository<Provider, ProviderInsert, ProviderUpdate> {
  constructor() {
    // Use optimized detail select as default (Phase 4.1)
    super('providers', PROVIDER_DETAIL_SELECT);
  }

  /**
   * Find a provider by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<RepositoryResult<Provider>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(PROVIDER_WITH_RELATIONS)
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as Provider, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * List providers with filtering and sorting
   * Optimized for customer-facing provider listings
   */
  async listProviders(options: ProviderListOptions = {}): Promise<RepositoryListResult<Provider>> {
    try {
      const {
        status,
        category,
        cityId,
        governorateId,
        isFeatured,
        search,
        sort = 'rating',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = options;

      // Use optimized list select for customer-facing views (Phase 4.1)
      let query = this.supabase
        .from(this.tableName)
        .select(PROVIDER_LIST_SELECT, { count: 'exact' });

      // Status filter
      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      // Category filter
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      // Location filters
      if (cityId) {
        query = query.eq('city_id', cityId);
      }

      if (governorateId) {
        query = query.eq('governorate_id', governorateId);
      }

      // Boolean filters
      if (typeof isFeatured === 'boolean') {
        query = query.eq('is_featured', isFeatured);
      }

      // NOTE: is_verified filter removed - column doesn't exist in database

      // Search filter
      if (search?.trim()) {
        query = query.or(`name_ar.ilike.%${search}%,name_en.ilike.%${search}%`);
      }

      // Sorting
      const ascending = sortOrder === 'asc';
      switch (sort) {
        case 'rating':
          query = query
            .order('is_featured', { ascending: false })
            .order('rating', { ascending: false });
          break;
        case 'delivery_time':
          query = query.order('estimated_delivery_time_min', { ascending: true });
          break;
        case 'delivery_fee':
          query = query.order('delivery_fee', { ascending: true });
          break;
        case 'name_ar':
          query = query.order('name_ar', { ascending });
          break;
        case 'total_orders':
          query = query.order('total_orders', { ascending });
          break;
        case 'created_at':
        default:
          query = query.order('created_at', { ascending });
          break;
      }

      // Pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return {
        data: (data as unknown as Provider[]) ?? [],
        error: null,
        count: count ?? undefined,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * List providers with relations (for admin views)
   */
  async listProvidersWithRelations(
    options: ProviderListOptions & { page?: number; pageSize?: number }
  ): Promise<RepositoryResult<PaginatedResult<Provider>>> {
    try {
      const {
        status,
        category,
        cityId,
        governorateId,
        isFeatured,
        search,
        sort = 'created_at',
        sortOrder = 'desc',
        page = 1,
        pageSize = 20,
      } = options;

      const offset = (page - 1) * pageSize;

      let query = this.supabase
        .from(this.tableName)
        .select(PROVIDER_WITH_RELATIONS, { count: 'exact' });

      // Apply all filters (same as listProviders)
      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (cityId) {
        query = query.eq('city_id', cityId);
      }

      if (governorateId) {
        query = query.eq('governorate_id', governorateId);
      }

      if (typeof isFeatured === 'boolean') {
        query = query.eq('is_featured', isFeatured);
      }

      // NOTE: is_verified filter removed - column doesn't exist in database

      if (search?.trim()) {
        query = query.or(
          `name_ar.ilike.%${search}%,name_en.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      // Sorting
      const ascending = sortOrder === 'asc';
      query = query.order(sort as string, { ascending });

      // Pagination
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const totalCount = count ?? 0;

      return {
        data: {
          data: (data as unknown as Provider[]) ?? [],
          count: totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Get featured providers
   */
  async getFeatured(limit = 6): Promise<RepositoryListResult<Provider>> {
    return this.listProviders({
      isFeatured: true,
      status: ['open', 'closed'],
      sort: 'rating',
      limit,
    });
  }

  /**
   * Get top-rated providers
   */
  async getTopRated(limit = 6): Promise<RepositoryListResult<Provider>> {
    return this.listProviders({
      status: ['open', 'closed'],
      sort: 'rating',
      limit,
    });
  }

  /**
   * Get providers by category
   */
  async getByCategory(
    category: string,
    options?: Omit<ProviderListOptions, 'category'>
  ): Promise<RepositoryListResult<Provider>> {
    return this.listProviders({
      ...options,
      category,
    });
  }

  /**
   * Get providers by city
   */
  async getByCity(
    cityId: string,
    options?: Omit<ProviderListOptions, 'cityId'>
  ): Promise<RepositoryListResult<Provider>> {
    return this.listProviders({
      ...options,
      cityId,
    });
  }

  /**
   * Search providers
   */
  async search(
    query: string,
    options?: Omit<ProviderListOptions, 'search'>
  ): Promise<RepositoryListResult<Provider>> {
    return this.listProviders({
      ...options,
      search: query,
      status: options?.status ?? ['open', 'closed'],
    });
  }

  /**
   * Update provider status
   */
  async updateStatus(
    id: string,
    status: ProviderStatus,
    reason?: string
  ): Promise<RepositoryResult<Provider>> {
    const updateData: ProviderUpdate = { status };

    if (status === 'rejected' && reason) {
      updateData.rejection_reason = reason;
    }

    return this.update(id, updateData);
  }

  /**
   * Approve a provider
   */
  async approve(id: string, commissionRate?: number): Promise<RepositoryResult<Provider>> {
    const updateData: ProviderUpdate = {
      status: 'approved',
      rejection_reason: null,
    };

    if (commissionRate !== undefined) {
      updateData.commission_rate = commissionRate;
    }

    return this.update(id, updateData);
  }

  /**
   * Reject a provider
   */
  async reject(id: string, reason: string): Promise<RepositoryResult<Provider>> {
    return this.update(id, {
      status: 'rejected',
      rejection_reason: reason,
    });
  }

  /**
   * Suspend a provider
   */
  async suspend(id: string, reason?: string): Promise<RepositoryResult<Provider>> {
    return this.update(id, {
      status: 'suspended',
      rejection_reason: reason ?? null,
    });
  }

  /**
   * Toggle featured status
   */
  async toggleFeatured(id: string): Promise<RepositoryResult<Provider>> {
    // First get current value
    const { data: provider, error: fetchError } = await this.findById(id);

    if (fetchError || !provider) {
      return { data: null, error: fetchError ?? new Error('Provider not found') };
    }

    return this.update(id, {
      is_featured: !provider.is_featured,
    });
  }

  // NOTE: toggleVerified method removed - is_verified column doesn't exist in database

  /**
   * Update provider rating (called after review)
   */
  async updateRating(
    id: string,
    newRating: number,
    totalReviews: number
  ): Promise<RepositoryResult<Provider>> {
    return this.update(id, {
      rating: newRating,
      total_reviews: totalReviews,
    });
  }

  /**
   * Increment order count
   */
  async incrementOrderCount(id: string): Promise<RepositoryResult<Provider>> {
    // Get current count
    const { data: provider, error: fetchError } = await this.findById(id);

    if (fetchError || !provider) {
      return { data: null, error: fetchError ?? new Error('Provider not found') };
    }

    return this.update(id, {
      total_orders: provider.total_orders + 1,
    });
  }

  /**
   * Count providers by status
   */
  async countByStatus(
    status: ProviderStatus | ProviderStatus[]
  ): Promise<RepositoryResult<number>> {
    if (Array.isArray(status)) {
      return this.count([{ column: 'status', operator: 'in', value: status }]);
    }
    return this.count([{ column: 'status', operator: 'eq', value: status }]);
  }

  /**
   * Get provider statistics
   */
  async getStatistics(): Promise<
    RepositoryResult<{
      total: number;
      pending: number;
      approved: number;
      suspended: number;
      featured: number;
    }>
  > {
    try {
      // Use minimal select for statistics (Phase 4.1)
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(PROVIDER_STATS_SELECT);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const stats = {
        total: data?.length ?? 0,
        pending: data?.filter((p) => p.status === 'pending_approval').length ?? 0,
        approved:
          data?.filter((p) => ['approved', 'open', 'closed'].includes(p.status)).length ?? 0,
        suspended: data?.filter((p) => p.status === 'suspended').length ?? 0,
        featured: data?.filter((p) => p.is_featured).length ?? 0,
      };

      return { data: stats, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }
}

// Export singleton instance
export const ProvidersRepository = new ProvidersRepositoryClass();

// Export class for testing
export { ProvidersRepositoryClass };
