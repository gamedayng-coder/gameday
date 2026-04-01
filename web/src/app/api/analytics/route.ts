import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getAnalyticsAggregates,
  getPublishedTwitterPosts,
  getPublishedLinkedInPosts,
  getPublishedTikTokPosts,
  getPublishedTelegramPosts,
} from "@/lib/analytics-db";

// GET /api/analytics
// Returns aggregate platform stats and per-post metrics for the dashboard.
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const aggregates = getAnalyticsAggregates();
  const posts = {
    twitter: getPublishedTwitterPosts(),
    linkedin: getPublishedLinkedInPosts(),
    tiktok: getPublishedTikTokPosts(),
    telegram: getPublishedTelegramPosts(),
  };

  return NextResponse.json({ aggregates, posts });
}
