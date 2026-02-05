/**
 * Financial Service - خدمة مالية موحدة
 *
 * This service provides a unified interface for financial calculations
 * used by both Admin and Provider dashboards.
 *
 * It reads from the financial_settlement_engine SQL View which is
 * the Single Source of Truth for all financial data.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { Money, sumMoney, getSettlementDirection } from './money';
import type {
  FinancialEngineData,
  ProviderFinancialSummary,
  AdminFinancialSummary,
  RegionalFinancialSummary,
  Settlement,
  SettlementPayment,
  FinancialFilters,
  SettlementAuditLog,
  SettlementDirection,
  SettlementStatus,
} from '@/types/finance';

// ═══════════════════════════════════════════════════════════════════════════════
// Raw Database Response Types (from SQL Views)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw response from admin_financial_summary SQL View
 */
interface AdminSummaryRaw {
  total_providers: number;
  total_orders: number;
  total_revenue: number;
  total_delivery_fees: number;
  total_theoretical_commission: number;
  total_actual_commission: number;
  total_grace_period_discount: number;
  total_refunds: number;
  total_cod_orders: number;
  total_cod_revenue: number;
  total_cod_commission_owed: number;
  total_online_orders: number;
  total_online_revenue: number;
  total_online_payout_owed: number;
  total_net_balance: number;
  providers_to_pay: number;
  providers_to_collect: number;
  providers_balanced: number;
  total_eligible_orders: number;
  total_held_orders: number;
  total_settled_orders: number;
}

/**
 * Raw response from financial_settlement_by_region SQL View
 */
interface RegionalSummaryRaw {
  governorate_id: string;
  governorate_name_ar: string;
  governorate_name_en: string;
  providers_count: number;
  total_orders: number;
  cod_orders: number;
  online_orders: number;
  gross_revenue: number;
  total_commission: number;
  net_balance: number;
  providers_to_pay: number;
  providers_to_collect: number;
}

/**
 * Raw provider data from join query
 */
interface ProviderRaw {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string;
  city_id: string | null;
}

/**
 * Raw response from settlements table with provider join
 */
interface SettlementRaw {
  id: string;
  provider_id: string;
  provider: ProviderRaw | null;
  period_start: string;
  period_end: string;
  total_orders: number;
  gross_revenue: number;
  platform_commission: number;
  delivery_fees_collected: number;
  net_amount_due: number;
  cod_orders_count: number;
  cod_gross_revenue: number;
  cod_commission_owed: number;
  online_orders_count: number;
  online_gross_revenue: number;
  online_platform_commission: number;
  online_payout_owed: number;
  net_balance: number;
  settlement_direction: SettlementDirection;
  status: SettlementStatus;
  amount_paid: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  due_date: string;
  is_overdue: boolean;
  overdue_days: number;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  processed_by: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service Configuration
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

interface FinancialServiceConfig {
  supabase: AnySupabaseClient;
  providerId?: string; // For provider-specific queries
  governorateIds?: string[]; // For regional admin filtering
  isRegionalAdmin?: boolean; // Whether user is regional admin
}

// ═══════════════════════════════════════════════════════════════════════════════
// Financial Service Class
// ═══════════════════════════════════════════════════════════════════════════════

export class FinancialService {
  private supabase: AnySupabaseClient;
  private providerId?: string;
  private governorateIds?: string[];
  private isRegionalAdmin: boolean;

  // Cache for provider IDs in region (reduces repeated DB queries)
  private cachedProviderIds: string[] | null = null;
  private cacheTimestamp: number = 0;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(config: FinancialServiceConfig) {
    this.supabase = config.supabase;
    this.providerId = config.providerId;
    this.governorateIds = config.governorateIds;
    this.isRegionalAdmin = config.isRegionalAdmin ?? false;
  }

