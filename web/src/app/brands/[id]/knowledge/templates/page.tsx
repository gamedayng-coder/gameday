import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { BrandTemplate } from '../../../../../db/schema';
import TemplatesSection from '../../TemplatesSection';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function BrandTemplatesPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: templatesData }] = await Promise.all([
    db.from('brands').select('id').eq('id', params.id).maybeSingle(),
    db.from('brand_templates')
      .select('*')
      .eq('brand_id', params.id)
      .order('kind')
      .order('name'),
  ]);

  if (!brandData) notFound();

  const templates = (templatesData ?? []) as BrandTemplate[];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Templates</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Poster and caption templates used during content generation.
        </p>
      </div>
      <TemplatesSection brandId={params.id} initialTemplates={templates} />
    </div>
  );
}
