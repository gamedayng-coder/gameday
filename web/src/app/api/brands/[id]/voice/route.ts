import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { BrandVoice } from '../../../../../db/schema';

type Params = { params: { id: string } };

const VOICE_FIELDS = [
  'tone',
  'style',
  'platform_guidelines',
  'dos_and_donts',
  'sample_copy',
  'competitor_differentiation',
] as const;

function isInternalRequest(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get('x-internal-key') === key;
}

/** GET /api/brands/[id]/voice — return voice doc, or 404 if not yet created. */
export async function GET(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user && !isInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brand_voice')
    .select('*')
    .eq('brand_id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Voice document not found' }, { status: 404 });
  return NextResponse.json(data as BrandVoice);
}

/** PATCH /api/brands/[id]/voice — upsert voice document fields. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Partial<Omit<BrandVoice, 'id' | 'brand_id' | 'created_at' | 'updated_at'>>;

  const patch: Record<string, unknown> = {
    brand_id: params.id,
    updated_at: new Date().toISOString(),
  };
  for (const field of VOICE_FIELDS) {
    if (field in body) patch[field] = body[field];
  }

  const db = createSupabaseServiceClient();

  // Verify brand exists
  const { data: brand } = await db.from('brands').select('id').eq('id', params.id).maybeSingle();
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

  // Upsert — insert on first call, update on subsequent (conflict on brand_id)
  const { data, error } = await db
    .from('brand_voice')
    .upsert({ id: randomUUID(), ...patch }, { onConflict: 'brand_id' })
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as BrandVoice);
}
