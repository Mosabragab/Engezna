/**
 * Base Repository - Data Access Layer Foundation
 *
 * Phase 3.2: Repository Pattern Implementation
 *
 * Provides a standardized interface for database operations, decoupling
 * business logic from direct Supabase calls. All repositories extend
 * this base class to inherit common CRUD operations.
 *
 * Features:
 * - Type-safe CRUD operations
 * - Fluent query builder interface
 * - Consistent error handling
 * - Support for pagination and filtering
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

// Generic query builder type (avoids importing internal Postgrest types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

// Generic database row type - allows any object with string keys
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type DatabaseRow = {};

// Query options for list operations
export interface QueryOptions<T extends DatabaseRow> {
  select?: string;
  filters?: Array<{
    column: keyof T | string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
    value: unknown;
  }>;
  orderBy?: {
    column: keyof T | string;
    ascending?: boolean;
  };
  limit?: number;
  offset?: number;
  single?: boolean;
}

// Pagination result
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Repository result type
export type RepositoryResult<T> = { data: T; error: null } | { data: null; error: Error };

// Repository list result type
export type RepositoryListResult<T> =
  | { data: T[]; error: null; count?: number }
  | { data: null; error: Error; count?: number };

/**
 * Base Repository Class
 *
 * Provides common database operations that can be inherited by
 * entity-specific repositories.
 *
 * @template T - The entity type this repository manages
 * @template InsertT - The type for insert operations (may differ from T)
 * @template UpdateT - The type for update operations (may differ from T)
 */
export abstract class BaseRepository<
  T extends DatabaseRow,
  InsertT extends DatabaseRow = Partial<T>,
  UpdateT extends DatabaseRow = Partial<T>,
> {
  protected supabase: SupabaseClient;
  protected tableName: string;
  protected defaultSelect: string;

  constructor(tableName: string, defaultSelect: string = '*') {
    this.supabase = createClient();
    this.tableName = tableName;
    this.defaultSelect = defaultSelect;
  }

  /**
   * Get the Supabase client instance
   * Useful for complex queries that need direct access
   */
  protected getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string, select?: string): Promise<RepositoryResult<T>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(select ?? this.defaultSelect)
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as T, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Find records matching a column value
   */
  async findBy(
    column: keyof T | string,
    value: unknown,
    options?: Omit<QueryOptions<T>, 'filters'>
  ): Promise<RepositoryListResult<T>> {
    return this.findAll({
      ...options,
      filters: [{ column, operator: 'eq', value }],
    });
  }

  /**
   * Find all records with optional filtering
   */
  async findAll(options?: QueryOptions<T>): Promise<RepositoryListResult<T>> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(options?.select ?? this.defaultSelect, { count: 'exact' });

      // Apply filters
      if (options?.filters) {
        query = this.applyFilters(query, options.filters);
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column as string, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      // Apply pagination
      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }

      if (options?.offset !== undefined) {
        query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1);
      }

      // Single record
      if (options?.single) {
        const { data, error } = await query.single();
        if (error) {
          return { data: null, error: new Error(error.message) };
        }
        return { data: [data as unknown as T], error: null, count: 1 };
      }

      const { data, error, count } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return {
        data: (data as unknown as T[]) ?? [],
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
   * Find records with pagination
   */
  async findPaginated(
    page: number,
    pageSize: number,
    options?: Omit<QueryOptions<T>, 'limit' | 'offset'>
  ): Promise<RepositoryResult<PaginatedResult<T>>> {
    const offset = (page - 1) * pageSize;

    const result = await this.findAll({
      ...options,
      limit: pageSize,
      offset,
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    const totalCount = result.count ?? result.data.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: {
        data: result.data,
        count: totalCount,
        page,
        pageSize,
        totalPages,
      },
      error: null,
    };
  }

  /**
   * Create a new record
   */
  async create(data: InsertT): Promise<RepositoryResult<T>> {
    try {
      const { data: created, error } = await this.supabase
        .from(this.tableName)
        .insert(data as DatabaseRow)
        .select(this.defaultSelect)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: created as unknown as T, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Create multiple records
   */
  async createMany(items: InsertT[]): Promise<RepositoryListResult<T>> {
    try {
      const { data: created, error } = await this.supabase
        .from(this.tableName)
        .insert(items as DatabaseRow[])
        .select(this.defaultSelect);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: (created as unknown as T[]) ?? [], error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: UpdateT): Promise<RepositoryResult<T>> {
    try {
      const { data: updated, error } = await this.supabase
        .from(this.tableName)
        .update(data as DatabaseRow)
        .eq('id', id)
        .select(this.defaultSelect)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: updated as unknown as T, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Update records matching a condition
   */
  async updateWhere(
    column: keyof T | string,
    value: unknown,
    data: UpdateT
  ): Promise<RepositoryListResult<T>> {
    try {
      const { data: updated, error } = await this.supabase
        .from(this.tableName)
        .update(data as DatabaseRow)
        .eq(column as string, value)
        .select(this.defaultSelect);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: (updated as unknown as T[]) ?? [], error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Upsert a record (insert or update)
   */
  async upsert(data: InsertT, options?: { onConflict?: string }): Promise<RepositoryResult<T>> {
    try {
      const { data: upserted, error } = await this.supabase
        .from(this.tableName)
        .upsert(data as DatabaseRow, { onConflict: options?.onConflict })
        .select(this.defaultSelect)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: upserted as unknown as T, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Delete records matching a condition
   */
  async deleteWhere(column: keyof T | string, value: unknown): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq(column as string, value);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Count records matching optional filters
   */
  async count(filters?: QueryOptions<T>['filters']): Promise<RepositoryResult<number>> {
    try {
      let query = this.supabase.from(this.tableName).select('*', { count: 'exact', head: true });

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { count, error } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: count ?? 0, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<RepositoryResult<boolean>> {
    try {
      const { count, error } = await this.supabase
        .from(this.tableName)
        .select('id', { count: 'exact', head: true })
        .eq('id', id);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: (count ?? 0) > 0, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  }

  /**
   * Apply filters to a query
   */
  protected applyFilters(
    query: QueryBuilder,
    filters: NonNullable<QueryOptions<T>['filters']>
  ): QueryBuilder {
    let result = query;

    for (const filter of filters) {
      const column = filter.column as string;

      switch (filter.operator) {
        case 'eq':
          result = result.eq(column, filter.value);
          break;
        case 'neq':
          result = result.neq(column, filter.value);
          break;
        case 'gt':
          result = result.gt(column, filter.value);
          break;
        case 'gte':
          result = result.gte(column, filter.value);
          break;
        case 'lt':
          result = result.lt(column, filter.value);
          break;
        case 'lte':
          result = result.lte(column, filter.value);
          break;
        case 'like':
          result = result.like(column, filter.value as string);
          break;
        case 'ilike':
          result = result.ilike(column, filter.value as string);
          break;
        case 'in':
          result = result.in(column, filter.value as unknown[]);
          break;
        case 'is':
          result = result.is(column, filter.value as null | boolean);
          break;
      }
    }

    return result;
  }
}

/**
 * Create a simple repository instance for a table
 * Useful for tables that don't need custom methods
 */
export function createRepository<T extends DatabaseRow>(
  tableName: string,
  defaultSelect: string = '*'
): BaseRepository<T> {
  return new (class extends BaseRepository<T> {
    constructor() {
      super(tableName, defaultSelect);
    }
  })();
}
