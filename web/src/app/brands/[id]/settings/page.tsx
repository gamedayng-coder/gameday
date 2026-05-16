import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { Brand } from '../../../../db/schema';
import { deleteBrand } from '../../../../lib/brand-actions';
import DeleteBrandButton from '../DeleteBrandButton';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function BrandSettingsPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data: brandData } = await db
    .from('brands')
    .select('id, name')
    .eq('id', params.id)
    .maybeSingle();

  if (!brandData) notFound();

  const brand = brandData as Pick<Brand, 'id' | 'name'>;
  const deleteThisBrand = deleteBrand.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Brand management and danger zone.</p>
      </div>

      <div className="border border-red-900 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-red-400 mb-1">Danger zone</h2>
        <p className="text-xs text-slate-500 mb-4">
          Deleting this brand is permanent and cannot be undone. All associated profiles, voice,
          policies, contacts, knowledge, templates, and publishing configuration will be removed.
        </p>
        <DeleteBrandButton brandName={brand.name} deleteBrand={deleteThisBrand} />
      </div>
    </div>
  );
}
