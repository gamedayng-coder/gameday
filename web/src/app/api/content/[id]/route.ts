import { auth } from "@/auth";
import { getContentItemById, updateContentItem, type ContentStatus } from "@/lib/content-db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const item = getContentItemById(id, session.user.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as {
    caption?: string;
    platform_captions?: Record<string, string>;
    status?: ContentStatus;
    scheduled_at?: string | null;
  };
  const updated = updateContentItem(id, session.user.id, {
    ...(body.caption !== undefined && { caption: body.caption }),
    ...(body.platform_captions !== undefined && { platform_captions: body.platform_captions }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.scheduled_at !== undefined && { scheduled_at: body.scheduled_at }),
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
