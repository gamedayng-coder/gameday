import { supabase } from "@/lib/supabase";

export type AuthType = "bearer" | "x-auth-token" | "api-key" | "basic";

export interface DataSource {
  id: string;
  user_id: string;
  name: string;
  base_url: string;
  api_key: string;
  auth_type: AuthType;
  created_at: string;
  updated_at: string;
}

export async function getDataSources(userId: string): Promise<DataSource[]> {
  const { data, error } = await supabase().from("data_sources").select("*").eq("user_id", userId).order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getDataSourceById(id: string, userId: string): Promise<DataSource | undefined> {
  const { data } = await supabase().from("data_sources").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  return data ?? undefined;
}

export async function createDataSource(
  id: string, userId: string, name: string, baseUrl: string, apiKey: string, authType: AuthType
): Promise<DataSource> {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("data_sources")
    .insert({ id, user_id: userId, name, base_url: baseUrl, api_key: apiKey, auth_type: authType, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDataSource(
  id: string, userId: string,
  fields: Partial<Pick<DataSource, "name" | "base_url" | "api_key" | "auth_type">>
): Promise<DataSource | undefined> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.base_url !== undefined) update.base_url = fields.base_url;
  if (fields.api_key !== undefined) update.api_key = fields.api_key;
  if (fields.auth_type !== undefined) update.auth_type = fields.auth_type;
  const { data } = await supabase().from("data_sources").update(update).eq("id", id).eq("user_id", userId).select().maybeSingle();
  return data ?? undefined;
}

export async function deleteDataSource(id: string, userId: string): Promise<void> {
  await supabase().from("data_sources").delete().eq("id", id).eq("user_id", userId);
}
