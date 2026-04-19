import { auth } from "@/auth";
import {
  getBrandById,
  listBrandTemplates,
  createBrandTemplate,
  TemplateKind,
} from "@/lib/brand-db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const VALID_KINDS: TemplateKind[] = ["poster", "caption"];
const VALID_POSTER_TYPES = ["match-day", "result", "weekly-schedule", "custom"];
const VALID_PLATFORMS = ["facebook", "instagram", "twitter", "linkedin", "tiktok", "telegram"];

function isInternalRequest(req: Request): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get("x-internal-key") === key;
}

/** GET /api/brands/[id]/templates */
export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id && !isInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isInternalRequest(req)) {
    const brand = await getBrandById(id, session!.user!.id!);
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") as TemplateKind | null;
  const templates = await listBrandTemplates(
    id,
    kind && VALID_KINDS.includes(kind) ? kind : undefined
  );
  return NextResponse.json(templates);
}

/** POST /api/brands/[id]/templates — create a new template. */
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const brand = await getBrandById(id, session.user.id!);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const body = await req.json() as {
    kind?: string;
    name?: string;
    content?: string;
    poster_type?: string;
    platform?: string;
  };

  if (!body.kind || !VALID_KINDS.includes(body.kind as TemplateKind)) {
    return NextResponse.json({ error: '`kind` must be "poster" or "caption"' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "`name` is required" }, { status: 400 });
  }
  if (body.kind === "poster" && body.poster_type && !VALID_POSTER_TYPES.includes(body.poster_type)) {
    return NextResponse.json({ error: "Invalid poster_type" }, { status: 400 });
  }
  if (body.kind === "caption" && body.platform && !VALID_PLATFORMS.includes(body.platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const template = await createBrandTemplate(id, {
    kind: body.kind as TemplateKind,
    name: body.name.trim(),
    content: body.content ?? "",
    poster_type: body.kind === "poster" ? (body.poster_type ?? null) : null,
    platform: body.kind === "caption" ? (body.platform ?? null) : null,
  });
  return NextResponse.json(template, { status: 201 });
}
