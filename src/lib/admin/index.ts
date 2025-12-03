// ═══════════════════════════════════════════════════════════════════════
// وحدة الأدمن - Admin Module
// ═══════════════════════════════════════════════════════════════════════

// Types
export type {
  // Provider types
  AdminProvider,
  ProviderStatus,
  ProviderFilters,
  ProviderApprovalRequest,
  // User types
  AdminUser,
  UserStatus,
  UserRole,
  UserFilters,
  // Order types
  AdminOrder,
  OrderStatus,
  OrderFilters,
  // Statistics types
  DashboardStats,
  StatsFilters,
  TimeSeriesData,
  CategoryStats,
  RegionalStats,
  // Audit types
  AuditAction,
  AuditLogEntry,
  // Common types
  PaginatedResult,
  OperationResult,
  ErrorCode,
} from './types';

// Constants
export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ERROR_CODES,
  PROVIDER_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  USER_ROLE_LABELS,
} from './types';

// Provider functions
export {
  getProviders,
  getProviderById,
  getPendingProviders,
  approveProvider,
  rejectProvider,
  suspendProvider,
  updateProviderCommission,
  toggleProviderFeatured,
  getProviderStats,
} from './providers';

// Statistics functions
export {
  getDashboardStats,
  getOrdersTimeSeries,
  getRevenueTimeSeries,
  getOrdersByCategory,
  getStatsByGovernorate,
  getPendingProvidersCount,
  getTodayOrdersCount,
  getTodayRevenue,
} from './statistics';

// Audit functions
export {
  logAuditAction,
  logDeniedAction,
  logActivity,
  getAuditLog,
  AUDIT_ACTIONS,
} from './audit';
