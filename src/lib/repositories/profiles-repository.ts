/**
 * Profiles Repository
 *
 * Phase 3.2: Repository Pattern Implementation
 *
 * Centralizes all user profile-related database operations.
 * Replaces direct Supabase calls in hooks and services.
 */

import {
  BaseRepository,
  RepositoryResult,
  RepositoryListResult,
  PaginatedResult,
} from './base-repository';

// User role types
export type UserRole = 'customer' | 'provider' | 'admin';

// Profile entity type
export interface Profile {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  governorate_id: string | null;
  city_id: string | null;
  district_id: string | null;
  preferred_language: string;
  notification_preferences: {
    push: boolean;
    email: boolean;
    sms: boolean;
  } | null;
  total_orders: number;
  total_spent: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations (when joined)
  governorate?: { id: string; name_ar: string; name_en: string };
  city?: { id: string; name_ar: string; name_en: string };
  district?: { id: string; name_ar: string; name_en: string };
}

// Profile insert type (for new user registration)
export interface ProfileInsert {
  id: string; // Must match auth.users.id
  email: string;
  full_name: string;
  phone?: string | null;
  role?: UserRole;
  governorate_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  preferred_language?: string;
}

// Profile update type
export type ProfileUpdate = Partial<
  Omit<Profile, 'id' | 'email' | 'created_at' | 'governorate' | 'city' | 'district'>
>;

// Profile listing options
export interface ProfileListOptions {
  role?: UserRole;
  isActive?: boolean;
  governorateId?: string;
  cityId?: string;
  search?: string;
  sort?: 'created_at' | 'full_name' | 'total_orders' | 'total_spent' | 'last_login_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Profile with relations select string
const PROFILE_WITH_RELATIONS = `
  *,
  governorate:governorates(id, name_ar, name_en),
  city:cities(id, name_ar, name_en),
  district:districts(id, name_ar, name_en)
`;

/**
 * Profiles Repository
 *
 * Provides centralized access to user profile data with common operations
 * optimized for the Engezna platform.
 */
class ProfilesRepositoryClass extends BaseRepository<Profile, ProfileInsert, ProfileUpdate> {
  constructor() {
    super('profiles', '*');
  }

