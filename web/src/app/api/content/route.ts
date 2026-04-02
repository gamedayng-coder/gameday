import { auth } from "@/auth";
import { createContentItem, getContentItems, type ContentStatus } from "@/lib/content-db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as ContentStatus | null;
  return NextResponse.json(getContentItems(session.user.id, status ?? undefined));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as {
    poster_id?: string | null;
    event_id?: string | null;
    caption?: string;
    platform_captions?: Record<string, string>;
  };
  const item = createContentItem(
    randomUUID(),
    session.user.id,
    body.poster_id ?? null,
    body.event_id ?? null,
    body.caption ?? "",
    body.platform_captions ?? {}
  );
  return NextResponse.json(item, { status: 201 });
}
