import { supabase } from "@/lib/supabase";

export interface LinkedInCredential {
  id: number;
  user_id: string;
  linkedin_user_id: string;
  linkedin_name: string;
  access_token: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LinkedInPostStatus = "pending" | "published" | "failed" | "cancelled";

export interface LinkedInPost {
  id: number;
  user_id: string;
  content: string;
  poster_id: string | null;
  scheduled_at: string | null;
  status: LinkedInPostStatus;
  linkedin_post_id: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export async function getLinkedInCredential(userId: string): Promise<LinkedInCredential | undefined> {
  const { data } = await supabase()
    .from("linkedin_credentials")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? undefined;
}

export async function upsertLinkedInCredential(
  userId: string,
  linkedinUserId: string,
  linkedinName: string,
  accessToken: string,
  expiresAt: Date | null
): Promise<LinkedInCredential> {
  await supabase().from("linkedin_credentials").delete().eq("user_id", userId);
  const { data, error } = await supabase()
    .from("linkedin_credentials")
    .insert({ user_id: userId, linkedin_user_id: linkedinUserId, linkedin_name: linkedinName, access_token: accessToken, expires_at: expiresAt ? expiresAt.toISOString() : null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLinkedInCredential(userId: string): Promise<void> {
  await supabase().from("linkedin_credentials").delete().eq("user_id", userId);
}

export async function createLinkedInPost(userId: string, content: string, posterId: string | null, scheduledAt: Date | null): Promise<LinkedInPost> {
  const { data, error } = await supabase()
    .from("linkedin_posts")
    .insert({ user_id: userId, content, poster_id: posterId, scheduled_at: scheduledAt ? scheduledAt.toISOString() : null, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLinkedInPostById(id: number): Promise<LinkedInPost | undefined> {
  const { data } = await supabase().from("linkedin_posts").select("*").eq("id", id).maybeSingle();
  return data ?? undefined;
}

export async function getLinkedInPosts(userId: string, limit = 50): Promise<LinkedInPost[]> {
  const { data, error } = await supabase()
    .from("linkedin_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Returns all due posts across all users (for process-queue cron).
export async function getDueLinkedInPosts(): Promise<LinkedInPost[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("linkedin_posts")
    .select("*")
    .eq("status", "pending")
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function markLinkedInPostPublished(id: number, linkedinPostId: string): Promise<void> {
  const { error } = await supabase()
    .from("linkedin_posts")
    .update({ status: "published", linkedin_post_id: linkedinPostId, published_at: new Date().toISOString(), error: null })
    .eq("id", id);
  if (error) throw error;
}

export async function markLinkedInPostFailed(id: number, errorMsg: string): Promise<void> {
  const { error } = await supabase().from("linkedin_posts").update({ status: "failed", error: errorMsg }).eq("id", id);
  if (error) throw error;
}

export async function cancelLinkedInPost(id: number): Promise<void> {
  await supabase().from("linkedin_posts").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
}
