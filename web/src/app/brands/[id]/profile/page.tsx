import { notFound, redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import { Brand, BrandProfile } from '../../../../db/schema';
import { upsertBrandProfile } from '../../../../lib/brand-profile-actions';
import ProfileForm from './ProfileForm';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function BrandProfilePage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: profileData }] = await Promise.all([
    db.from('brands')
      // COMPAT: select inline brief fields as fallback when brand_profiles row does not yet exist.
      // Remove brief field selection after data migration from brands → brand_profiles is confirmed complete.
      .select('id, name, core_values, content_themes, objectives, dislikes, tone_of_voice, competitors, products_services, target_audience, key_differentiators, brand_story')
      .eq('id', params.id)
      .maybeSingle(),
    db.from('brand_profiles').select('*').eq('brand_id', params.id).maybeSingle(),
  ]);

  if (!brandData) notFound();

  const brand = brandData as Brand;
  const profile = profileData as BrandProfile | null;

  const updateAction = upsertBrandProfile.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Brand profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Core identity information used across all content and agent workflows.
        </p>
      </div>

      <ProfileForm
        brandName={brand.name}
        profile={profile}
        brandFallback={brand}
        updateAction={updateAction}
      />
    </div>
  );
}
