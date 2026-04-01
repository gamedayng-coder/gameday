import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTikTokPost, getTikTokPosts } from "@/lib/tiktok-db";

// GET /api/tiktok/posts — list all posts
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getTikTokPosts());
}

// POST /api/tiktok/posts — queue a new post (immediate or scheduled)
// Body: { content: string, posterId?: string, scheduledAt?: string (ISO) }
// Note: TikTok requires a media attachment. posterId must point to an image poster.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const content: string = body.content.trim();
  // TikTok caption limit is 2200 characters
  if (content.length > 2200) {
    return NextResponse.json({ error: "Content exceeds 2200 characters" }, { status: 400 });
  }

  const posterId: string | null = typeof body.posterId === "string" ? body.posterId : null;
  const scheduledAt: Date | null = body.scheduledAt ? new Date(body.scheduledAt) : null;

  if (scheduledAt && isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt date" }, { status: 400 });
  }

  const post = createTikTokPost(content, posterId, scheduledAt);
  return NextResponse.json(post, { status: 201 });
}
