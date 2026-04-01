import { NextRequest, NextResponse } from "next/server";
import {
  getDueTikTokPosts,
  markTikTokPostPublished,
  markTikTokPostFailed,
} from "@/lib/tiktok-db";
import { postTikTokPhoto } from "@/lib/tiktok-client";
import { getPosterById } from "@/lib/poster-db";
import fs from "fs";

// POST /api/tiktok/process-queue
// Publishes all due (pending + scheduled_at <= now) posts.
// TikTok requires a poster image — posts without a valid image attachment will fail.
// Protect with CRON_SECRET header when calling from a cron or external scheduler.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const duePosts = getDueTikTokPosts();
  if (duePosts.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: { id: number; success: boolean; publishId?: string; error?: string }[] = [];

  for (const post of duePosts) {
    try {
      if (!post.poster_id) {
        throw new Error("TikTok posts require an attached poster image (no media attached)");
      }

      const poster = getPosterById(post.poster_id);
      if (!poster?.image_path || !fs.existsSync(poster.image_path)) {
        throw new Error(
          `Poster image not found or not yet generated (poster_id: ${post.poster_id})`
        );
      }

      const publishId = await postTikTokPhoto(post.content, poster.image_path);
      markTikTokPostPublished(post.id, publishId);
      results.push({ id: post.id, success: true, publishId });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      markTikTokPostFailed(post.id, errMsg);
      results.push({ id: post.id, success: false, error: errMsg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
