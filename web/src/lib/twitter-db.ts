import { getDb } from "@/lib/db";

export interface TwitterCredential {
  id: number;
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
  content: string;
  poster_id: string | null;
  scheduled_at: string | null;
  status: TwitterPostStatus;
  tweet_id: string | null;
  error: string | null;
  published_at: string | null;
  created_at: string;
}

export function getTwitterCredential(): TwitterCredential | undefined {
  return getDb()
    .prepare("SELECT * FROM twitter_credentials ORDER BY created_at DESC LIMIT 1")
    .get() as TwitterCredential | undefined;
}

export function upsertTwitterCredential(
  twitterUserId: string,
  twitterUsername: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): TwitterCredential {
  const db = getDb();
  db.prepare("DELETE FROM twitter_credentials").run();
  db.prepare(`
    INSERT INTO twitter_credentials (twitter_user_id, twitter_username, access_token, refresh_token, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    twitterUserId,
    twitterUsername,
    accessToken,
    refreshToken,
    expiresAt ? expiresAt.toISOString() : null
  );
  return getTwitterCredential()!;
}

export function updateTwitterTokens(
  id: number,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): void {
  getDb().prepare(`
    UPDATE twitter_credentials
    SET access_token=?, refresh_token=?, expires_at=?, updated_at=datetime('now')
    WHERE id=?
  `).run(accessToken, refreshToken, expiresAt ? expiresAt.toISOString() : null, id);
}

export function deleteTwitterCredential(): void {
  getDb().prepare("DELETE FROM twitter_credentials").run();
}

export function createTwitterPost(
  content: string,
  posterId: string | null,
  scheduledAt: Date | null
): TwitterPost {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO twitter_posts (content, poster_id, scheduled_at, status)
    VALUES (?, ?, ?, 'pending')
  `).run(content, posterId, scheduledAt ? scheduledAt.toISOString() : null);
  return getTwitterPostById(result.lastInsertRowid as number)!;
}

export function getTwitterPostById(id: number): TwitterPost | undefined {
  return getDb()
    .prepare("SELECT * FROM twitter_posts WHERE id = ?")
    .get(id) as TwitterPost | undefined;
}

export function getTwitterPosts(limit = 50): TwitterPost[] {
  return getDb()
    .prepare("SELECT * FROM twitter_posts ORDER BY created_at DESC LIMIT ?")
    .all(limit) as TwitterPost[];
}

export function getDueTwitterPosts(): TwitterPost[] {
  return getDb()
    .prepare(`
      SELECT * FROM twitter_posts
      WHERE status = 'pending'
        AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
      ORDER BY scheduled_at ASC
    `)
    .all() as TwitterPost[];
}

export function markTwitterPostPublished(id: number, tweetId: string): void {
  getDb().prepare(`
    UPDATE twitter_posts
    SET status='published', tweet_id=?, published_at=datetime('now'), error=NULL
    WHERE id=?
  `).run(tweetId, id);
}

export function markTwitterPostFailed(id: number, error: string): void {
  getDb().prepare(`
    UPDATE twitter_posts
    SET status='failed', error=?
    WHERE id=?
  `).run(error, id);
}

export function cancelTwitterPost(id: number): void {
  getDb().prepare(`
    UPDATE twitter_posts SET status='cancelled'
    WHERE id=? AND status='pending'
  `).run(id);
}
