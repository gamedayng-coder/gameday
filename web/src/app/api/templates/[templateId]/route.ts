import { auth } from "@/auth";
import {
  getTemplate,
  updateTemplate,
  deleteTemplate,
  deactivateTemplatesInScope,
  BrandTemplate,
} from "@/lib/brand-db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ templateId: string }> };

function isInternalRequest(req: Request): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get("x-internal-key") === key;
}

/** GET /api/templates/[templateId] */
export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id && !isInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await params;
  const template = await getTemplate(templateId);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json(template);
}

/** PATCH /api/templates/[templateId] */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await params;
  const existing = await getTemplate(templateId);
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const body = await req.json() as Partial<
    Pick<BrandTemplate, "name" | "content" | "poster_type" | "platform" | "is_active">
  >;

  // When activating, deactivate others in same brand+kind+scope first
  if (body.is_active === true) {
    await deactivateTemplatesInScope(
      existing.brand_id,
      existing.kind,
      existing.poster_type,
      existing.platform,
      templateId
    );
  }

  const updated = await updateTemplate(templateId, body);
  if (!updated) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json(updated);
}

/** DELETE /api/templates/[templateId] */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await params;
  await deleteTemplate(templateId);
  return new NextResponse(null, { status: 204 });
}
