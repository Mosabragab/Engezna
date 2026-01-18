/**
 * Orders Repository
 *
 * Phase 3.2: Repository Pattern Implementation
 *
 * Centralizes all order-related database operations.
 * Replaces direct Supabase calls in hooks and services.
 */

import {
  BaseRepository,
  RepositoryResult,
  RepositoryListResult,
  PaginatedResult,
} from './base-repository';

// Order status types
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// Order entity type
export interface Order {
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
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  notes: string | null;
  cancelled_reason: string | null;
  cancelled_by: string | null;
  promo_code_id: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  delivering_at: string | null;
  delivered_at: string | null;
  // Relations (when joined)
  customer?: { id: string; full_name: string; phone: string; email: string };
  provider?: { id: string; name_ar: string; name_en: string; phone: string };
  items?: OrderItem[];
}

// Order item entity
export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  addons: OrderAddon[] | null;
  menu_item?: {
    id: string;
    name_ar: string;
    name_en: string;
    image_url: string | null;
  };
}

// Order addon
export interface OrderAddon {
  addon_id: string;
  name_ar: string;
  name_en: string;
  price: number;
  quantity: number;
}

// Order insert type
export type OrderInsert = Omit<
  Order,
  'id' | 'order_number' | 'created_at' | 'updated_at' | 'customer' | 'provider' | 'items'
>;

// Order update type
export type OrderUpdate = Partial<
  Omit<Order, 'id' | 'order_number' | 'created_at' | 'customer' | 'provider' | 'items'>
>;

// Order listing options
export interface OrderListOptions {
  status?: OrderStatus | OrderStatus[];
  providerId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentStatus?: string;
  search?: string;
  sort?: 'created_at' | 'total' | 'status' | 'order_number';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Optimized order selects (Phase 4.1)

// Core order fields (includes all for type safety)
const ORDER_LIST_SELECT = `
  id, order_number, customer_id, provider_id, status,
  subtotal, delivery_fee, discount, total, platform_commission,
  payment_method, payment_status, delivery_address,
  delivery_latitude, delivery_longitude, notes,
  promo_code_id, created_at, updated_at,
  confirmed_at, preparing_at, ready_at, delivering_at, delivered_at,
  cancelled_reason, cancelled_by
`;

// Order with basic relations (for list views - includes all fields for type safety)
const ORDER_WITH_RELATIONS = `
  id, order_number, customer_id, provider_id, status,
  subtotal, delivery_fee, discount, total, platform_commission,
  payment_method, payment_status, delivery_address,
  delivery_latitude, delivery_longitude, notes,
  promo_code_id, created_at, updated_at,
  confirmed_at, preparing_at, ready_at, delivering_at, delivered_at,
  cancelled_reason, cancelled_by,
  customer:profiles!customer_id(id, full_name, phone, email),
  provider:providers!provider_id(id, name_ar, name_en, phone)
`;

// Order with items for detail views (includes all fields for type safety)
const ORDER_WITH_ITEMS = `
  id, order_number, customer_id, provider_id, status,
  subtotal, delivery_fee, discount, total, platform_commission,
  payment_method, payment_status, delivery_address,
  delivery_latitude, delivery_longitude, notes,
  promo_code_id, created_at, updated_at,
  confirmed_at, preparing_at, ready_at, delivering_at, delivered_at,
  cancelled_reason, cancelled_by,
  customer:profiles!customer_id(id, full_name, phone, email),
  provider:providers!provider_id(id, name_ar, name_en, phone, logo_url),
  items:order_items(
    id,
    menu_item_id,
    variant_id,
    quantity,
    unit_price,
    total_price,
    notes,
    addons,
    menu_item:menu_items(id, name_ar, name_en, image_url)
  )
`;

// Minimal select for statistics
const ORDER_STATS_SELECT = 'id, status, total, platform_commission, created_at';

/**
 * Orders Repository
 *
 * Provides centralized access to order data with common operations
 * optimized for the Engezna platform.
 */
class OrdersRepositoryClass extends BaseRepository<Order, OrderInsert, OrderUpdate> {
  constructor() {
    // Use list select as default (Phase 4.1)
    super('orders', ORDER_LIST_SELECT);
  }

