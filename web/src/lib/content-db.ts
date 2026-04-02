import { getDb } from "@/lib/db";

export type ContentStatus = "draft" | "approved" | "scheduled" | "published" | "discarded";

export interface ContentItem {
  id: string;
  user_id: string;
  poster_id: string | null;
  event_id: string | null;
  caption: string;
  platform_captions: string; // JSON: { twitter: string, instagram: string, ... }
  status: ContentStatus;
  scheduled_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  poster_image_path?: string | null;
  event_title?: string | null;
}

export function getContentItems(userId: string, status?: ContentStatus): ContentItem[] {
  const where = status ? "WHERE ci.user_id = ? AND ci.status = ?" : "WHERE ci.user_id = ?";
  const params = status ? [userId, status] : [userId];
  return getDb()
    .prepare(`
      SELECT ci.*,
        p.image_path AS poster_image_path,
        me.title AS event_title
      FROM content_items ci
      LEFT JOIN posters p ON p.id = ci.poster_id
      LEFT JOIN manual_events me ON me.id = ci.event_id
      ${where}
      ORDER BY ci.created_at DESC
    `)
    .all(...params) as ContentItem[];
}

export function getContentItemById(id: string, userId: string): ContentItem | undefined {
  return getDb()
    .prepare(`
      SELECT ci.*,
        p.image_path AS poster_image_path,
        me.title AS event_title
      FROM content_items ci
      LEFT JOIN posters p ON p.id = ci.poster_id
      LEFT JOIN manual_events me ON me.id = ci.event_id
      WHERE ci.id = ? AND ci.user_id = ?
    `)
    .get(id, userId) as ContentItem | undefined;
}

export function createContentItem(
  id: string,
  userId: string,
  posterId: string | null,
  eventId: string | null,
  caption: string,
  platformCaptions: Record<string, string>
): ContentItem {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO content_items (id, user_id, poster_id, event_id, caption, platform_captions, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)"
    )
    .run(id, userId, posterId, eventId, caption, JSON.stringify(platformCaptions), now, now);
  return getContentItemById(id, userId)!;
}

export function updateContentItem(
  id: string,
  userId: string,
  fields: Partial<Pick<ContentItem, "caption" | "status" | "scheduled_at"> & { platform_captions: Record<string, string> }>
): ContentItem | undefined {
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [now];
  if (fields.caption !== undefined) { sets.push("caption = ?"); params.push(fields.caption); }
  if (fields.platform_captions !== undefined) { sets.push("platform_captions = ?"); params.push(JSON.stringify(fields.platform_captions)); }
  if (fields.status !== undefined) {
    sets.push("status = ?");
    params.push(fields.status);
    if (fields.status === "approved") { sets.push("approved_at = ?"); params.push(now); }
    if (fields.status === "published") { sets.push("published_at = ?"); params.push(now); }
  }
  if (fields.scheduled_at !== undefined) { sets.push("scheduled_at = ?"); params.push(fields.scheduled_at); }
  params.push(id, userId);
  getDb()
    .prepare(`UPDATE content_items SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
    .run(...params);
  return getContentItemById(id, userId);
}
