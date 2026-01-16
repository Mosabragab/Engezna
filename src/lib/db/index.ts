/**
 * Database Helper Utilities
 *
 * This module provides helper functions for common database operations
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * Execute a raw SQL query (admin only - bypasses RLS)
 * @param query - SQL query string
 * @param params - Query parameters
 */
export async function executeSQL(query: string, params?: any[]) {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query,
      params: params || [],
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('SQL execution error:', error);
    return { data: null, error };
  }
}

/**
 * Run a database migration from a file
 * @param migrationSQL - SQL migration content
 */
export async function runMigration(migrationSQL: string) {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL,
    });

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error };
  }
}

/**
 * Check database connection
 */
export async function checkConnection() {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('_migrations').select('id').limit(1);

    // If table doesn't exist, that's okay - connection is still working
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }

    return { connected: true, error: null };
  } catch (error) {
    console.error('Connection check failed:', error);
    return { connected: false, error };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const supabase = createAdminClient();

  try {
    // Get table counts
    const { data: tables, error } = await supabase.rpc('get_table_stats');

    if (error && !error.message.includes('does not exist')) {
      throw error;
    }

    return { data: tables || [], error: null };
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return { data: [], error };
  }
}

/**
 * Generic query helper with error handling
 */
export async function query<T = any>(
  tableName: string,
  options: {
    select?: string;
    filter?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  } = {}
) {
  const supabase = await createServerClient();

  let queryBuilder = supabase.from(tableName).select(options.select || '*');

  // Apply filters
  if (options.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });
  }

  // Apply ordering
  if (options.orderBy) {
    queryBuilder = queryBuilder.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    });
  }

  // Apply limit
  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error(`Query error on ${tableName}:`, error);
    return { data: null, error };
  }

  return { data: data as T[], error: null };
}