  /**
   * Find an order by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<RepositoryResult<Order>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(ORDER_WITH_RELATIONS)
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as Order, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Find an order by ID with items and relations
   */
  async findByIdWithItems(id: string): Promise<RepositoryResult<Order>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(ORDER_WITH_ITEMS)
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as Order, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<RepositoryResult<Order>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(ORDER_WITH_ITEMS)
        .eq('order_number', orderNumber)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as Order, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * List orders with filtering and sorting
   */
  async listOrders(options: OrderListOptions = {}): Promise<RepositoryListResult<Order>> {
    try {
      const {
        status,
        providerId,
        customerId,
        dateFrom,
        dateTo,
        paymentStatus,
        search,
        sort = 'created_at',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = options;

      let query = this.supabase
        .from(this.tableName)
        .select(ORDER_WITH_RELATIONS, { count: 'exact' });

      // Status filter
      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      // Provider filter
      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      // Customer filter
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      // Date range filter
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      // Payment status filter
      if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
      }

      // Search by order number
      if (search?.trim()) {
        query = query.ilike('order_number', `%${search}%`);
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
        data: (data as unknown as Order[]) ?? [],
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
   * List orders with pagination (for admin views)
   */
  async listOrdersPaginated(
    options: OrderListOptions & { page?: number; pageSize?: number }
  ): Promise<RepositoryResult<PaginatedResult<Order>>> {
    const { page = 1, pageSize = 20, ...listOptions } = options;
    const offset = (page - 1) * pageSize;

    const result = await this.listOrders({
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
   * Get orders for a provider
   */
  async getProviderOrders(
    providerId: string,
    options?: Omit<OrderListOptions, 'providerId'>
  ): Promise<RepositoryListResult<Order>> {
    return this.listOrders({
      ...options,
      providerId,
    });
  }

  /**
   * Get pending orders for a provider
   */
  async getProviderPendingOrders(providerId: string): Promise<RepositoryListResult<Order>> {
    return this.listOrders({
      providerId,
      status: 'pending',
      sort: 'created_at',
      sortOrder: 'asc',
    });
  }

  /**
   * Get active orders for a provider (not delivered/cancelled)
   */
  async getProviderActiveOrders(providerId: string): Promise<RepositoryListResult<Order>> {
    return this.listOrders({
      providerId,
      status: ['pending', 'confirmed', 'preparing', 'ready', 'delivering'],
      sort: 'created_at',
      sortOrder: 'asc',
    });
  }

  /**
   * Get orders for a customer
   */
  async getCustomerOrders(
    customerId: string,
    options?: Omit<OrderListOptions, 'customerId'>
  ): Promise<RepositoryListResult<Order>> {
    return this.listOrders({
      ...options,
      customerId,
    });
  }

  /**
   * Get recent orders for a customer
   */
  async getCustomerRecentOrders(
    customerId: string,
    limit = 10
  ): Promise<RepositoryListResult<Order>> {
    return this.listOrders({
      customerId,
      sort: 'created_at',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * Update order status
   */
  async updateStatus(
    id: string,
    status: OrderStatus,
    additionalData?: Partial<OrderUpdate>
  ): Promise<RepositoryResult<Order>> {
    const updateData: OrderUpdate = {
      status,
      ...additionalData,
    };

    // Set timestamp fields based on status
    const now = new Date().toISOString();
    switch (status) {
      case 'confirmed':
        updateData.confirmed_at = now;
        break;
      case 'preparing':
        updateData.preparing_at = now;
        break;
      case 'ready':
        updateData.ready_at = now;
        break;
      case 'delivering':
        updateData.delivering_at = now;
        break;
      case 'delivered':
        updateData.delivered_at = now;
        break;
    }

    return this.update(id, updateData);
  }

  /**
   * Cancel an order
   */
  async cancel(id: string, reason: string, cancelledBy: string): Promise<RepositoryResult<Order>> {
    return this.update(id, {
      status: 'cancelled',
      cancelled_reason: reason,
      cancelled_by: cancelledBy,
    });
  }

  /**
   * Mark order as refunded
   */
  async markRefunded(id: string): Promise<RepositoryResult<Order>> {
    return this.updateStatus(id, 'refunded');
  }

  /**
   * Count pending orders for a provider
   */
  async countProviderPending(providerId: string): Promise<RepositoryResult<number>> {
    return this.count([
      { column: 'provider_id', operator: 'eq', value: providerId },
      { column: 'status', operator: 'eq', value: 'pending' },
    ]);
  }

  /**
   * Count orders by status
   */
  async countByStatus(status: OrderStatus | OrderStatus[]): Promise<RepositoryResult<number>> {
    if (Array.isArray(status)) {
      return this.count([{ column: 'status', operator: 'in', value: status }]);
    }
    return this.count([{ column: 'status', operator: 'eq', value: status }]);
  }

  /**
   * Get order statistics for a date range
   */
  async getStatistics(
    dateFrom?: string,
    dateTo?: string
  ): Promise<
    RepositoryResult<{
      total: number;
      pending: number;
      completed: number;
      cancelled: number;
      totalRevenue: number;
      totalCommission: number;
    }>
  > {
    try {
      // Use minimal select for statistics (Phase 4.1)
      let query = this.supabase.from(this.tableName).select(ORDER_STATS_SELECT);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const stats = {
        total: data?.length ?? 0,
        pending: data?.filter((o) => o.status === 'pending').length ?? 0,
        completed: data?.filter((o) => o.status === 'delivered').length ?? 0,
        cancelled: data?.filter((o) => ['cancelled', 'refunded'].includes(o.status)).length ?? 0,
        totalRevenue:
          data
            ?.filter((o) => o.status === 'delivered')
            .reduce((sum, o) => sum + (o.total ?? 0), 0) ?? 0,
        totalCommission:
          data
            ?.filter((o) => o.status === 'delivered')
            .reduce((sum, o) => sum + (o.platform_commission ?? 0), 0) ?? 0,
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
   * Get provider statistics
   */
  async getProviderStatistics(
    providerId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<
    RepositoryResult<{
      totalOrders: number;
      pendingOrders: number;
      completedOrders: number;
      cancelledOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
    }>
  > {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('status, total')
        .eq('provider_id', providerId);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const completedOrders = data?.filter((o) => o.status === 'delivered') ?? [];
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);

      const stats = {
        totalOrders: data?.length ?? 0,
        pendingOrders: data?.filter((o) => o.status === 'pending').length ?? 0,
        completedOrders: completedOrders.length,
        cancelledOrders:
          data?.filter((o) => ['cancelled', 'refunded'].includes(o.status)).length ?? 0,
        totalRevenue,
        avgOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
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
export const OrdersRepository = new OrdersRepositoryClass();

// Export class for testing
export { OrdersRepositoryClass };
