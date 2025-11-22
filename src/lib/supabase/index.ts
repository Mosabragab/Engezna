/**
 * Supabase Client Exports
 *
 * Usage:
 * - Browser/Client Components: import { createClient } from '@/lib/supabase/client'
 * - Server Components/Actions: import { createClient } from '@/lib/supabase/server'
 * - Middleware: import { updateSession } from '@/lib/supabase/middleware'
 * - Admin Operations: import { createAdminClient } from '@/lib/supabase/admin'
 */

export { createClient as createBrowserClient } from './client'
export { createClient as createServerClient } from './server'
export { updateSession } from './middleware'
export { createAdminClient } from './admin'
