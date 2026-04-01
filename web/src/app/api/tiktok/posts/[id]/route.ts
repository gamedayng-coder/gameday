import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelTikTokPost, getTikTokPostById } from "@/lib/tiktok-db";

// DELETE /api/tiktok/posts/[id] — cancel a pending post
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const post = getTikTokPostById(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.status !== "pending") {
    return NextResponse.json({ error: "Only pending posts can be cancelled" }, { status: 409 });
  }

  cancelTikTokPost(postId);
  return NextResponse.json({ success: true });
}
