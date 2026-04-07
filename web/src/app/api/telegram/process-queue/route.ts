import { NextRequest, NextResponse } from "next/server";
import {
  getDueTelegramPosts,
  markTelegramPostPublished,
  markTelegramPostFailed,
} from "@/lib/telegram-db";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram-client";
import { getPosterById } from "@/lib/poster-db";
import fs from "fs";

// POST /api/telegram/process-queue
// Publishes all due (pending + scheduled_at <= now) posts.
// Protect with CRON_SECRET header when calling from a cron or external scheduler.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const duePosts = await getDueTelegramPosts();
  if (duePosts.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: { id: number; success: boolean; messageId?: string; error?: string }[] = [];

  for (const post of duePosts) {
    try {
      let messageId: string;

      if (post.poster_id) {
        const poster = await getPosterById(post.poster_id);
        if (poster?.image_path && fs.existsSync(poster.image_path)) {
          // Send as photo with caption when an approved poster image is attached
          messageId = await sendTelegramPhoto(poster.image_path, post.content);
        } else {
          messageId = await sendTelegramMessage(post.content);
        }
      } else {
        messageId = await sendTelegramMessage(post.content);
      }

      await markTelegramPostPublished(post.id, messageId);
      results.push({ id: post.id, success: true, messageId });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      await markTelegramPostFailed(post.id, errMsg);
      results.push({ id: post.id, success: false, error: errMsg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