  /**
   * Find a profile by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<RepositoryResult<Profile>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(PROFILE_WITH_RELATIONS)
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Profile, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Find a profile by email
   */
  async findByEmail(email: string): Promise<RepositoryResult<Profile>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Profile, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Find a profile by phone
   */
  async findByPhone(phone: string): Promise<RepositoryResult<Profile>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('phone', phone)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Profile, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * List profiles with filtering and sorting
   */
  async listProfiles(options: ProfileListOptions = {}): Promise<RepositoryListResult<Profile>> {
    try {
      const {
        role,
        isActive,
        governorateId,
        cityId,
        search,
        sort = 'created_at',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = options;

      let query = this.supabase.from(this.tableName).select('*', { count: 'exact' });

      // Role filter
      if (role) {
        query = query.eq('role', role);
      }

      // Active filter
      if (typeof isActive === 'boolean') {
        query = query.eq('is_active', isActive);
      }

      // Location filters
      if (governorateId) {
        query = query.eq('governorate_id', governorateId);
      }

      if (cityId) {
        query = query.eq('city_id', cityId);
      }

      // Search filter
      if (search?.trim()) {
        query = query.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      // Sorting
      const ascending = sortOrder === 'asc';
      query = query.order(sort, { ascending });

      // Pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return {
        data: (data as Profile[]) ?? [],
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
   * List profiles with pagination (for admin views)
   */
  async listProfilesPaginated(
    options: ProfileListOptions & { page?: number; pageSize?: number }
  ): Promise<RepositoryResult<PaginatedResult<Profile>>> {
    const { page = 1, pageSize = 20, ...listOptions } = options;
    const offset = (page - 1) * pageSize;

    const result = await this.listProfiles({
      ...listOptions,
      limit: pageSize,
      offset,
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    const totalCount = result.count ?? result.data.length;

    return {
      data: {
        data: result.data,
        count: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      error: null,
    };
  }

  /**
   * Get customers only
   */
  async getCustomers(
    options?: Omit<ProfileListOptions, 'role'>
  ): Promise<RepositoryListResult<Profile>> {
    return this.listProfiles({
      ...options,
      role: 'customer',
    });
  }

  /**
   * Get providers only
   */
  async getProviderProfiles(
    options?: Omit<ProfileListOptions, 'role'>
  ): Promise<RepositoryListResult<Profile>> {
    return this.listProfiles({
      ...options,
      role: 'provider',
    });
  }

  /**
   * Get admins only
   */
  async getAdmins(
    options?: Omit<ProfileListOptions, 'role'>
  ): Promise<RepositoryListResult<Profile>> {
    return this.listProfiles({
      ...options,
      role: 'admin',
    });
  }

  /**
   * Update user location
   */
  async updateLocation(
    id: string,
    location: {
      governorateId?: string | null;
      cityId?: string | null;
      districtId?: string | null;
    }
  ): Promise<RepositoryResult<Profile>> {
    return this.update(id, {
      governorate_id: location.governorateId,
      city_id: location.cityId,
      district_id: location.districtId,
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<RepositoryResult<Profile>> {
    return this.update(id, {
      last_login_at: new Date().toISOString(),
    });
  }

  /**
   * Activate a user
   */
  async activate(id: string): Promise<RepositoryResult<Profile>> {
    return this.update(id, { is_active: true });
  }

  /**
   * Deactivate a user
   */
  async deactivate(id: string): Promise<RepositoryResult<Profile>> {
    return this.update(id, { is_active: false });
  }

  /**
   * Update user role
   */
  async updateRole(id: string, role: UserRole): Promise<RepositoryResult<Profile>> {
    return this.update(id, { role });
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    id: string,
    preferences: { push?: boolean; email?: boolean; sms?: boolean }
  ): Promise<RepositoryResult<Profile>> {
    // Get current preferences
    const { data: profile, error: fetchError } = await this.findById(id);

    if (fetchError || !profile) {
      return { data: null, error: fetchError ?? new Error('Profile not found') };
    }

    const currentPrefs = profile.notification_preferences ?? { push: true, email: true, sms: true };

    return this.update(id, {
      notification_preferences: {
        ...currentPrefs,
        ...preferences,
      },
    });
  }

  /**
   * Increment order stats after order completion
   */
  async incrementOrderStats(id: string, orderTotal: number): Promise<RepositoryResult<Profile>> {
    // Get current stats
    const { data: profile, error: fetchError } = await this.findById(id);

    if (fetchError || !profile) {
      return { data: null, error: fetchError ?? new Error('Profile not found') };
    }

    return this.update(id, {
      total_orders: profile.total_orders + 1,
      total_spent: profile.total_spent + orderTotal,
    });
  }

  /**
   * Count users by role
   */
  async countByRole(role: UserRole): Promise<RepositoryResult<number>> {
    return this.count([{ column: 'role', operator: 'eq', value: role }]);
  }

  /**
   * Count active users
   */
  async countActive(): Promise<RepositoryResult<number>> {
    return this.count([{ column: 'is_active', operator: 'eq', value: true }]);
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<
    RepositoryResult<{
      total: number;
      active: number;
      inactive: number;
      customers: number;
      providers: number;
      admins: number;
    }>
  > {
    try {
      const { data, error } = await this.supabase.from(this.tableName).select('role, is_active');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const stats = {
        total: data?.length ?? 0,
        active: data?.filter((p) => p.is_active).length ?? 0,
        inactive: data?.filter((p) => !p.is_active).length ?? 0,
        customers: data?.filter((p) => p.role === 'customer').length ?? 0,
        providers: data?.filter((p) => p.role === 'provider').length ?? 0,
        admins: data?.filter((p) => p.role === 'admin').length ?? 0,
      };

      return { data: stats, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Search users
   */
  async search(
    query: string,
    options?: Omit<ProfileListOptions, 'search'>
  ): Promise<RepositoryListResult<Profile>> {
    return this.listProfiles({
      ...options,
      search: query,
    });
  }
}

// Export singleton instance
export const ProfilesRepository = new ProfilesRepositoryClass();

// Export class for testing
export { ProfilesRepositoryClass };
