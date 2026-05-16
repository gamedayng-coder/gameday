import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { Brand } from '../../../../db/schema';

type Params = { params: { id: string } };

function isInternalRequest(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY;
  return !!key && req.headers.get('x-internal-key') === key;
}

/** GET /api/brands/[id] — full brand record including brief fields. */
export async function GET(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user && !isInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brands')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  return NextResponse.json(data as Brand);
}

/** PATCH /api/brands/[id] — update brand name and/or brief fields. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Partial<Omit<Brand, 'id' | 'created_at' | 'updated_at'>>;

  // Only allow updatable fields
  const allowed: (keyof typeof body)[] = [
    'name', 'core_values', 'content_themes', 'objectives', 'dislikes',
    'tone_of_voice', 'competitors', 'products_services', 'target_audience',
  ];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brands')
    .update(patch)
    .eq('id', params.id)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  return NextResponse.json(data as Brand);
}

/** DELETE /api/brands/[id] — delete brand and cascade credentials. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createSupabaseServiceClient();
  const { error } = await db.from('brands').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
