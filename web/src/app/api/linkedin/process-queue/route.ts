import { NextRequest, NextResponse } from "next/server";
import {
  getDueLinkedInPosts,
  markLinkedInPostPublished,
  markLinkedInPostFailed,
} from "@/lib/linkedin-db";
import { postToLinkedIn } from "@/lib/linkedin-client";

// POST /api/linkedin/process-queue
// Publishes all due (pending + scheduled_at <= now) posts.
// Protect with CRON_SECRET header when calling from a cron or external scheduler.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const duePosts = await getDueLinkedInPosts();
  if (duePosts.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: { id: number; success: boolean; linkedinPostId?: string; error?: string }[] = [];

  for (const post of duePosts) {
    try {
      const linkedinPostId = await postToLinkedIn(post.content);
      await markLinkedInPostPublished(post.id, linkedinPostId);
      results.push({ id: post.id, success: true, linkedinPostId });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      await markLinkedInPostFailed(post.id, errMsg);
      results.push({ id: post.id, success: false, error: errMsg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
