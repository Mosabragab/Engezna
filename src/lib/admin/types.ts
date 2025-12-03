// ═══════════════════════════════════════════════════════════════════════
// أنواع وحدة الأدمن - Admin Module Types
// ═══════════════════════════════════════════════════════════════════════

// حالات مقدم الخدمة
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

// حالات المستخدم
export type UserStatus = 'active' | 'inactive' | 'banned';

// أدوار المستخدم
export type UserRole = 'customer' | 'provider' | 'admin';

// حالات الطلب
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// ═══════════════════════════════════════════════════════════════════════
// مقدم الخدمة - Provider
// ═══════════════════════════════════════════════════════════════════════

export interface AdminProvider {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  status: ProviderStatus;
  rejection_reason: string | null;
  commission_rate: number;
  rating: number;
  total_reviews: number;
  total_orders: number;
  is_featured: boolean;
  is_verified: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  governorate_id: string | null;
  city_id: string | null;
  opening_time: string | null;
  closing_time: string | null;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  created_at: string;
  updated_at: string;
  // Relations
  governorate?: { id: string; name_ar: string; name_en: string };
  city?: { id: string; name_ar: string; name_en: string };
  owner?: { id: string; full_name: string; email: string };
}

// طلب موافقة/رفض مقدم الخدمة
export interface ProviderApprovalRequest {
  providerId: string;
  action: 'approve' | 'reject';
  reason?: string;
  commissionRate?: number;
}

// فلاتر مقدمي الخدمة
export interface ProviderFilters {
  status?: ProviderStatus | ProviderStatus[];
  category?: string;
  governorateId?: string;
  cityId?: string;
  search?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'name_ar' | 'rating' | 'total_orders' | 'commission_rate';
  sortOrder?: 'asc' | 'desc';
}

// ═══════════════════════════════════════════════════════════════════════
// المستخدم - User
// ═══════════════════════════════════════════════════════════════════════

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  governorate_id: string | null;
  city_id: string | null;
  total_orders: number;
  total_spent: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  governorate?: { id: string; name_ar: string; name_en: string };
  city?: { id: string; name_ar: string; name_en: string };
}

// فلاتر المستخدمين
export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  governorateId?: string;
  cityId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'full_name' | 'total_orders' | 'total_spent' | 'last_login_at';
  sortOrder?: 'asc' | 'desc';
}

// ═══════════════════════════════════════════════════════════════════════
// الطلب - Order
// ═══════════════════════════════════════════════════════════════════════

export interface AdminOrder {
  id: string;
  order_number: string;
  customer_id: string;
  provider_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  platform_commission: number;
  payment_method: string;
  payment_status: string;
  delivery_address: string | null;
  notes: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  // Relations
  customer?: { id: string; full_name: string; phone: string };
  provider?: { id: string; name_ar: string; name_en: string };
}

// فلاتر الطلبات
export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  providerId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ═══════════════════════════════════════════════════════════════════════
// الإحصائيات - Statistics
// ═══════════════════════════════════════════════════════════════════════

export interface DashboardStats {
  // مقدمو الخدمة
  providers: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
    newThisMonth: number;
    changePercent: number;
  };
  // المستخدمون
  users: {
    total: number;
    active: number;
    inactive: number;
    customers: number;
    providers: number;
    admins: number;
    newThisMonth: number;
    changePercent: number;
  };
  // الطلبات
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    todayCount: number;
    thisMonthCount: number;
    changePercent: number;
  };
  // المالية
  finance: {
    totalRevenue: number;
    totalCommission: number;
    pendingSettlement: number;
    todayRevenue: number;
    thisMonthRevenue: number;
    changePercent: number;
  };
}

// فلاتر الإحصائيات
export interface StatsFilters {
  dateFrom?: string;
  dateTo?: string;
  governorateId?: string;
  cityId?: string;
}

// إحصائية مع تاريخ
export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

// إحصائيات حسب الفئة
export interface CategoryStats {
  category: string;
  count: number;
  revenue: number;
  percentage: number;
}

// إحصائيات حسب المنطقة
export interface RegionalStats {
  governorateId: string;
  governorateName: string;
  providers: number;
  orders: number;
  revenue: number;
}

// ═══════════════════════════════════════════════════════════════════════
// سجل التدقيق - Audit Log
// ═══════════════════════════════════════════════════════════════════════

export interface AuditAction {
  action: string;
  resourceType: 'provider' | 'user' | 'order' | 'settings';
  resourceId: string;
  resourceName?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  reason?: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Relations
  admin?: { id: string; full_name: string; email: string };
}

// ═══════════════════════════════════════════════════════════════════════
// نتائج مقسمة - Paginated Results
// ═══════════════════════════════════════════════════════════════════════

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// نتائج العمليات - Operation Results
// ═══════════════════════════════════════════════════════════════════════

export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

// أكواد الأخطاء
export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ═══════════════════════════════════════════════════════════════════════
// ثوابت
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, { ar: string; en: string }> = {
  pending_approval: { ar: 'في انتظار الموافقة', en: 'Pending Approval' },
  incomplete: { ar: 'غير مكتمل', en: 'Incomplete' },
  approved: { ar: 'معتمد', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  suspended: { ar: 'موقوف', en: 'Suspended' },
  open: { ar: 'مفتوح', en: 'Open' },
  closed: { ar: 'مغلق', en: 'Closed' },
  temporarily_paused: { ar: 'متوقف مؤقتاً', en: 'Temporarily Paused' },
  on_vacation: { ar: 'في إجازة', en: 'On Vacation' },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, { ar: string; en: string }> = {
  pending: { ar: 'في الانتظار', en: 'Pending' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  preparing: { ar: 'قيد التحضير', en: 'Preparing' },
  ready: { ar: 'جاهز', en: 'Ready' },
  delivering: { ar: 'قيد التوصيل', en: 'Delivering' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  refunded: { ar: 'مسترد', en: 'Refunded' },
};

export const USER_ROLE_LABELS: Record<UserRole, { ar: string; en: string }> = {
  customer: { ar: 'عميل', en: 'Customer' },
  provider: { ar: 'مقدم خدمة', en: 'Provider' },
  admin: { ar: 'مشرف', en: 'Admin' },
};
