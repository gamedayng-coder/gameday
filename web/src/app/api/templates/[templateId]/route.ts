import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { BrandTemplate } from '../../../../db/schema';

type Params = { params: { templateId: string } };

/** GET /api/templates/[templateId] */
export async function GET(req: NextRequest, { params }: Params) {
  const user = await getUser();
  const isInternal = (() => {
    const key = process.env.INTERNAL_API_KEY;
    return !!key && req.headers.get('x-internal-key') === key;
  })();
  if (!user && !isInternal) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('brand_templates')
    .select('*')
    .eq('id', params.templateId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  return NextResponse.json(data as BrandTemplate);
}

/** PATCH /api/templates/[templateId] — update name, content, poster_type, platform, is_active. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createSupabaseServiceClient();

  // Fetch existing to know brand_id and kind for scope deactivation
  const { data: existing } = await db
    .from('brand_templates')
    .select('*')
    .eq('id', params.templateId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const tmpl = existing as BrandTemplate;
  const body = await req.json() as Partial<Pick<BrandTemplate, 'name' | 'content' | 'poster_type' | 'platform' | 'is_active'>>;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('name' in body && body.name?.trim()) patch.name = body.name.trim();
  if ('content' in body) patch.content = body.content;
  if ('poster_type' in body) patch.poster_type = body.poster_type;
  if ('platform' in body) patch.platform = body.platform;
  if ('is_active' in body) patch.is_active = body.is_active;

  // When activating, deactivate others in the same brand+kind+scope first
  if (body.is_active === true) {
    let deactivateQuery = db
      .from('brand_templates')
      .update({ is_active: false })
      .eq('brand_id', tmpl.brand_id)
      .eq('kind', tmpl.kind)
      .neq('id', params.templateId);

    // Scope by poster_type (poster) or platform (caption) if set
    if (tmpl.kind === 'poster' && tmpl.poster_type) {
      deactivateQuery = deactivateQuery.eq('poster_type', tmpl.poster_type) as typeof deactivateQuery;
    } else if (tmpl.kind === 'caption' && tmpl.platform) {
      deactivateQuery = deactivateQuery.eq('platform', tmpl.platform) as typeof deactivateQuery;
    }

    await deactivateQuery;
  }

  const { data, error } = await db
    .from('brand_templates')
    .update(patch)
    .eq('id', params.templateId)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as BrandTemplate);
}

/** DELETE /api/templates/[templateId] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createSupabaseServiceClient();
  const { error } = await db.from('brand_templates').delete().eq('id', params.templateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
