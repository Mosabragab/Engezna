import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for static/ISR page data fetching
 *
 * This client is specifically designed for ISR/SSG pages:
 * - Does NOT import 'cookies' or 'headers' from next/headers
 * - Does NOT persist sessions (stateless)
 * - Only use for PUBLIC data that doesn't require authentication
 *
 * For authenticated server operations, use createClient from ./server.ts
 *
 * Returns null if environment variables are missing (e.g., in test environments)
 */
export function createStaticClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Log warning but don't crash - allows graceful degradation in test environments
    console.warn(
      '[createStaticClient] Supabase environment variables missing - returning null client'
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
