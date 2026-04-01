import { getDb } from "@/lib/db";

export interface TikTokCredential {
  id: number;
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
  content: string;
  poster_id: string | null;
  scheduled_at: string | null;
  status: TikTokPostStatus;
  tiktok_publish_id: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export function getTikTokCredential(): TikTokCredential | undefined {
  return getDb()
    .prepare("SELECT * FROM tiktok_credentials ORDER BY created_at DESC LIMIT 1")
    .get() as TikTokCredential | undefined;
}

export function upsertTikTokCredential(
  openId: string,
  displayName: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): TikTokCredential {
  const db = getDb();
  db.prepare("DELETE FROM tiktok_credentials").run();
  db.prepare(`
    INSERT INTO tiktok_credentials (tiktok_open_id, tiktok_display_name, access_token, refresh_token, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    openId,
    displayName,
    accessToken,
    refreshToken,
    expiresAt ? expiresAt.toISOString() : null
  );
  return getTikTokCredential()!;
}

export function updateTikTokTokens(
  id: number,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): void {
  getDb().prepare(`
    UPDATE tiktok_credentials
    SET access_token=?, refresh_token=?, expires_at=?, updated_at=datetime('now')
    WHERE id=?
  `).run(accessToken, refreshToken, expiresAt ? expiresAt.toISOString() : null, id);
}

export function deleteTikTokCredential(): void {
  getDb().prepare("DELETE FROM tiktok_credentials").run();
}

export function createTikTokPost(
  content: string,
  posterId: string | null,
  scheduledAt: Date | null
): TikTokPost {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO tiktok_posts (content, poster_id, scheduled_at, status)
    VALUES (?, ?, ?, 'pending')
  `).run(content, posterId, scheduledAt ? scheduledAt.toISOString() : null);
  return getTikTokPostById(result.lastInsertRowid as number)!;
}

export function getTikTokPostById(id: number): TikTokPost | undefined {
  return getDb()
    .prepare("SELECT * FROM tiktok_posts WHERE id = ?")
    .get(id) as TikTokPost | undefined;
}

export function getTikTokPosts(limit = 50): TikTokPost[] {
  return getDb()
    .prepare("SELECT * FROM tiktok_posts ORDER BY created_at DESC LIMIT ?")
    .all(limit) as TikTokPost[];
}

export function getDueTikTokPosts(): TikTokPost[] {
  return getDb()
    .prepare(`
      SELECT * FROM tiktok_posts
      WHERE status = 'pending'
        AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
      ORDER BY scheduled_at ASC
    `)
    .all() as TikTokPost[];
}

export function markTikTokPostPublished(id: number, publishId: string): void {
  getDb().prepare(`
    UPDATE tiktok_posts
    SET status='published', tiktok_publish_id=?, published_at=datetime('now'), error=NULL
    WHERE id=?
  `).run(publishId, id);
}

export function markTikTokPostFailed(id: number, error: string): void {
  getDb().prepare(`
    UPDATE tiktok_posts
    SET status='failed', error=?
    WHERE id=?
  `).run(error, id);
}

export function cancelTikTokPost(id: number): void {
  getDb().prepare(`
    UPDATE tiktok_posts SET status='cancelled'
    WHERE id=? AND status='pending'
  `).run(id);
}
