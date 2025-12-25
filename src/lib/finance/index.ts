/**
 * Finance Module - الوحدة المالية
 *
 * Unified financial utilities for the Engezna platform.
 * Used by both Admin and Provider dashboards.
 */

// Money class for precise financial calculations
export {
  Money,
  sumMoney,
  calculateCommission,
  calculateRefundCommissionReduction,
  calculateNetBalance,
  getSettlementDirection,
  toMoney,
  type SettlementDirection,
  type MoneyInput,
} from './money';

// Financial Service for data operations
export {
  FinancialService,
  createAdminFinancialService,
  createProviderFinancialService,
} from './financial-service';

// Export Service for PDF/CSV reports
export {
  generateSettlementHTML,
  exportSettlementToPDF,
  downloadSettlementAsHTML,
  exportSettlementsToCSV,
  type ExportOptions,
  type SettlementExportData,
} from './export-service';

// Re-export types from finance types
// Note: ExportOptions is exported from export-service.ts, so we use ExportOptions as FinanceExportOptions here
export type {
  SettlementStatus,
  OrderSettlementStatus,
  PaymentMethod,
  CommissionStatus,
  FinancialEngineData,
  ProviderFinancialSummary,
  AdminFinancialSummary,
  RegionalFinancialSummary,
  Settlement,
  SettlementPayment,
  SettlementAuditLog,
  CreateSettlementOptions,
  AuditAction,
  FinancialFilters,
  FinancialDateRange,
  ExportFormat,
  ExportOptions as FinanceExportOptions,
  PaymentMethodBreakdown,
} from '@/types/finance';

// Re-export type guards
export {
  isSettlementPaid,
  isSettlementOverdue,
  needsPayment,
  isPlatformPaying,
  isProviderPaying,
} from '@/types/finance';
