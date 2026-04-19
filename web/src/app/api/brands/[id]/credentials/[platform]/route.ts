import { auth } from "@/auth";
import { getBrandById, deleteBrandCredential } from "@/lib/brand-db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; platform: string }> };

/** DELETE /api/brands/[id]/credentials/[platform] — remove a credential. */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, platform } = await params;
  const brand = await getBrandById(id, session.user.id!);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  await deleteBrandCredential(id, platform);
  return new NextResponse(null, { status: 204 });
}
