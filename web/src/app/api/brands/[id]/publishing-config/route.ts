import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { BrandPublishingConfig } from '../../../../../db/schema';

type Params = { params: { id: string } };

function isInternalRequest(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get('x-internal-key') === key;
}

/** GET /api/brands/[id]/publishing-config */
export async function GET(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user && !isInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brand_publishing_config')
    .select('*')
    .eq('brand_id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Publishing config not found' }, { status: 404 });
  return NextResponse.json(data as BrandPublishingConfig);
}

/** PATCH /api/brands/[id]/publishing-config — upsert. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { config?: BrandPublishingConfig['config'] };
  if (!body.config || typeof body.config !== 'object') {
    return NextResponse.json({ error: '`config` object is required' }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  // Verify brand exists
  const { data: brand } = await db.from('brands').select('id').eq('id', params.id).maybeSingle();
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

  const { data, error } = await db
    .from('brand_publishing_config')
    .upsert(
      {
        id: randomUUID(),
        brand_id: params.id,
        config: body.config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'brand_id' },
    )
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as BrandPublishingConfig);
}
