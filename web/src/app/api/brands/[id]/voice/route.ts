import { auth } from "@/auth";
import {
  getBrandById,
  getBrandVoice,
  upsertBrandVoice,
  BrandVoice,
} from "@/lib/brand-db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

function isInternalRequest(req: Request): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get("x-internal-key") === key;
}

/** GET /api/brands/[id]/voice */
export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id && !isInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership (skip for internal)
  if (!isInternalRequest(req)) {
    const brand = await getBrandById(id, session!.user!.id!);
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const voice = await getBrandVoice(id);
  if (!voice) return NextResponse.json({ error: "Voice document not found" }, { status: 404 });
  return NextResponse.json(voice);
}

/** PATCH /api/brands/[id]/voice — upsert voice document fields. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const brand = await getBrandById(id, session.user.id!);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const body = await req.json() as Partial<
    Pick<
      BrandVoice,
      | "tone"
      | "style"
      | "platform_guidelines"
      | "dos_and_donts"
      | "sample_copy"
      | "competitor_differentiation"
    >
  >;

  const voice = await upsertBrandVoice(id, body);
  return NextResponse.json(voice);
}
