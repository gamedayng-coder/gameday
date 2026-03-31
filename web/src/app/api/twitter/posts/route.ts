import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTwitterPost, getTwitterPosts } from "@/lib/twitter-db";

// GET /api/twitter/posts — list all posts
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getTwitterPosts());
}

// POST /api/twitter/posts — queue a new post (immediate or scheduled)
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
  if (content.length > 280) {
    return NextResponse.json({ error: "Content exceeds 280 characters" }, { status: 400 });
  }

  const posterId: string | null = typeof body.posterId === "string" ? body.posterId : null;
  const scheduledAt: Date | null = body.scheduledAt ? new Date(body.scheduledAt) : null;

  if (scheduledAt && isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt date" }, { status: 400 });
  }

  const post = createTwitterPost(content, posterId, scheduledAt);
  return NextResponse.json(post, { status: 201 });
}
