import { getDb } from "@/lib/db";

// ---- Per-platform metric shapes ----

export interface TwitterMetrics {
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
}

export interface LinkedInMetrics {
  likes: number;
  comments: number;
  impressions: number;
}

export interface TikTokMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface TelegramMetrics {
  views: number;
}

// ---- Metric update helpers ----

export function updateTwitterMetrics(postId: number, m: TwitterMetrics): void {
  getDb()
    .prepare(
      `UPDATE twitter_posts
       SET likes=?, retweets=?, replies=?, impressions=?, metrics_updated_at=datetime('now')
       WHERE id=?`
    )
    .run(m.likes, m.retweets, m.replies, m.impressions, postId);
}

export function updateLinkedInMetrics(postId: number, m: LinkedInMetrics): void {
  getDb()
    .prepare(
      `UPDATE linkedin_posts
       SET likes=?, comments=?, impressions=?, metrics_updated_at=datetime('now')
       WHERE id=?`
    )
    .run(m.likes, m.comments, m.impressions, postId);
}

export function updateTikTokMetrics(postId: number, m: TikTokMetrics): void {
  getDb()
    .prepare(
      `UPDATE tiktok_posts
       SET views=?, likes=?, comments=?, shares=?, metrics_updated_at=datetime('now')
       WHERE id=?`
    )
    .run(m.views, m.likes, m.comments, m.shares, postId);
}

export function updateTelegramMetrics(postId: number, m: TelegramMetrics): void {
  getDb()
    .prepare(
      `UPDATE telegram_posts
       SET views=?, metrics_updated_at=datetime('now')
       WHERE id=?`
    )
    .run(m.views, postId);
}

// ---- Published post rows (for metric fetching) ----

export interface PublishedTwitterPost {
  id: number;
  tweet_id: string;
  content: string;
  published_at: string | null;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  metrics_updated_at: string | null;
}

export interface PublishedLinkedInPost {
  id: number;
  linkedin_post_id: string;
  content: string;
  published_at: string | null;
  likes: number;
  comments: number;
  impressions: number;
  metrics_updated_at: string | null;
}

export interface PublishedTikTokPost {
  id: number;
  tiktok_publish_id: string;
  content: string;
  published_at: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  metrics_updated_at: string | null;
}

export interface PublishedTelegramPost {
  id: number;
  telegram_message_id: string;
  content: string;
  published_at: string | null;
  views: number;
  metrics_updated_at: string | null;
}

export function getPublishedTwitterPosts(): PublishedTwitterPost[] {
  return getDb()
    .prepare(
      `SELECT id, tweet_id, content, published_at,
              COALESCE(likes,0) as likes, COALESCE(retweets,0) as retweets,
              COALESCE(replies,0) as replies, COALESCE(impressions,0) as impressions,
              metrics_updated_at
       FROM twitter_posts WHERE status='published' AND tweet_id IS NOT NULL
       ORDER BY published_at DESC LIMIT 50`
    )
    .all() as PublishedTwitterPost[];
}

export function getPublishedLinkedInPosts(): PublishedLinkedInPost[] {
  return getDb()
    .prepare(
      `SELECT id, linkedin_post_id, content, published_at,
              COALESCE(likes,0) as likes, COALESCE(comments,0) as comments,
              COALESCE(impressions,0) as impressions, metrics_updated_at
       FROM linkedin_posts WHERE status='published' AND linkedin_post_id IS NOT NULL
       ORDER BY published_at DESC LIMIT 50`
    )
    .all() as PublishedLinkedInPost[];
}

export function getPublishedTikTokPosts(): PublishedTikTokPost[] {
  return getDb()
    .prepare(
      `SELECT id, tiktok_publish_id, content, published_at,
              COALESCE(views,0) as views, COALESCE(likes,0) as likes,
              COALESCE(comments,0) as comments, COALESCE(shares,0) as shares,
              metrics_updated_at
       FROM tiktok_posts WHERE status='published' AND tiktok_publish_id IS NOT NULL
       ORDER BY published_at DESC LIMIT 50`
    )
    .all() as PublishedTikTokPost[];
}

export function getPublishedTelegramPosts(): PublishedTelegramPost[] {
  return getDb()
    .prepare(
      `SELECT id, telegram_message_id, content, published_at,
              COALESCE(views,0) as views, metrics_updated_at
       FROM telegram_posts WHERE status='published' AND telegram_message_id IS NOT NULL
       ORDER BY published_at DESC LIMIT 50`
    )
    .all() as PublishedTelegramPost[];
}

// ---- Aggregate stats ----

export interface PlatformAggregate {
  platform: string;
  total_posts: number;
  published: number;
  pending: number;
  failed: number;
  total_likes: number;
  total_impressions: number;
  total_comments: number;
  total_shares: number;
}

export function getAnalyticsAggregates(): PlatformAggregate[] {
  const db = getDb();

  const twitter = db
    .prepare(
      `SELECT
         'twitter' as platform,
         COUNT(*) as total_posts,
         SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) as published,
         SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
         SUM(COALESCE(likes,0)) as total_likes,
         SUM(COALESCE(impressions,0)) as total_impressions,
         SUM(COALESCE(replies,0)) as total_comments,
         SUM(COALESCE(retweets,0)) as total_shares
       FROM twitter_posts`
    )
    .get() as PlatformAggregate;

  const linkedin = db
    .prepare(
      `SELECT
         'linkedin' as platform,
         COUNT(*) as total_posts,
         SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) as published,
         SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
         SUM(COALESCE(likes,0)) as total_likes,
         SUM(COALESCE(impressions,0)) as total_impressions,
         SUM(COALESCE(comments,0)) as total_comments,
         0 as total_shares
       FROM linkedin_posts`
    )
    .get() as PlatformAggregate;

  const tiktok = db
    .prepare(
      `SELECT
         'tiktok' as platform,
         COUNT(*) as total_posts,
         SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) as published,
         SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
         SUM(COALESCE(likes,0)) as total_likes,
         SUM(COALESCE(views,0)) as total_impressions,
         SUM(COALESCE(comments,0)) as total_comments,
         SUM(COALESCE(shares,0)) as total_shares
       FROM tiktok_posts`
    )
    .get() as PlatformAggregate;

  const telegram = db
    .prepare(
      `SELECT
         'telegram' as platform,
         COUNT(*) as total_posts,
         SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) as published,
         SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
         0 as total_likes,
         SUM(COALESCE(views,0)) as total_impressions,
         0 as total_comments,
         0 as total_shares
       FROM telegram_posts`
    )
    .get() as PlatformAggregate;

  return [twitter, linkedin, tiktok, telegram].filter(
    (r) => r && r.total_posts > 0
  );
}
