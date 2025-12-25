/**
 * Financial Types - أنواع البيانات المالية الموحدة
 *
 * These types are shared between Admin and Provider dashboards
 * to ensure consistency in data structures.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Settlement Types
// ═══════════════════════════════════════════════════════════════════════════════

export type SettlementStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'disputed'
  | 'waived';

export type SettlementDirection =
  | 'platform_pays_provider'
  | 'provider_pays_platform'
  | 'balanced';

export type OrderSettlementStatus =
  | 'eligible'    // Ready to be included in next settlement
  | 'on_hold'     // Temporarily excluded (dispute, pending refund)
  | 'settled'     // Already included in a settlement
  | 'excluded';   // Permanently excluded (cancelled, rejected)

export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'bank_transfer';

export type CommissionStatus = 'in_grace_period' | 'active' | 'exempt';

// ═══════════════════════════════════════════════════════════════════════════════
// Financial Engine Output Types (from SQL View)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw data from financial_settlement_engine SQL View
 */
export interface FinancialEngineData {
  // Provider info
  provider_id: string;
  provider_name_ar: string;
  provider_name_en: string;
  governorate_id: string;
  city_id: string | null;
  commission_status: CommissionStatus;
  grace_period_end: string | null;
  commission_rate: number;
  delivery_responsibility: 'merchant_delivery' | 'platform_delivery';

  // Order counts
  total_orders: number;
  cod_orders_count: number;
  online_orders_count: number;
  eligible_orders_count: number;
  held_orders_count: number;
  settled_orders_count: number;

  // Revenue
  gross_revenue: number;
  cod_gross_revenue: number;
  online_gross_revenue: number;

  // Subtotals (without delivery)
  total_subtotal: number;
  cod_subtotal: number;
  online_subtotal: number;

  // Delivery fees
  total_delivery_fees: number;
  cod_delivery_fees: number;
  online_delivery_fees: number;

  // Discounts
  total_discounts: number;

  // Commission (theoretical - ignoring grace period)
  theoretical_commission: number;
  cod_theoretical_commission: number;
  online_theoretical_commission: number;

  // Commission (actual - respects grace period)
  actual_commission: number;
  cod_actual_commission: number;
  online_actual_commission: number;

  // Grace period
  total_grace_period_discount: number;

  // Refunds
  total_refunds: number;
  total_refund_commission_reduction: number;
  refund_percentage: number;

  // Calculated fields
  net_commission: number;
  cod_commission_owed: number;
  online_payout_owed: number;
  net_balance: number;
  settlement_direction: SettlementDirection;

  // Grace period status
  is_in_grace_period: boolean;
  grace_period_days_remaining: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Settlement Summary Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Summary for a single provider (used in provider dashboard)
 */
export interface ProviderFinancialSummary {
  providerId: string;
  providerName: { ar: string; en: string };

  // Order counts
  orders: {
    total: number;
    cod: number;
    online: number;
    eligible: number;
    onHold: number;
    settled: number;
  };

  // Revenue breakdown
  revenue: {
    gross: number;
    cod: number;
    online: number;
  };

  // Commission (what platform earns)
  commission: {
    theoretical: number;  // What would be without grace period
    actual: number;       // What is actually charged
    gracePeriodDiscount: number;
    rate: number;
  };

  // Delivery fees (provider's right)
  deliveryFees: {
    total: number;
    cod: number;
    online: number;
  };

  // Refunds
  refunds: {
    total: number;
    commissionReduction: number;
    percentage: number;
  };

  // Settlement calculations
  settlement: {
    codCommissionOwed: number;     // Provider owes platform
    onlinePayoutOwed: number;      // Platform owes provider
    netBalance: number;            // Positive = platform pays provider
    direction: SettlementDirection;
  };

  // Grace period info
  gracePeriod: {
    isActive: boolean;
    daysRemaining: number;
    endDate: string | null;
  };
}

/**
 * Platform-wide summary for admin dashboard
 */
export interface AdminFinancialSummary {
  // Totals
  totalProviders: number;
  totalOrders: number;
  totalRevenue: number;
  totalDeliveryFees: number;

  // Commission
  totalTheoreticalCommission: number;
  totalActualCommission: number;
  totalGracePeriodDiscount: number;

  // Refunds
  totalRefunds: number;

  // COD breakdown
  cod: {
    orders: number;
    revenue: number;
    commissionOwed: number;
  };

