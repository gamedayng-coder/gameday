import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any>;

function getSupabaseClient(): DB {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key, { auth: { persistSession: false } });
}

// Singleton — re-used across requests in long-running Node processes.
let _client: DB | null = null;

export function supabase(): DB {
  if (!_client) {
    _client = getSupabaseClient();
  }
  return _client;
}
