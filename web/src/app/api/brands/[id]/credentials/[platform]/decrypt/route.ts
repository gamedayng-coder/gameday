import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '../../../../../../../lib/supabase/service';
import { decrypt } from '../../../../../../../lib/crypto';
import { BrandCredential } from '../../../../../../../db/schema';

type Params = { params: { id: string; platform: string } };

/**
 * GET /api/brands/[id]/credentials/[platform]/decrypt
 * Internal-only endpoint for the publishing pipeline.
 * Requires X-Internal-Key header matching INTERNAL_API_KEY env var.
 * Updates last_used_at on each call for the audit trail.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return NextResponse.json({ error: 'Internal API not configured' }, { status: 503 });
  }
  if (req.headers.get('x-internal-key') !== internalKey) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brand_credentials')
    .select('*')
    .eq('brand_id', params.id)
    .eq('platform', params.platform)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });

  const row = data as BrandCredential;
  const value = decrypt(row.encrypted_value, row.iv);

  // Update audit timestamp (fire-and-forget — don't block response)
  db.from('brand_credentials')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)
    .then(() => {});

  return NextResponse.json({ platform: params.platform, value });
}
