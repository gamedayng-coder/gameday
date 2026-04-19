import { auth } from "@/auth";
import {
  getBrandById,
  getBrandPublishingConfig,
  upsertBrandPublishingConfig,
  BrandPublishingConfig,
} from "@/lib/brand-db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

function isInternalRequest(req: Request): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get("x-internal-key") === key;
}

/** GET /api/brands/[id]/publishing-config */
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

  const config = await getBrandPublishingConfig(id);
  if (!config) return NextResponse.json({ error: "Publishing config not found" }, { status: 404 });
  return NextResponse.json(config);
}

/** PATCH /api/brands/[id]/publishing-config — upsert. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const brand = await getBrandById(id, session.user.id!);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const body = await req.json() as { config?: BrandPublishingConfig["config"] };
  if (!body.config || typeof body.config !== "object") {
    return NextResponse.json({ error: "`config` object is required" }, { status: 400 });
  }

  const config = await upsertBrandPublishingConfig(id, body.config);
  return NextResponse.json(config);
}
