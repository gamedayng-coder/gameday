import { auth } from "@/auth";
import {
  getBrandById,
  listBrandCredentials,
  upsertBrandCredential,
} from "@/lib/brand-db";
import { encrypt } from "@/lib/crypto";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** GET /api/brands/[id]/credentials — list platforms with metadata (no plaintext). */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const brand = await getBrandById(id, session.user.id!);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const credentials = await listBrandCredentials(id);
  return NextResponse.json(credentials);
}

/** POST /api/brands/[id]/credentials — save or update a credential. */
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const brand = await getBrandById(id, session.user.id!);
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const body = await req.json() as { platform?: string; value?: string };
  if (!body.platform || !body.value) {
    return NextResponse.json({ error: "`platform` and `value` are required" }, { status: 400 });
  }

  const { iv, encrypted_value } = encrypt(body.value);
  const meta = await upsertBrandCredential(id, body.platform, encrypted_value, iv);
  return NextResponse.json(meta);
}
