import { auth } from "@/auth";
import { getBrand, getTrainingData, createTrainingDataItem, type ContentType, type Sentiment } from "@/lib/training-data-db";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const brand = await getBrand(id, session.user.id);
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const items = await getTrainingData(id, session.user.id, {
    content_type: searchParams.get("content_type") ?? undefined,
    platform: searchParams.get("platform") ?? undefined,
    sentiment: searchParams.get("sentiment") ?? undefined,
  });
  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const brand = await getBrand(id, session.user.id);
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    content_type?: string;
    content?: string;
    platform?: string;
    tone?: string;
    campaign?: string;
    sentiment?: string;
    source_url?: string;
  };
  if (!body.content_type) return NextResponse.json({ error: "content_type is required" }, { status: 400 });
  if (!body.content?.trim()) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const VALID_TYPES: ContentType[] = ["post", "caption", "poster", "competitor", "inspiration"];
  if (!VALID_TYPES.includes(body.content_type as ContentType)) {
    return NextResponse.json({ error: `content_type must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }

  const item = await createTrainingDataItem(randomUUID(), id, session.user.id, {
    content_type: body.content_type as ContentType,
    content: body.content.trim(),
    platform: body.platform || null,
    tone: body.tone || null,
    campaign: body.campaign || null,
    sentiment: (body.sentiment === "negative" ? "negative" : "positive") as Sentiment,
    source_url: body.source_url || null,
  });
  return NextResponse.json(item, { status: 201 });
}
