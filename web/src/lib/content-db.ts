import { supabase } from "@/lib/supabase";

export type ContentStatus = "draft" | "approved" | "scheduled" | "published" | "discarded";

export interface ContentItem {
  id: string;
  user_id: string;
  poster_id: string | null;
  event_id: string | null;
  caption: string;
  platform_captions: string; // JSON: { twitter: string, ... }
  status: ContentStatus;
  scheduled_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  poster_image_path?: string | null;
  event_title?: string | null;
}

const CONTENT_SELECT = `
  *,
  poster:posters!content_items_poster_id_fkey(image_path),
  event:manual_events!content_items_event_id_fkey(title)
`;

function flattenContent(row: Record<string, unknown>): ContentItem {
  const poster = row.poster as { image_path: string | null } | null;
  const event = row.event as { title: string } | null;
  const { poster: _p, event: _e, platform_captions, ...rest } = row;
  return {
    ...(rest as unknown as ContentItem),
    platform_captions: typeof platform_captions === "string" ? platform_captions : JSON.stringify(platform_captions),
    poster_image_path: poster?.image_path ?? null,
    event_title: event?.title ?? null,
  };
}

export async function getContentItems(userId: string, status?: ContentStatus): Promise<ContentItem[]> {
  let query = supabase().from("content_items").select(CONTENT_SELECT).eq("user_id", userId).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => flattenContent(row as unknown as Record<string, unknown>));
}

export async function getContentItemById(id: string, userId: string): Promise<ContentItem | undefined> {
  const { data } = await supabase().from("content_items").select(CONTENT_SELECT).eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return undefined;
  return flattenContent(data as unknown as Record<string, unknown>);
}

export async function createContentItem(
  id: string, userId: string, posterId: string | null, eventId: string | null,
  caption: string, platformCaptions: Record<string, string>
): Promise<ContentItem> {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("content_items")
    .insert({ id, user_id: userId, poster_id: posterId, event_id: eventId, caption, platform_captions: platformCaptions, created_at: now, updated_at: now })
    .select(CONTENT_SELECT)
    .single();
  if (error) throw error;
  return flattenContent(data as unknown as Record<string, unknown>);
}

export async function updateContentItem(
  id: string,
  userId: string,
  fields: Partial<Pick<ContentItem, "caption" | "status" | "scheduled_at"> & { platform_captions: Record<string, string> }>
): Promise<ContentItem | undefined> {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  if (fields.caption !== undefined) update.caption = fields.caption;
  if (fields.platform_captions !== undefined) update.platform_captions = fields.platform_captions;
  if (fields.status !== undefined) {
    update.status = fields.status;
    if (fields.status === "approved") update.approved_at = now;
    if (fields.status === "published") update.published_at = now;
  }
  if (fields.scheduled_at !== undefined) update.scheduled_at = fields.scheduled_at;
  const { data } = await supabase().from("content_items").update(update).eq("id", id).eq("user_id", userId).select(CONTENT_SELECT).maybeSingle();
  if (!data) return undefined;
  return flattenContent(data as unknown as Record<string, unknown>);
}
