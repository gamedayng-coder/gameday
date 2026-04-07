import { supabase } from "@/lib/supabase";

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

export async function updateTwitterMetrics(postId: number, m: TwitterMetrics): Promise<void> {
  const { error } = await supabase()
    .from("twitter_posts")
    .update({ likes: m.likes, retweets: m.retweets, replies: m.replies, impressions: m.impressions, metrics_updated_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw error;
}

export async function updateLinkedInMetrics(postId: number, m: LinkedInMetrics): Promise<void> {
  const { error } = await supabase()
    .from("linkedin_posts")
    .update({ likes: m.likes, comments: m.comments, impressions: m.impressions, metrics_updated_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw error;
}

export async function updateTikTokMetrics(postId: number, m: TikTokMetrics): Promise<void> {
  const { error } = await supabase()
    .from("tiktok_posts")
    .update({ views: m.views, likes: m.likes, comments: m.comments, shares: m.shares, metrics_updated_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw error;
}

export async function updateTelegramMetrics(postId: number, m: TelegramMetrics): Promise<void> {
  const { error } = await supabase()
    .from("telegram_posts")
    .update({ views: m.views, metrics_updated_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw error;
}

// ---- Published post rows (for metric fetching) ----

export interface PublishedTwitterPost {
  id: number; tweet_id: string; content: string; published_at: string | null;
  likes: number; retweets: number; replies: number; impressions: number; metrics_updated_at: string | null;
}

export interface PublishedLinkedInPost {
  id: number; linkedin_post_id: string; content: string; published_at: string | null;
  likes: number; comments: number; impressions: number; metrics_updated_at: string | null;
}

export interface PublishedTikTokPost {
  id: number; tiktok_publish_id: string; content: string; published_at: string | null;
  views: number; likes: number; comments: number; shares: number; metrics_updated_at: string | null;
}

export interface PublishedTelegramPost {
  id: number; telegram_message_id: string; content: string; published_at: string | null;
  views: number; metrics_updated_at: string | null;
}

export async function getPublishedTwitterPosts(): Promise<PublishedTwitterPost[]> {
  const { data, error } = await supabase()
    .from("twitter_posts")
    .select("id, tweet_id, content, published_at, likes, retweets, replies, impressions, metrics_updated_at")
    .eq("status", "published")
    .not("tweet_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, likes: r.likes ?? 0, retweets: r.retweets ?? 0, replies: r.replies ?? 0, impressions: r.impressions ?? 0 })) as PublishedTwitterPost[];
}

export async function getPublishedLinkedInPosts(): Promise<PublishedLinkedInPost[]> {
  const { data, error } = await supabase()
    .from("linkedin_posts")
    .select("id, linkedin_post_id, content, published_at, likes, comments, impressions, metrics_updated_at")
    .eq("status", "published")
    .not("linkedin_post_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, likes: r.likes ?? 0, comments: r.comments ?? 0, impressions: r.impressions ?? 0 })) as PublishedLinkedInPost[];
}

export async function getPublishedTikTokPosts(): Promise<PublishedTikTokPost[]> {
  const { data, error } = await supabase()
    .from("tiktok_posts")
    .select("id, tiktok_publish_id, content, published_at, views, likes, comments, shares, metrics_updated_at")
    .eq("status", "published")
    .not("tiktok_publish_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, views: r.views ?? 0, likes: r.likes ?? 0, comments: r.comments ?? 0, shares: r.shares ?? 0 })) as PublishedTikTokPost[];
}

export async function getPublishedTelegramPosts(): Promise<PublishedTelegramPost[]> {
  const { data, error } = await supabase()
    .from("telegram_posts")
    .select("id, telegram_message_id, content, published_at, views, metrics_updated_at")
    .eq("status", "published")
    .not("telegram_message_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, views: r.views ?? 0 })) as PublishedTelegramPost[];
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

export async function getAnalyticsAggregates(): Promise<PlatformAggregate[]> {
  const [tw, li, tt, tg] = await Promise.all([
    supabase().from("twitter_posts").select("status, likes, impressions, replies, retweets"),
    supabase().from("linkedin_posts").select("status, likes, impressions, comments"),
    supabase().from("tiktok_posts").select("status, views, likes, comments, shares"),
    supabase().from("telegram_posts").select("status, views"),
  ]);

  type Row = Record<string, unknown>;

  function agg(
    platform: string, rows: Row[],
    likeKey = "likes", impressionKey = "impressions",
    commentKey: string | null = null, shareKey: string | null = null
  ): PlatformAggregate {
    if (!rows.length) return { platform, total_posts: 0, published: 0, pending: 0, failed: 0, total_likes: 0, total_impressions: 0, total_comments: 0, total_shares: 0 };
    return {
      platform,
      total_posts: rows.length,
      published: rows.filter((r) => r.status === "published").length,
      pending: rows.filter((r) => r.status === "pending").length,
      failed: rows.filter((r) => r.status === "failed").length,
      total_likes: rows.reduce((s, r) => s + ((r[likeKey] as number) ?? 0), 0),
      total_impressions: rows.reduce((s, r) => s + ((r[impressionKey] as number) ?? 0), 0),
      total_comments: commentKey ? rows.reduce((s, r) => s + ((r[commentKey] as number) ?? 0), 0) : 0,
      total_shares: shareKey ? rows.reduce((s, r) => s + ((r[shareKey] as number) ?? 0), 0) : 0,
    };
  }

  const results = [
    agg("twitter", (tw.data ?? []) as Row[], "likes", "impressions", "replies", "retweets"),
    agg("linkedin", (li.data ?? []) as Row[], "likes", "impressions", "comments"),
    agg("tiktok", (tt.data ?? []) as Row[], "likes", "views", "comments", "shares"),
    agg("telegram", (tg.data ?? []) as Row[], "views", "views"),
  ];
  return results.filter((r) => r.total_posts > 0);
}