  /**
   * Invalidate the provider IDs cache
   * Call this when providers are added/removed from the region
   */
  invalidateCache(): void {
    this.cachedProviderIds = null;
    this.cacheTimestamp = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Core Data Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get raw financial data from the settlement engine
   * This is the base query that respects all filters
   */
  async getFinancialEngineData(filters?: FinancialFilters): Promise<FinancialEngineData[]> {
    let query = this.supabase.from('financial_settlement_engine').select('*');

    // Apply provider filter (for provider dashboard)
    if (this.providerId) {
      query = query.eq('provider_id', this.providerId);
    }

    // Apply regional filter (for regional admin)
    if (this.isRegionalAdmin && this.governorateIds?.length) {
      query = query.in('governorate_id', this.governorateIds);
    }

    // Apply additional filters
    if (filters?.governorateId) {
      query = query.eq('governorate_id', filters.governorateId);
    }

    if (filters?.cityId) {
      query = query.eq('city_id', filters.cityId);
    }

    if (filters?.providerId) {
      query = query.eq('provider_id', filters.providerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching financial engine data:', error);
      throw error;
    }

    return data as FinancialEngineData[];
  }

  /**
   * Get admin-level summary (platform-wide or filtered by region)
   */
  async getAdminSummary(filters?: FinancialFilters): Promise<AdminFinancialSummary> {
    const query = this.supabase.from('admin_financial_summary').select('*');

    // For regional admin, we need to aggregate from financial_settlement_engine
    if (this.isRegionalAdmin && this.governorateIds?.length) {
      const data = await this.getFinancialEngineData(filters);
      return this.aggregateToAdminSummary(data);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching admin summary:', error);
      // Return empty summary on error
      return this.getEmptyAdminSummary();
    }

    return this.mapAdminSummary(data as AdminSummaryRaw);
  }

  /**
   * Get provider-specific financial summary
   */
  async getProviderSummary(providerId?: string): Promise<ProviderFinancialSummary | null> {
    const targetProviderId = providerId || this.providerId;
    if (!targetProviderId) {
      throw new Error('Provider ID is required');
    }

    const data = await this.getFinancialEngineData({
      providerId: targetProviderId,
    });

    if (!data.length) {
      return null;
    }

    return this.mapToProviderSummary(data[0]);
  }

  /**
   * Get financial summary grouped by region
   */
  async getRegionalSummary(filters?: FinancialFilters): Promise<RegionalFinancialSummary[]> {
    let query = this.supabase.from('financial_settlement_by_region').select('*');

    // Apply regional admin filter
    if (this.isRegionalAdmin && this.governorateIds?.length) {
      query = query.in('governorate_id', this.governorateIds);
    }

    // Apply additional governorate filter
    if (filters?.governorateId) {
      query = query.eq('governorate_id', filters.governorateId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching regional summary:', error);
      return [];
    }

    return ((data || []) as RegionalSummaryRaw[]).map((item) => this.mapRegionalSummary(item));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Settlement Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get settlements with filters
   */
  async getSettlements(filters?: FinancialFilters): Promise<Settlement[]> {
    let query = this.supabase
      .from('settlements')
      .select(
        `
        *,
        provider:providers(id, name_ar, name_en, governorate_id, city_id)
      `
      )
      .order('created_at', { ascending: false });

    // Apply provider filter
    if (this.providerId) {
      query = query.eq('provider_id', this.providerId);
    }

    // Apply regional filter
    if (this.isRegionalAdmin && this.governorateIds?.length) {
      // Need to filter via provider's governorate
      const providerIds = await this.getProviderIdsInRegion();
      if (providerIds.length) {
        query = query.in('provider_id', providerIds);
      }
    }

    // Apply status filter
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }

    // Apply date range filter
    if (filters?.dateRange) {
      query = query
        .gte('period_start', filters.dateRange.start)
        .lte('period_end', filters.dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching settlements:', error);
      return [];
    }

    return ((data || []) as SettlementRaw[]).map((item) => this.mapSettlement(item));
  }

  /**
   * Get a single settlement by ID
   */
  async getSettlementById(settlementId: string): Promise<Settlement | null> {
    const { data, error } = await this.supabase
      .from('settlements')
      .select(
        `
        *,
        provider:providers(id, name_ar, name_en, governorate_id, city_id)
      `
      )
      .eq('id', settlementId)
      .single();

    if (error) {
      console.error('Error fetching settlement:', error);
      return null;
    }

    return this.mapSettlement(data as SettlementRaw);
  }

  /**
   * Record a payment for a settlement
   */
  async recordPayment(payment: SettlementPayment): Promise<boolean> {
    const { error } = await this.supabase.rpc('record_settlement_payment', {
      p_settlement_id: payment.settlementId,
      p_amount: payment.amount,
      p_payment_method: payment.paymentMethod,
      p_payment_reference: payment.paymentReference,
      p_processed_by: payment.processedBy,
    });

    if (error) {
      console.error('Error recording payment:', error);
      return false;
    }

    return true;
  }

  /**
   * Get audit log for a settlement
   */
  async getSettlementAuditLog(settlementId: string): Promise<SettlementAuditLog[]> {
    const { data, error } = await this.supabase
      .from('settlement_audit_log')
      .select('*')
      .eq('settlement_id', settlementId)
      .order('performed_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }

    return data as SettlementAuditLog[];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get provider IDs in the regional admin's assigned region
   * Results are cached for 5 minutes to reduce DB queries
   */
  private async getProviderIdsInRegion(): Promise<string[]> {
    if (!this.governorateIds?.length) return [];

    // Check if cache is valid
    const now = Date.now();
    if (
      this.cachedProviderIds !== null &&
      now - this.cacheTimestamp < FinancialService.CACHE_TTL_MS
    ) {
      return this.cachedProviderIds;
    }

    // Fetch from database and update cache
    const { data, error } = await this.supabase
      .from('providers')
      .select('id')
      .in('governorate_id', this.governorateIds);

    if (error) {
      console.error('Error fetching provider IDs in region:', error);
      // Return cached data if available, even if expired
      return this.cachedProviderIds ?? [];
    }

    // Update cache
    const providerIds = (data || []).map((p: { id: string }) => p.id);
    this.cachedProviderIds = providerIds;
    this.cacheTimestamp = now;

    return providerIds;
  }

  /**
   * Map raw engine data to provider summary
   */
  private mapToProviderSummary(data: FinancialEngineData): ProviderFinancialSummary {
    return {
      providerId: data.provider_id,
      providerName: {
        ar: data.provider_name_ar,
        en: data.provider_name_en,
      },
      orders: {
        total: data.total_orders,
        cod: data.cod_orders_count,
        online: data.online_orders_count,
        eligible: data.eligible_orders_count,
        onHold: data.held_orders_count,
        settled: data.settled_orders_count,
      },
      revenue: {
        gross: data.gross_revenue,
        cod: data.cod_gross_revenue,
        online: data.online_gross_revenue,
      },
      commission: {
        theoretical: data.theoretical_commission,
        actual: data.actual_commission,
        gracePeriodDiscount: data.total_grace_period_discount,
        rate: data.commission_rate,
      },
      deliveryFees: {
        total: data.total_delivery_fees,
        cod: data.cod_delivery_fees,
        online: data.online_delivery_fees,
      },
      refunds: {
        total: data.total_refunds,
        commissionReduction: data.total_refund_commission_reduction,
        percentage: data.refund_percentage * 100,
      },
      settlement: {
        codCommissionOwed: data.cod_commission_owed,
        onlinePayoutOwed: data.online_payout_owed,
        netBalance: data.net_balance,
        direction: data.settlement_direction,
      },
      gracePeriod: {
        isActive: data.is_in_grace_period,
        daysRemaining: data.grace_period_days_remaining,
        endDate: data.grace_period_end,
      },
    };
  }

  /**
   * Aggregate financial engine data to admin summary
   */
  private aggregateToAdminSummary(data: FinancialEngineData[]): AdminFinancialSummary {
    if (!data.length) return this.getEmptyAdminSummary();

    return {
      totalProviders: data.length,
      totalOrders: data.reduce((sum, d) => sum + d.total_orders, 0),
      totalRevenue: data.reduce((sum, d) => sum + d.gross_revenue, 0),
      totalDeliveryFees: data.reduce((sum, d) => sum + d.total_delivery_fees, 0),
      totalTheoreticalCommission: data.reduce((sum, d) => sum + d.theoretical_commission, 0),
      totalActualCommission: data.reduce((sum, d) => sum + d.actual_commission, 0),
      totalGracePeriodDiscount: data.reduce((sum, d) => sum + d.total_grace_period_discount, 0),
      totalRefunds: data.reduce((sum, d) => sum + d.total_refunds, 0),
      cod: {
        orders: data.reduce((sum, d) => sum + d.cod_orders_count, 0),
        revenue: data.reduce((sum, d) => sum + d.cod_gross_revenue, 0),
        commissionOwed: data.reduce((sum, d) => sum + d.cod_commission_owed, 0),
      },
      online: {
        orders: data.reduce((sum, d) => sum + d.online_orders_count, 0),
        revenue: data.reduce((sum, d) => sum + d.online_gross_revenue, 0),
        payoutOwed: data.reduce((sum, d) => sum + d.online_payout_owed, 0),
      },
      totalNetBalance: data.reduce((sum, d) => sum + d.net_balance, 0),
      providersToPay: data.filter((d) => d.settlement_direction === 'platform_pays_provider')
        .length,
      providersToCollect: data.filter((d) => d.settlement_direction === 'provider_pays_platform')
        .length,
      providersBalanced: data.filter((d) => d.settlement_direction === 'balanced').length,
      eligibleOrders: data.reduce((sum, d) => sum + d.eligible_orders_count, 0),
      heldOrders: data.reduce((sum, d) => sum + d.held_orders_count, 0),
      settledOrders: data.reduce((sum, d) => sum + d.settled_orders_count, 0),
    };
  }

  /**
   * Map database admin summary to typed summary
   */
  private mapAdminSummary(data: AdminSummaryRaw): AdminFinancialSummary {
    return {
      totalProviders: data.total_providers || 0,
      totalOrders: data.total_orders || 0,
      totalRevenue: data.total_revenue || 0,
      totalDeliveryFees: data.total_delivery_fees || 0,
      totalTheoreticalCommission: data.total_theoretical_commission || 0,
      totalActualCommission: data.total_actual_commission || 0,
      totalGracePeriodDiscount: data.total_grace_period_discount || 0,
      totalRefunds: data.total_refunds || 0,
      cod: {
        orders: data.total_cod_orders || 0,
        revenue: data.total_cod_revenue || 0,
        commissionOwed: data.total_cod_commission_owed || 0,
      },
      online: {
        orders: data.total_online_orders || 0,
        revenue: data.total_online_revenue || 0,
        payoutOwed: data.total_online_payout_owed || 0,
      },
      totalNetBalance: data.total_net_balance || 0,
      providersToPay: data.providers_to_pay || 0,
      providersToCollect: data.providers_to_collect || 0,
      providersBalanced: data.providers_balanced || 0,
      eligibleOrders: data.total_eligible_orders || 0,
      heldOrders: data.total_held_orders || 0,
      settledOrders: data.total_settled_orders || 0,
    };
  }

  /**
   * Map regional summary from database
   */
  private mapRegionalSummary(data: RegionalSummaryRaw): RegionalFinancialSummary {
    return {
      governorateId: data.governorate_id,
      governorateName: {
        ar: data.governorate_name_ar,
        en: data.governorate_name_en,
      },
      providersCount: data.providers_count || 0,
      totalOrders: data.total_orders || 0,
      codOrders: data.cod_orders || 0,
      onlineOrders: data.online_orders || 0,
      grossRevenue: data.gross_revenue || 0,
      totalCommission: data.total_commission || 0,
      netBalance: data.net_balance || 0,
      providersToPay: data.providers_to_pay || 0,
      providersToCollect: data.providers_to_collect || 0,
    };
  }

  /**
   * Map settlement from database
   */
  private mapSettlement(data: SettlementRaw): Settlement {
    return {
      id: data.id,
      providerId: data.provider_id,
      providerName: data.provider
        ? {
            ar: data.provider.name_ar,
            en: data.provider.name_en,
          }
        : undefined,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      totalOrders: data.total_orders || 0,
      grossRevenue: data.gross_revenue || 0,
      platformCommission: data.platform_commission || 0,
      deliveryFeesCollected: data.delivery_fees_collected || 0,
      netAmountDue: data.net_amount_due || 0,
      cod: {
        ordersCount: data.cod_orders_count || 0,
        grossRevenue: data.cod_gross_revenue || 0,
        commissionOwed: data.cod_commission_owed || 0,
      },
      online: {
        ordersCount: data.online_orders_count || 0,
        grossRevenue: data.online_gross_revenue || 0,
        platformCommission: data.online_platform_commission || 0,
        payoutOwed: data.online_payout_owed || 0,
      },
      netBalance: data.net_balance || 0,
      settlementDirection: data.settlement_direction || 'balanced',
      status: data.status || 'pending',
      amountPaid: data.amount_paid || 0,
      paymentDate: data.payment_date,
      paymentMethod: data.payment_method,
      paymentReference: data.payment_reference,
      dueDate: data.due_date,
      isOverdue: data.is_overdue || false,
      overdueDays: data.overdue_days || 0,
      notes: data.notes,
      adminNotes: data.admin_notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      processedBy: data.processed_by,
    };
  }

  /**
   * Get empty admin summary (for error cases)
   */
  private getEmptyAdminSummary(): AdminFinancialSummary {
    return {
      totalProviders: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalDeliveryFees: 0,
      totalTheoreticalCommission: 0,
      totalActualCommission: 0,
      totalGracePeriodDiscount: 0,
      totalRefunds: 0,
      cod: { orders: 0, revenue: 0, commissionOwed: 0 },
      online: { orders: 0, revenue: 0, payoutOwed: 0 },
      totalNetBalance: 0,
      providersToPay: 0,
      providersToCollect: 0,
      providersBalanced: 0,
      eligibleOrders: 0,
      heldOrders: 0,
      settledOrders: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a financial service for admin dashboard
 */
export function createAdminFinancialService(
  supabase: AnySupabaseClient,
  options?: {
    governorateIds?: string[];
    isRegionalAdmin?: boolean;
  }
): FinancialService {
  return new FinancialService({
    supabase,
    governorateIds: options?.governorateIds,
    isRegionalAdmin: options?.isRegionalAdmin,
  });
}

/**
 * Create a financial service for provider dashboard
 */
export function createProviderFinancialService(
  supabase: AnySupabaseClient,
  providerId: string
): FinancialService {
  return new FinancialService({
    supabase,
    providerId,
  });
}
