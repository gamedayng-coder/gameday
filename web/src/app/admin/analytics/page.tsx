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

  const aggregates = await getAnalyticsAggregates();
  const posts = {
    twitter: await getPublishedTwitterPosts(),
    linkedin: await getPublishedLinkedInPosts(),
    tiktok: await getPublishedTikTokPosts(),
    telegram: await getPublishedTelegramPosts(),
  };

  return <AnalyticsDashboardClient aggregates={aggregates} posts={posts} />;
}
