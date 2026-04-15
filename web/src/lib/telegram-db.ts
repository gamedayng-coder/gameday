import { supabase } from "@/lib/supabase";

export interface TelegramCredential {
  id: number;
  user_id: string;
  bot_token: string;
  chat_id: string;
  bot_username: string | null;
  created_at: string;
  updated_at: string;
}

export type TelegramPostStatus = "pending" | "published" | "failed" | "cancelled";

export interface TelegramPost {
  id: number;
  user_id: string;
  content: string;
  poster_id: string | null;
  scheduled_at: string | null;
  status: TelegramPostStatus;
  telegram_message_id: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export async function getTelegramCredential(userId: string): Promise<TelegramCredential | undefined> {
  const { data } = await supabase()
    .from("telegram_credentials")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? undefined;
}

export async function upsertTelegramCredential(userId: string, botToken: string, chatId: string, botUsername: string | null): Promise<TelegramCredential> {
  await supabase().from("telegram_credentials").delete().eq("user_id", userId);
  const { data, error } = await supabase()
    .from("telegram_credentials")
    .insert({ user_id: userId, bot_token: botToken, chat_id: chatId, bot_username: botUsername })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTelegramCredential(userId: string): Promise<void> {
  await supabase().from("telegram_credentials").delete().eq("user_id", userId);
}

export async function createTelegramPost(userId: string, content: string, posterId: string | null, scheduledAt: Date | null): Promise<TelegramPost> {
  const { data, error } = await supabase()
    .from("telegram_posts")
    .insert({ user_id: userId, content, poster_id: posterId, scheduled_at: scheduledAt ? scheduledAt.toISOString() : null, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTelegramPostById(id: number): Promise<TelegramPost | undefined> {
  const { data } = await supabase().from("telegram_posts").select("*").eq("id", id).maybeSingle();
  return data ?? undefined;
}

export async function getTelegramPosts(userId: string, limit = 50): Promise<TelegramPost[]> {
  const { data, error } = await supabase()
    .from("telegram_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Returns all due posts across all users (for process-queue cron).
export async function getDueTelegramPosts(): Promise<TelegramPost[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("telegram_posts")
    .select("*")
    .eq("status", "pending")
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function markTelegramPostPublished(id: number, messageId: string): Promise<void> {
  const { error } = await supabase()
    .from("telegram_posts")
    .update({ status: "published", telegram_message_id: messageId, published_at: new Date().toISOString(), error: null })
    .eq("id", id);
  if (error) throw error;
}

export async function markTelegramPostFailed(id: number, errorMsg: string): Promise<void> {
  const { error } = await supabase().from("telegram_posts").update({ status: "failed", error: errorMsg }).eq("id", id);
  if (error) throw error;
}

export async function cancelTelegramPost(id: number): Promise<void> {
  await supabase().from("telegram_posts").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
}
