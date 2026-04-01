import { NextResponse } from "next/server";
import { getTwitterUserClient } from "@/lib/twitter-client";
import {
  getPublishedTwitterPosts,
  updateTwitterMetrics,
} from "@/lib/analytics-db";

// POST /api/analytics/refresh
// Fetches engagement metrics from connected platform APIs and stores them in the DB.
// Protected by x-cron-secret for scheduled calls; also callable manually from the dashboard.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = request.headers.get("x-cron-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results: Record<string, { updated: number; error?: string }> = {};

  // ── Twitter ──────────────────────────────────────────────────────────────
  try {
    const posts = getPublishedTwitterPosts();
    if (posts.length === 0) {
      results.twitter = { updated: 0 };
    } else {
      const client = await getTwitterUserClient();
      let updated = 0;

      // Batch into groups of 100 (Twitter API limit per lookup)
      for (let i = 0; i < posts.length; i += 100) {
        const batch = posts.slice(i, i + 100);
        const ids = batch.map((p) => p.tweet_id);

        const response = await client.v2.tweets(ids, {
          "tweet.fields": ["public_metrics"],
        });

        for (const tweet of response.data ?? []) {
          const m = tweet.public_metrics;
          if (!m) continue;
          updateTwitterMetrics(
            batch.find((p) => p.tweet_id === tweet.id)!.id,
            {
              likes: m.like_count ?? 0,
              retweets: m.retweet_count ?? 0,
              replies: m.reply_count ?? 0,
              impressions: m.impression_count ?? 0,
            }
          );
          updated++;
        }
      }

      results.twitter = { updated };
    }
  } catch (err) {
    results.twitter = {
      updated: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // ── LinkedIn ─────────────────────────────────────────────────────────────
  // The LinkedIn social analytics API requires the `r_organization_social` or
  // `r_member_social` scope, which is not included in the current OAuth flow.
  // Metrics will show zeros until the scope is expanded and users re-authenticate.
  results.linkedin = {
    updated: 0,
    error:
      "Engagement metrics require the r_member_social scope — re-authenticate via LinkedIn admin to enable.",
  };

  // ── TikTok ───────────────────────────────────────────────────────────────
  // The TikTok video.list scope is required to read video metrics.
  // Current OAuth only requests video.publish.
  results.tiktok = {
    updated: 0,
    error:
      "Engagement metrics require the video.list scope — re-authenticate via TikTok admin to enable.",
  };

  // ── Telegram ─────────────────────────────────────────────────────────────
  // Telegram Bot API does not expose per-message engagement metrics.
  // Channel posts return view counts via getChat, but bots posting to groups have no analytics API.
  results.telegram = { updated: 0 };

  return NextResponse.json({ ok: true, results });
}
