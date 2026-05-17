'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import { randomUUID } from 'crypto';

function toBaseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'brand';
}

async function generateUniqueSlug(db: ReturnType<typeof createSupabaseServiceClient>, name: string): Promise<string> {
  const base = toBaseSlug(name);
  const { data: existing } = await db
    .from('brands')
    .select('slug')
    .like('slug', `${base}%`);

  const taken = new Set((existing ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

export async function createBrand(formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return;

  const db = createSupabaseServiceClient();
  const slug = await generateUniqueSlug(db, name);
  const { data, error } = await db
    .from('brands')
    .insert({ id: randomUUID(), name, slug })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  redirect(`/brands/${data.id}`);
}

export async function updateBrandBrief(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const fields = [
    'name', 'core_values', 'content_themes', 'objectives', 'dislikes',
    'tone_of_voice', 'competitors', 'products_services', 'target_audience',
    'key_differentiators', 'brand_story',
  ] as const;

  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  for (const field of fields) {
    const val = formData.get(field);
    if (val !== null) {
      patch[field] = (val as string).trim() || null;
    }
  }

  const db = createSupabaseServiceClient();
  const { error } = await db.from('brands').update(patch).eq('id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}`);
}

export async function upsertBrandVoice(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const fields = [
    'tone', 'style', 'platform_guidelines',
    'dos_and_donts', 'sample_copy', 'competitor_differentiation',
  ] as const;

  const patch: Record<string, string | null> = {
    brand_id: brandId,
    updated_at: new Date().toISOString(),
  };
  for (const field of fields) {
    const val = formData.get(field);
    if (val !== null) {
      patch[field] = (val as string).trim() || null;
    }
  }

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_voice')
    .upsert({ id: randomUUID(), ...patch }, { onConflict: 'brand_id' });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}`);
}

export async function createBrandWithSetup(formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return;

  const industry = (formData.get('industry') as string | null)?.trim() || null;
  const website = (formData.get('website') as string | null)?.trim() || null;

  const db = createSupabaseServiceClient();
  const brandId = randomUUID();
  const slug = await generateUniqueSlug(db, name);

  const { error: brandError } = await db
    .from('brands')
    .insert({ id: brandId, name, slug });
  if (brandError) throw new Error(brandError.message);

  if (industry || website) {
    await db
      .from('brand_profiles')
      .insert({ id: randomUUID(), brand_id: brandId, industry, website });
  }

  redirect(`/brands/${brandId}/setup`);
}

export async function deleteBrand(brandId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db.from('brands').delete().eq('id', brandId);
  if (error) throw new Error(error.message);

  redirect('/brands');
}
