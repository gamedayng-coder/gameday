import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelTwitterPost, getTwitterPostById } from "@/lib/twitter-db";

// DELETE /api/twitter/posts/[id] — cancel a pending post
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const post = await getTwitterPostById(id);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (post.status !== "pending") {
    return NextResponse.json({ error: "Can only cancel pending posts" }, { status: 409 });
  }

  await cancelTwitterPost(id);
  return NextResponse.json({ success: true });
}
