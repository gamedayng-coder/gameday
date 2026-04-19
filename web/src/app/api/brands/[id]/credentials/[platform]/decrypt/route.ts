import {
  getBrandCredentialForDecrypt,
  touchBrandCredentialUsed,
} from "@/lib/brand-db";
import { decrypt } from "@/lib/crypto";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; platform: string }> };

/**
 * GET /api/brands/[id]/credentials/[platform]/decrypt
 * Internal-only endpoint for the publishing pipeline.
 * Requires X-Internal-Key header matching INTERNAL_API_KEY env var.
 * Updates last_used_at on each call for the audit trail.
 */
export async function GET(req: Request, { params }: Params) {
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return NextResponse.json({ error: "Internal API not configured" }, { status: 503 });
  }
  if (req.headers.get("x-internal-key") !== internalKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, platform } = await params;
  const row = await getBrandCredentialForDecrypt(id, platform);
  if (!row) return NextResponse.json({ error: "Credential not found" }, { status: 404 });

  const value = decrypt(row.encrypted_value, row.iv);

  // Update audit timestamp (fire-and-forget)
  touchBrandCredentialUsed(row.id).catch(() => {});

  return NextResponse.json({ platform, value });
}
