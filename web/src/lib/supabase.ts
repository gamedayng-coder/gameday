import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Singleton — re-used across requests in long-running Node processes.
let _client: ReturnType<typeof createClient> | null = null;

export function supabase() {
  if (!_client) {
    _client = getSupabaseClient();
  }
  return _client;
}
