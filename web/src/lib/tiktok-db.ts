import { supabase } from "@/lib/supabase";

export interface TikTokCredential {
  id: number;
  user_id: string;
  tiktok_open_id: string;
  tiktok_display_name: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TikTokPostStatus = "pending" | "published" | "failed" | "cancelled";

export interface TikTokPost {
  id: number;
  user_id: string;
  content: string;
  poster_id: string | null;
  scheduled_at: string | null;
  status: TikTokPostStatus;
  tiktok_publish_id: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export async function getTikTokCredential(userId: string): Promise<TikTokCredential | undefined> {
  const { data } = await supabase()
    .from("tiktok_credentials")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? undefined;
}

export async function upsertTikTokCredential(
  userId: string,
  openId: string, displayName: string, accessToken: string,
  refreshToken: string | null, expiresAt: Date | null
): Promise<TikTokCredential> {
  await supabase().from("tiktok_credentials").delete().eq("user_id", userId);
  const { data, error } = await supabase()
    .from("tiktok_credentials")
    .insert({
      user_id: userId,
      tiktok_open_id: openId, tiktok_display_name: displayName,
      access_token: accessToken, refresh_token: refreshToken,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTikTokTokens(id: number, accessToken: string, refreshToken: string | null, expiresAt: Date | null): Promise<void> {
  const { error } = await supabase()
    .from("tiktok_credentials")
    .update({ access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt ? expiresAt.toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTikTokCredential(userId: string): Promise<void> {
  await supabase().from("tiktok_credentials").delete().eq("user_id", userId);
}

export async function createTikTokPost(userId: string, content: string, posterId: string | null, scheduledAt: Date | null): Promise<TikTokPost> {
  const { data, error } = await supabase()
    .from("tiktok_posts")
    .insert({ user_id: userId, content, poster_id: posterId, scheduled_at: scheduledAt ? scheduledAt.toISOString() : null, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTikTokPostById(id: number): Promise<TikTokPost | undefined> {
  const { data } = await supabase().from("tiktok_posts").select("*").eq("id", id).maybeSingle();
  return data ?? undefined;
}

export async function getTikTokPosts(userId: string, limit = 50): Promise<TikTokPost[]> {
  const { data, error } = await supabase()
    .from("tiktok_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Returns all due posts across all users (for process-queue cron).
export async function getDueTikTokPosts(): Promise<TikTokPost[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("tiktok_posts")
    .select("*")
    .eq("status", "pending")
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function markTikTokPostPublished(id: number, publishId: string): Promise<void> {
  const { error } = await supabase()
    .from("tiktok_posts")
    .update({ status: "published", tiktok_publish_id: publishId, published_at: new Date().toISOString(), error: null })
    .eq("id", id);
  if (error) throw error;
}

export async function markTikTokPostFailed(id: number, errorMsg: string): Promise<void> {
  const { error } = await supabase().from("tiktok_posts").update({ status: "failed", error: errorMsg }).eq("id", id);
  if (error) throw error;
}

export async function cancelTikTokPost(id: number): Promise<void> {
  await supabase().from("tiktok_posts").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
}
