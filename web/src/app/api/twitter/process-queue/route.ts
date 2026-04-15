import { NextRequest, NextResponse } from "next/server";
import {
  getDueTwitterPosts,
  markTwitterPostPublished,
  markTwitterPostFailed,
} from "@/lib/twitter-db";
import { getTwitterUserClient } from "@/lib/twitter-client";
import { getPosterById } from "@/lib/poster-db";
import fs from "fs";

// POST /api/twitter/process-queue
// Publishes all due (pending + scheduled_at <= now) posts, grouped by user.
// Each user's posts are published with that user's own Twitter credentials.
// Protect with CRON_SECRET header when calling from a cron or external scheduler.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const duePosts = await getDueTwitterPosts();
  if (duePosts.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  // Group posts by user so we fetch credentials once per user
  const byUser = new Map<string, typeof duePosts>();
  for (const post of duePosts) {
    const existing = byUser.get(post.user_id) ?? [];
    existing.push(post);
    byUser.set(post.user_id, existing);
  }

  const results: { id: number; success: boolean; tweetId?: string; error?: string }[] = [];

  for (const [userId, posts] of byUser) {
    let userClient: Awaited<ReturnType<typeof getTwitterUserClient>>;
    try {
      userClient = await getTwitterUserClient(userId);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "No Twitter account connected";
      for (const post of posts) {
        await markTwitterPostFailed(post.id, errMsg);
        results.push({ id: post.id, success: false, error: errMsg });
      }
      continue;
    }

    for (const post of posts) {
      try {
        let mediaIds: [string] | undefined;

        if (post.poster_id) {
          const poster = await getPosterById(post.poster_id);
          if (poster?.image_path && fs.existsSync(poster.image_path)) {
            const mediaId = await userClient.v1.uploadMedia(poster.image_path);
            mediaIds = [mediaId];
          }
        }

        const tweet = await userClient.v2.tweet({
          text: post.content,
          ...(mediaIds ? { media: { media_ids: mediaIds } } : {}),
        });

        await markTwitterPostPublished(post.id, tweet.data.id);
        results.push({ id: post.id, success: true, tweetId: tweet.data.id });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        await markTwitterPostFailed(post.id, errMsg);
        results.push({ id: post.id, success: false, error: errMsg });
      }
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
