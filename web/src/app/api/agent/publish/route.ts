import { NextRequest, NextResponse } from "next/server";
import { validateAgentRequest } from "@/lib/agent-auth";
import { getContentItems, updateContentItem } from "@/lib/content-db";
import { getTwitterCredential, createTwitterPost, getDueTwitterPosts, markTwitterPostPublished, markTwitterPostFailed } from "@/lib/twitter-db";
import { getLinkedInCredential, createLinkedInPost, getDueLinkedInPosts, markLinkedInPostPublished, markLinkedInPostFailed } from "@/lib/linkedin-db";
import { getTelegramCredential, createTelegramPost, getDueTelegramPosts, markTelegramPostPublished, markTelegramPostFailed } from "@/lib/telegram-db";
import { getTikTokCredential, createTikTokPost, getDueTikTokPosts, markTikTokPostFailed } from "@/lib/tiktok-db";
import { getTwitterUserClient } from "@/lib/twitter-client";
import { postToLinkedIn } from "@/lib/linkedin-client";
import { sendTelegramMessage } from "@/lib/telegram-client";

// POST /api/agent/publish
// 1. Takes all approved content_items for the agent user.
// 2. Creates pending platform posts on each connected channel using the
//    platform-specific caption (falls back to generic caption).
// 3. Processes each platform's due queue and publishes immediately.
// 4. Marks content_items as "scheduled" once queued.
//
// TikTok is skipped for text-only content (requires video/photo media).
//
// Returns: { queued: number, published: number, channels: object }
export async function POST(req: NextRequest) {
  const agent = await validateAgentRequest(req);
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const approvedItems = await getContentItems(agent.userId, "approved");
  let queued = 0;

  // ── Queue approved content onto each connected channel ────────────────────

  const twitterCred = await getTwitterCredential(agent.userId);
  const linkedinCred = await getLinkedInCredential(agent.userId);
  const telegramCred = await getTelegramCredential(agent.userId);
  const tiktokCred = await getTikTokCredential(agent.userId);

  for (const item of approvedItems) {
    const captions = (() => {
      try { return JSON.parse(item.platform_captions) as Record<string, string>; }
      catch { return {} as Record<string, string>; }
    })();

    if (twitterCred) {
      const text = (captions.twitter || item.caption).slice(0, 280);
      if (text.trim()) { await createTwitterPost(agent.userId, text, item.poster_id ?? null, null); queued++; }
    }
    if (linkedinCred) {
      const text = captions.linkedin || item.caption;
      if (text.trim()) { await createLinkedInPost(agent.userId, text, item.poster_id ?? null, null); queued++; }
    }
    if (telegramCred) {
      const text = captions.telegram || item.caption;
      if (text.trim()) { await createTelegramPost(agent.userId, text, item.poster_id ?? null, null); queued++; }
    }
    // TikTok requires media — queue posts only when a poster image is attached
    if (tiktokCred && item.poster_id) {
      const text = captions.tiktok || item.caption;
      if (text.trim()) { await createTikTokPost(agent.userId, text, item.poster_id, null); queued++; }
    }
  }

  // Mark approved items as scheduled now that they've been queued
  for (const item of approvedItems) {
    await updateContentItem(item.id, agent.userId, { status: "scheduled" });
  }

  // ── Process each channel's due queue ─────────────────────────────────────

  type ChannelResult = { published: number; failed: number; errors: string[] };
  const channelResults: Record<string, ChannelResult> = {};

  // Twitter
  if (twitterCred) {
    channelResults.twitter = { published: 0, failed: 0, errors: [] };
    try {
      const userClient = await getTwitterUserClient(agent.userId);
      for (const post of await getDueTwitterPosts()) {
        try {
          const tweet = await userClient.v2.tweet({ text: post.content });
          await markTwitterPostPublished(post.id, tweet.data.id);
          channelResults.twitter.published++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await markTwitterPostFailed(post.id, msg);
          channelResults.twitter.failed++;
          channelResults.twitter.errors.push(msg);
        }
      }
    } catch (e) {
      channelResults.twitter.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // LinkedIn
  if (linkedinCred) {
    channelResults.linkedin = { published: 0, failed: 0, errors: [] };
    for (const post of await getDueLinkedInPosts()) {
      try {
        const postId = await postToLinkedIn(agent.userId, post.content);
        await markLinkedInPostPublished(post.id, postId);
        channelResults.linkedin.published++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await markLinkedInPostFailed(post.id, msg);
        channelResults.linkedin.failed++;
        channelResults.linkedin.errors.push(msg);
      }
    }
  }

  // Telegram
  if (telegramCred) {
    channelResults.telegram = { published: 0, failed: 0, errors: [] };
    for (const post of await getDueTelegramPosts()) {
      try {
        const messageId = await sendTelegramMessage(agent.userId, post.content);
        await markTelegramPostPublished(post.id, messageId);
        channelResults.telegram.published++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await markTelegramPostFailed(post.id, msg);
        channelResults.telegram.failed++;
        channelResults.telegram.errors.push(msg);
      }
    }
  }

  // TikTok — text-only posts not supported; fail any that slipped through
  if (tiktokCred) {
    channelResults.tiktok = { published: 0, failed: 0, errors: [] };
    for (const post of await getDueTikTokPosts()) {
      const msg = "TikTok requires a poster image; text-only posts are not supported";
      await markTikTokPostFailed(post.id, msg);
      channelResults.tiktok.failed++;
      channelResults.tiktok.errors.push(msg);
    }
  }

  const totalPublished = Object.values(channelResults).reduce((sum, r) => sum + r.published, 0);

  return NextResponse.json({
    queued,
    published: totalPublished,
    content_items_scheduled: approvedItems.length,
    channels: channelResults,
  });
}
