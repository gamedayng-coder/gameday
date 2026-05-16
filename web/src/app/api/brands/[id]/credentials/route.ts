import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { encrypt } from '../../../../../lib/crypto';
import { BrandCredentialMeta } from '../../../../../db/schema';

type Params = { params: { id: string } };

/** GET /api/brands/[id]/credentials — list platforms with metadata (no plaintext). */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brand_credentials')
    .select('platform, last_updated_at, last_used_at')
    .eq('brand_id', params.id)
    .order('platform');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: BrandCredentialMeta[] = (data ?? []) as BrandCredentialMeta[];
  return NextResponse.json(result);
}

/** POST /api/brands/[id]/credentials — save or update a credential. */
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { platform?: string; value?: string };
  if (!body.platform || !body.value) {
    return NextResponse.json({ error: '`platform` and `value` are required' }, { status: 400 });
  }

  const { iv, encrypted_value } = encrypt(body.value);

  const db = createSupabaseServiceClient();

  // Verify the brand exists
  const { data: brand } = await db.from('brands').select('id').eq('id', params.id).maybeSingle();
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

  const { data, error } = await db
    .from('brand_credentials')
    .upsert(
      {
        brand_id: params.id,
        platform: body.platform,
        encrypted_value,
        iv,
        last_updated_at: new Date().toISOString(),
        last_used_at: null,
      },
      { onConflict: 'brand_id,platform' },
    )
    .select('platform, last_updated_at, last_used_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data as BrandCredentialMeta, { status: 200 });
}