  // Online breakdown
  online: {
    orders: number;
    revenue: number;
    payoutOwed: number;
  };

  // Net balance
  totalNetBalance: number;
  providersToPay: number;      // Count of providers platform pays
  providersToCollect: number;  // Count of providers to collect from
  providersBalanced: number;   // Count of balanced providers

  // Order status
  eligibleOrders: number;
  heldOrders: number;
  settledOrders: number;
}

/**
 * Geographic breakdown for regional admins
 */
export interface RegionalFinancialSummary {
  governorateId: string;
  governorateName: { ar: string; en: string };

  providersCount: number;
  totalOrders: number;
  codOrders: number;
  onlineOrders: number;
  grossRevenue: number;
  totalCommission: number;
  netBalance: number;
  providersToPay: number;
  providersToCollect: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Settlement Record Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full settlement record
 */
export interface Settlement {
  id: string;
  providerId: string;
  providerName?: { ar: string; en: string };

  // Period
  periodStart: string;
  periodEnd: string;

  // Financial breakdown
  totalOrders: number;
  grossRevenue: number;
  platformCommission: number;
  deliveryFeesCollected: number;
  netAmountDue: number;

  // COD/Online breakdown
  cod: {
    ordersCount: number;
    grossRevenue: number;
    commissionOwed: number;
  };
  online: {
    ordersCount: number;
    grossRevenue: number;
    platformCommission: number;
    payoutOwed: number;
  };
  netBalance: number;
  settlementDirection: SettlementDirection;

  // Status
  status: SettlementStatus;
  amountPaid: number;
  paymentDate: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;

  // Due date
  dueDate: string;
  isOverdue: boolean;
  overdueDays: number;

  // Notes
  notes: string | null;
  adminNotes: string | null;

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  processedBy: string | null;
}

/**
 * Settlement creation options
 */
export interface CreateSettlementOptions {
  providerId: string;
  periodStart: string;
  periodEnd: string;
  createdBy?: string;
}

/**
 * Payment record for settlement
 */
export interface SettlementPayment {
  settlementId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  processedBy?: string;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Audit Trail Types
// ═══════════════════════════════════════════════════════════════════════════════

export type AuditAction =
  | 'create'
  | 'update_status'
  | 'record_payment'
  | 'record_partial_payment'
  | 'void_payment'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'add_order'
  | 'remove_order'
  | 'hold_order'
  | 'release_order'
  | 'adjust_commission'
  | 'waive'
  | 'delete';

export interface SettlementAuditLog {
  id: string;
  settlementId: string | null;
  orderId: string | null;
  action: AuditAction;

  // Who
  adminId: string | null;
  adminName: string | null;
  adminRole: string | null;

  // When/Where
  performedAt: string;
  ipAddress: string | null;
  userAgent: string | null;

  // What changed
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;

  // Payment details
  paymentReference: string | null;
  paymentMethod: string | null;
  amount: number | null;

  // Context
  reason: string | null;
  notes: string | null;

  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Filter Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface FinancialDateRange {
  start: string;  // ISO date string
  end: string;    // ISO date string
}

export interface FinancialFilters {
  dateRange?: FinancialDateRange;
  governorateId?: string;
  cityId?: string;
  providerId?: string;
  status?: SettlementStatus[];
  direction?: SettlementDirection[];
  paymentMethod?: PaymentMethod[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export Types
// ═══════════════════════════════════════════════════════════════════════════════

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  dateRange: FinancialDateRange;
  filters?: FinancialFilters;
  includeDetails?: boolean;
  locale: 'ar' | 'en';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Payment Method Breakdown Type
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaymentMethodBreakdown {
  ordersCount: number;
  grossRevenue: number;
  commission: number;
  netAmount: number;
  refundsAmount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Type Guards
// ═══════════════════════════════════════════════════════════════════════════════

export function isSettlementPaid(settlement: Settlement): boolean {
  return settlement.status === 'paid';
}

export function isSettlementOverdue(settlement: Settlement): boolean {
  return settlement.status === 'overdue' || settlement.isOverdue;
}

export function needsPayment(direction: SettlementDirection): boolean {
  return direction !== 'balanced';
}

export function isPlatformPaying(direction: SettlementDirection): boolean {
  return direction === 'platform_pays_provider';
}

export function isProviderPaying(direction: SettlementDirection): boolean {
  return direction === 'provider_pays_platform';
}
