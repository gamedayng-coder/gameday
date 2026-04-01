import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTelegramPost, getTelegramPosts } from "@/lib/telegram-db";

// GET /api/telegram/posts — list all posts
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getTelegramPosts());
}

// POST /api/telegram/posts — queue a new post (immediate or scheduled)
// Body: { content: string, posterId?: string, scheduledAt?: string (ISO) }
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
  // Telegram caption limit is 4096 characters; text message limit is the same
  if (content.length > 4096) {
    return NextResponse.json({ error: "Content exceeds 4096 characters" }, { status: 400 });
  }

  const posterId: string | null = typeof body.posterId === "string" ? body.posterId : null;
  const scheduledAt: Date | null = body.scheduledAt ? new Date(body.scheduledAt) : null;

  if (scheduledAt && isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt date" }, { status: 400 });
  }

  const post = createTelegramPost(content, posterId, scheduledAt);
  return NextResponse.json(post, { status: 201 });
}
