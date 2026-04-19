import { auth } from "@/auth";
import { getBrandById, updateBrand, deleteBrand, Brand } from "@/lib/brand-db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

function isInternalRequest(req: Request): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get("x-internal-key") === key;
}

/** GET /api/brands/[id] — full brand record including brief fields. */
export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id && !isInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Internal agents can access any brand (no user_id check)
  if (isInternalRequest(req)) {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase()
      .from("brands")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  const brand = await getBrandById(id, session!.user!.id!);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  return NextResponse.json(brand);
}

/** PATCH /api/brands/[id] — update brand name and/or brief fields. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as Partial<
    Pick<
      Brand,
      | "name"
      | "core_values"
      | "content_themes"
      | "objectives"
      | "dislikes"
      | "tone_of_voice"
      | "competitors"
      | "products_services"
      | "target_audience"
    >
  >;

  const allowed = [
    "name", "core_values", "content_themes", "objectives", "dislikes",
    "tone_of_voice", "competitors", "products_services", "target_audience",
  ] as const;
  const patch: Partial<typeof body> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key] as never;
  }

  const brand = await updateBrand(id, session.user.id!, patch);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  return NextResponse.json(brand);
}

/** DELETE /api/brands/[id] — delete brand (cascades all related data). */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteBrand(id, session.user.id!);
  return new NextResponse(null, { status: 204 });
}
