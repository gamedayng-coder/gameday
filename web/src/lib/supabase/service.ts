import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS for server-side operations.
 * Only use in API routes and server actions, never in client components.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Supabase service role env vars not set');
  return createClient(url, key, { auth: { persistSession: false } });
}
