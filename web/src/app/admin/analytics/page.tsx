import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getAnalyticsAggregates,
  getPublishedTwitterPosts,
  getPublishedLinkedInPosts,
  getPublishedTikTokPosts,
  getPublishedTelegramPosts,
} from "@/lib/analytics-db";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const aggregates = getAnalyticsAggregates();
  const posts = {
    twitter: getPublishedTwitterPosts(),
    linkedin: getPublishedLinkedInPosts(),
    tiktok: getPublishedTikTokPosts(),
    telegram: getPublishedTelegramPosts(),
  };

  return <AnalyticsDashboardClient aggregates={aggregates} posts={posts} />;
}
