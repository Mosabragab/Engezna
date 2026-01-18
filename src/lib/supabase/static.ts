import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for static/ISR page data fetching
 *
 * This client is specifically designed for ISR/SSG pages:
 * - Does NOT import 'cookies' or 'headers' from next/headers
 * - Does NOT persist sessions (stateless)
 * - Only use for PUBLIC data that doesn't require authentication
 *
 * For authenticated server operations, use createClient from ./server.ts
 */
export function createStaticClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
