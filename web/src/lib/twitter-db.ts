import { supabase } from "@/lib/supabase";

export interface TwitterCredential {
  id: number;
  user_id: string;
  twitter_user_id: string;
  twitter_username: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TwitterPostStatus = "pending" | "published" | "failed" | "cancelled";

export interface TwitterPost {
  id: number;
  user_id: string;
  content: string;
  poster_id: string | null;
  scheduled_at: string | null;
  status: TwitterPostStatus;
  tweet_id: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export async function getTwitterCredential(userId: string): Promise<TwitterCredential | undefined> {
  const { data } = await supabase()
    .from("twitter_credentials")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? undefined;
}

export async function upsertTwitterCredential(
  userId: string,
  twitterUserId: string,
  twitterUsername: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): Promise<TwitterCredential> {
  // Delete existing credential for this user before inserting fresh one
  await supabase().from("twitter_credentials").delete().eq("user_id", userId);
  const { data, error } = await supabase()
    .from("twitter_credentials")
    .insert({
      user_id: userId,
      twitter_user_id: twitterUserId,
      twitter_username: twitterUsername,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTwitterTokens(
  id: number,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): Promise<void> {
  const { error } = await supabase()
    .from("twitter_credentials")
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTwitterCredential(userId: string): Promise<void> {
  await supabase().from("twitter_credentials").delete().eq("user_id", userId);
}

export async function createTwitterPost(
  userId: string,
  content: string,
  posterId: string | null,
  scheduledAt: Date | null
): Promise<TwitterPost> {
  const { data, error } = await supabase()
    .from("twitter_posts")
    .insert({ user_id: userId, content, poster_id: posterId, scheduled_at: scheduledAt ? scheduledAt.toISOString() : null, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTwitterPostById(id: number): Promise<TwitterPost | undefined> {
  const { data } = await supabase().from("twitter_posts").select("*").eq("id", id).maybeSingle();
  return data ?? undefined;
}

export async function getTwitterPosts(userId: string, limit = 50): Promise<TwitterPost[]> {
  const { data, error } = await supabase()
    .from("twitter_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Returns all due posts across all users (for process-queue cron).
// Posts include user_id so the caller can fetch per-user credentials.
export async function getDueTwitterPosts(): Promise<TwitterPost[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("twitter_posts")
    .select("*")
    .eq("status", "pending")
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function markTwitterPostPublished(id: number, tweetId: string): Promise<void> {
  const { error } = await supabase()
    .from("twitter_posts")
    .update({ status: "published", tweet_id: tweetId, published_at: new Date().toISOString(), error: null })
    .eq("id", id);
  if (error) throw error;
}

export async function markTwitterPostFailed(id: number, errorMsg: string): Promise<void> {
  const { error } = await supabase().from("twitter_posts").update({ status: "failed", error: errorMsg }).eq("id", id);
  if (error) throw error;
}

export async function cancelTwitterPost(id: number): Promise<void> {
  await supabase().from("twitter_posts").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
}
