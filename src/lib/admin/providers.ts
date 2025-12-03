// ═══════════════════════════════════════════════════════════════════════
// إدارة مقدمي الخدمة - Providers Management
// ═══════════════════════════════════════════════════════════════════════

import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditAction, logActivity, AUDIT_ACTIONS } from './audit';
import type {
  AdminProvider,
  ProviderFilters,
  ProviderApprovalRequest,
  PaginatedResult,
  OperationResult,
  ProviderStatus,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ERROR_CODES,
} from './types';

const PAGE_SIZE = 20;
const MAX_SIZE = 100;

// ═══════════════════════════════════════════════════════════════════════
// جلب مقدمي الخدمة - Fetch Providers
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب قائمة مقدمي الخدمة مع الفلترة والتصفح
 * Fetch providers list with filtering and pagination
 */
export async function getProviders(
  filters: ProviderFilters = {}
): Promise<OperationResult<PaginatedResult<AdminProvider>>> {
  try {
    const supabase = createAdminClient();

    const {
      status,
      category,
      governorateId,
      cityId,
      search,
      isFeatured,
      isVerified,
      page = 1,
      limit = PAGE_SIZE,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = filters;

    // Clamp limit to max
    const actualLimit = Math.min(limit, MAX_SIZE);
    const offset = (page - 1) * actualLimit;

    // Build query
    let query = supabase
      .from('providers')
      .select(
        `
        *,
        governorate:governorates(id, name_ar, name_en),
        city:cities(id, name_ar, name_en)
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (governorateId) {
      query = query.eq('governorate_id', governorateId);
    }

    if (cityId) {
      query = query.eq('city_id', cityId);
    }

    if (typeof isFeatured === 'boolean') {
      query = query.eq('is_featured', isFeatured);
    }

    if (typeof isVerified === 'boolean') {
      query = query.eq('is_verified', isVerified);
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.or(
        `name_ar.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
      );
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    query = query.range(offset, offset + actualLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching providers:', error);
      return { success: false, error: error.message, errorCode: 'DATABASE_ERROR' };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / actualLimit);

    return {
      success: true,
      data: {
        data: (data || []) as AdminProvider[],
        total,
        page,
        limit: actualLimit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (err) {
    console.error('Error in getProviders:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * جلب مقدم خدمة واحد بالمعرف
 * Fetch a single provider by ID
 */
export async function getProviderById(
  providerId: string
): Promise<OperationResult<AdminProvider>> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('providers')
      .select(
        `
        *,
        governorate:governorates(id, name_ar, name_en),
        city:cities(id, name_ar, name_en)
      `
      )
      .eq('id', providerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Provider not found', errorCode: 'NOT_FOUND' };
      }
      return { success: false, error: error.message, errorCode: 'DATABASE_ERROR' };
    }

    return { success: true, data: data as AdminProvider };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * جلب مقدمي الخدمة المعلقين (في انتظار المراجعة)
 * Fetch pending providers
 */
export async function getPendingProviders(
  page = 1,
  limit = PAGE_SIZE
): Promise<OperationResult<PaginatedResult<AdminProvider>>> {
  return getProviders({
    status: ['pending_review', 'pending_documents'],
    page,
    limit,
    sortBy: 'created_at',
    sortOrder: 'asc', // Oldest first for queue processing
  });
}

// ═══════════════════════════════════════════════════════════════════════
// الموافقة والرفض - Approval/Rejection
// ═══════════════════════════════════════════════════════════════════════

/**
 * الموافقة على مقدم خدمة
 * Approve a provider
 */
export async function approveProvider(
  adminId: string,
  providerId: string,
  commissionRate?: number
): Promise<OperationResult<AdminProvider>> {
  try {
    const supabase = createAdminClient();

    // Fetch current provider
    const { data: current, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Provider not found', errorCode: 'NOT_FOUND' };
    }

    // Validate status transition
    const validStatuses: ProviderStatus[] = ['pending_review', 'pending_documents', 'rejected'];
    if (!validStatuses.includes(current.status)) {
      return {
        success: false,
        error: `Cannot approve provider with status: ${current.status}`,
        errorCode: 'INVALID_STATUS_TRANSITION',
      };
    }

    // Update provider
    const updateData: Partial<AdminProvider> = {
      status: 'approved' as ProviderStatus,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    };

    if (typeof commissionRate === 'number') {
      updateData.commission_rate = commissionRate;
    }

    const { data: updated, error: updateError } = await supabase
      .from('providers')
      .update(updateData)
      .eq('id', providerId)
      .select(
        `
        *,
        governorate:governorates(id, name_ar, name_en),
        city:cities(id, name_ar, name_en)
      `
      )
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: AUDIT_ACTIONS.PROVIDER_APPROVED,
      resourceType: 'provider',
      resourceId: providerId,
      resourceName: current.name_ar,
      oldData: { status: current.status, commission_rate: current.commission_rate },
      newData: { status: 'approved', commission_rate: updateData.commission_rate },
    });

    // Log activity
    await logActivity(
      adminId,
      'provider_approved',
      `تمت الموافقة على مقدم الخدمة: ${current.name_ar}`,
      { providerId, providerName: current.name_ar }
    );

    return { success: true, data: updated as AdminProvider };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * رفض مقدم خدمة
 * Reject a provider
 */
export async function rejectProvider(
  adminId: string,
  providerId: string,
  reason: string
): Promise<OperationResult<AdminProvider>> {
  try {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Rejection reason is required', errorCode: 'VALIDATION_ERROR' };
    }

    const supabase = createAdminClient();

    // Fetch current provider
    const { data: current, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Provider not found', errorCode: 'NOT_FOUND' };
    }

    // Validate status transition
    const validStatuses: ProviderStatus[] = ['pending_review', 'pending_documents', 'approved'];
    if (!validStatuses.includes(current.status)) {
      return {
        success: false,
        error: `Cannot reject provider with status: ${current.status}`,
        errorCode: 'INVALID_STATUS_TRANSITION',
      };
    }

    // Update provider
    const { data: updated, error: updateError } = await supabase
      .from('providers')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId)
      .select(
        `
        *,
        governorate:governorates(id, name_ar, name_en),
        city:cities(id, name_ar, name_en)
      `
      )
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: AUDIT_ACTIONS.PROVIDER_REJECTED,
      resourceType: 'provider',
      resourceId: providerId,
      resourceName: current.name_ar,
      oldData: { status: current.status },
      newData: { status: 'rejected', rejection_reason: reason.trim() },
      reason: reason.trim(),
    });

    // Log activity
    await logActivity(
      adminId,
      'provider_rejected',
      `تم رفض مقدم الخدمة: ${current.name_ar} - السبب: ${reason}`,
      { providerId, providerName: current.name_ar, reason }
    );

    return { success: true, data: updated as AdminProvider };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * إيقاف مقدم خدمة
 * Suspend a provider
 */
export async function suspendProvider(
  adminId: string,
  providerId: string,
  reason: string
): Promise<OperationResult<AdminProvider>> {
  try {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Suspension reason is required', errorCode: 'VALIDATION_ERROR' };
    }

    const supabase = createAdminClient();

    // Fetch current provider
    const { data: current, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Provider not found', errorCode: 'NOT_FOUND' };
    }

    // Can only suspend approved/open/closed providers
    const validStatuses: ProviderStatus[] = ['approved', 'open', 'closed'];
    if (!validStatuses.includes(current.status)) {
      return {
        success: false,
        error: `Cannot suspend provider with status: ${current.status}`,
        errorCode: 'INVALID_STATUS_TRANSITION',
      };
    }

    // Update provider
    const { data: updated, error: updateError } = await supabase
      .from('providers')
      .update({
        status: 'suspended',
        rejection_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId)
      .select(
        `
        *,
        governorate:governorates(id, name_ar, name_en),
        city:cities(id, name_ar, name_en)
      `
      )
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: AUDIT_ACTIONS.PROVIDER_SUSPENDED,
      resourceType: 'provider',
      resourceId: providerId,
      resourceName: current.name_ar,
      oldData: { status: current.status },
      newData: { status: 'suspended', rejection_reason: reason.trim() },
      reason: reason.trim(),
    });

    return { success: true, data: updated as AdminProvider };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * إعادة تفعيل مقدم خدمة موقوف
 * Reactivate a suspended provider
 */
export async function reactivateProvider(
  adminId: string,
  providerId: string
): Promise<OperationResult<AdminProvider>> {
  try {
    const supabase = createAdminClient();

    // Fetch current provider
    const { data: current, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Provider not found', errorCode: 'NOT_FOUND' };
    }

    // Can only reactivate suspended providers
    if (current.status !== 'suspended') {
      return {
        success: false,
        error: `Cannot reactivate provider with status: ${current.status}`,
        errorCode: 'INVALID_STATUS_TRANSITION',
      };
    }

    // Update provider
    const { data: updated, error: updateError } = await supabase
      .from('providers')
      .update({
        status: 'approved',
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId)
      .select(
        `
        *,
        governorate:governorates(id, name_ar, name_en),
        city:cities(id, name_ar, name_en)
      `
      )
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: 'reactivate',
      resourceType: 'provider',
      resourceId: providerId,
      resourceName: current.name_ar,
      oldData: { status: current.status },
      newData: { status: 'approved' },
    });

    // Log activity
    await logActivity(
      adminId,
      'provider_reactivated',
      `تم إعادة تفعيل مقدم الخدمة: ${current.name_ar}`,
      { providerId, providerName: current.name_ar }
    );

    return { success: true, data: updated as AdminProvider };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// تحديث مقدم الخدمة - Update Provider
// ═══════════════════════════════════════════════════════════════════════

/**
 * تحديث نسبة العمولة
 * Update commission rate
 */
export async function updateProviderCommission(
  adminId: string,
  providerId: string,
  commissionRate: number
): Promise<OperationResult<AdminProvider>> {
  try {
    // Validate commission rate
    if (commissionRate < 0 || commissionRate > 100) {
      return { success: false, error: 'Commission rate must be between 0 and 100', errorCode: 'VALIDATION_ERROR' };
    }

    const supabase = createAdminClient();

    // Fetch current provider
    const { data: current, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Provider not found', errorCode: 'NOT_FOUND' };
    }

    // Update provider
    const { data: updated, error: updateError } = await supabase
      .from('providers')
      .update({
        commission_rate: commissionRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId)
      .select(
        `
        *,
        governorate:governorates(id, name_ar, name_en),
        city:cities(id, name_ar, name_en)
      `
      )
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: AUDIT_ACTIONS.PROVIDER_COMMISSION_CHANGED,
      resourceType: 'provider',
      resourceId: providerId,
      resourceName: current.name_ar,
      oldData: { commission_rate: current.commission_rate },
      newData: { commission_rate: commissionRate },
    });

    return { success: true, data: updated as AdminProvider };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

/**
 * تحديث حالة التميز
 * Toggle featured status
 */
export async function toggleProviderFeatured(
  adminId: string,
  providerId: string,
  isFeatured: boolean
): Promise<OperationResult<AdminProvider>> {
  try {
    const supabase = createAdminClient();

    // Fetch current provider
    const { data: current, error: fetchError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Provider not found', errorCode: 'NOT_FOUND' };
    }

    // Update provider
    const { data: updated, error: updateError } = await supabase
      .from('providers')
      .update({
        is_featured: isFeatured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId)
      .select(
        `
        *,
        governorate:governorates(id, name_ar, name_en),
        city:cities(id, name_ar, name_en)
      `
      )
      .single();

    if (updateError) {
      return { success: false, error: updateError.message, errorCode: 'DATABASE_ERROR' };
    }

    // Log audit action
    await logAuditAction(adminId, {
      action: AUDIT_ACTIONS.PROVIDER_UPDATED,
      resourceType: 'provider',
      resourceId: providerId,
      resourceName: current.name_ar,
      oldData: { is_featured: current.is_featured },
      newData: { is_featured: isFeatured },
    });

    return { success: true, data: updated as AdminProvider };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// إحصائيات مقدمي الخدمة - Provider Statistics
// ═══════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات مقدمي الخدمة
 * Get provider statistics
 */
export async function getProviderStats(): Promise<
  OperationResult<{
    total: number;
    byStatus: Record<ProviderStatus, number>;
    byCategory: Record<string, number>;
  }>
> {
  try {
    const supabase = createAdminClient();

    // Get total count and breakdown by status
    const { data: providers, error } = await supabase
      .from('providers')
      .select('status, category');

    if (error) {
      return { success: false, error: error.message, errorCode: 'DATABASE_ERROR' };
    }

    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const provider of providers || []) {
      // Count by status
      byStatus[provider.status] = (byStatus[provider.status] || 0) + 1;
      // Count by category
      if (provider.category) {
        byCategory[provider.category] = (byCategory[provider.category] || 0) + 1;
      }
    }

    return {
      success: true,
      data: {
        total: providers?.length || 0,
        byStatus: byStatus as Record<ProviderStatus, number>,
        byCategory,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'DATABASE_ERROR',
    };
  }
}
