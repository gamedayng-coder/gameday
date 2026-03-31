import { getDb } from "@/lib/db";

export interface LinkedInCredential {
  id: number;
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
  content: string;
  poster_id: string | null;
  scheduled_at: string | null;
  status: LinkedInPostStatus;
  linkedin_post_id: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export function getLinkedInCredential(): LinkedInCredential | undefined {
  return getDb()
    .prepare("SELECT * FROM linkedin_credentials ORDER BY created_at DESC LIMIT 1")
    .get() as LinkedInCredential | undefined;
}

export function upsertLinkedInCredential(
  linkedinUserId: string,
  linkedinName: string,
  accessToken: string,
  expiresAt: Date | null
): LinkedInCredential {
  const db = getDb();
  db.prepare("DELETE FROM linkedin_credentials").run();
  db.prepare(`
    INSERT INTO linkedin_credentials (linkedin_user_id, linkedin_name, access_token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(
    linkedinUserId,
    linkedinName,
    accessToken,
    expiresAt ? expiresAt.toISOString() : null
  );
  return getLinkedInCredential()!;
}

export function deleteLinkedInCredential(): void {
  getDb().prepare("DELETE FROM linkedin_credentials").run();
}

export function createLinkedInPost(
  content: string,
  posterId: string | null,
  scheduledAt: Date | null
): LinkedInPost {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO linkedin_posts (content, poster_id, scheduled_at, status)
    VALUES (?, ?, ?, 'pending')
  `).run(content, posterId, scheduledAt ? scheduledAt.toISOString() : null);
  return getLinkedInPostById(result.lastInsertRowid as number)!;
}

export function getLinkedInPostById(id: number): LinkedInPost | undefined {
  return getDb()
    .prepare("SELECT * FROM linkedin_posts WHERE id = ?")
    .get(id) as LinkedInPost | undefined;
}

export function getLinkedInPosts(limit = 50): LinkedInPost[] {
  return getDb()
    .prepare("SELECT * FROM linkedin_posts ORDER BY created_at DESC LIMIT ?")
    .all(limit) as LinkedInPost[];
}

export function getDueLinkedInPosts(): LinkedInPost[] {
  return getDb()
    .prepare(`
      SELECT * FROM linkedin_posts
      WHERE status = 'pending'
        AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
      ORDER BY scheduled_at ASC
    `)
    .all() as LinkedInPost[];
}

export function markLinkedInPostPublished(id: number, linkedinPostId: string): void {
  getDb().prepare(`
    UPDATE linkedin_posts
    SET status='published', linkedin_post_id=?, published_at=datetime('now'), error=NULL
    WHERE id=?
  `).run(linkedinPostId, id);
}

export function markLinkedInPostFailed(id: number, error: string): void {
  getDb().prepare(`
    UPDATE linkedin_posts
    SET status='failed', error=?
    WHERE id=?
  `).run(error, id);
}

export function cancelLinkedInPost(id: number): void {
  getDb().prepare(`
    UPDATE linkedin_posts SET status='cancelled'
    WHERE id=? AND status='pending'
  `).run(id);
}
