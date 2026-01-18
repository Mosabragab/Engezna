/**
 * Repositories Module
 *
 * Phase 3.2: Repository Pattern Implementation
 *
 * This module provides a Data Access Layer (DAL) that centralizes
 * all database operations. It decouples business logic from direct
 * Supabase calls, improving maintainability and testability.
 *
 * Usage:
 * ```typescript
 * import { ProvidersRepository, OrdersRepository } from '@/lib/repositories';
 *
 * // Get featured providers
 * const { data, error } = await ProvidersRepository.getFeatured(6);
 *
 * // Get customer orders
 * const { data: orders } = await OrdersRepository.getCustomerOrders(customerId);
 * ```
 */

// Base Repository
export {
  BaseRepository,
  createRepository,
  type DatabaseRow,
  type QueryOptions,
  type PaginatedResult,
  type RepositoryResult,
  type RepositoryListResult,
} from './base-repository';

// Providers Repository
export {
  ProvidersRepository,
  ProvidersRepositoryClass,
  type Provider,
  type ProviderInsert,
  type ProviderUpdate,
  type ProviderListOptions,
  type ProviderStatus,
} from './providers-repository';

// Orders Repository
export {
  OrdersRepository,
  OrdersRepositoryClass,
  type Order,
  type OrderItem,
  type OrderAddon,
  type OrderInsert,
  type OrderUpdate,
  type OrderListOptions,
  type OrderStatus,
} from './orders-repository';

// Profiles Repository
export {
  ProfilesRepository,
  ProfilesRepositoryClass,
  type Profile,
  type ProfileInsert,
  type ProfileUpdate,
  type ProfileListOptions,
  type UserRole,
} from './profiles-repository';
