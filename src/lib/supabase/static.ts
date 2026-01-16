import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for static/public data fetching
 * This client does NOT use cookies and can be used for static generation
 * Only use this for PUBLIC data that doesn't require authentication
 */
export function createStaticClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
