'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

const PROFILE_FIELDS = [
  'core_values', 'content_themes', 'objectives', 'dislikes', 'tone_of_voice',
  'competitors', 'products_services', 'target_audience', 'key_differentiators',
  'brand_story', 'industry', 'website',
] as const;

export async function upsertBrandProfile(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  // Update brand name in brands table
  const name = (formData.get('name') as string | null)?.trim();
  if (name) {
    const { error: nameError } = await db
      .from('brands')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', brandId);
    if (nameError) throw new Error(nameError.message);
  }

  // Upsert brief fields into brand_profiles
  const patch: Record<string, unknown> = {
    brand_id: brandId,
    updated_at: new Date().toISOString(),
  };
  for (const field of PROFILE_FIELDS) {
    const val = formData.get(field);
    if (val !== null) {
      patch[field] = (val as string).trim() || null;
    }
  }

  const rawHandles = (formData.get('social_handles') as string | null)?.trim();
  if (rawHandles) {
    try {
      patch.social_handles = JSON.parse(rawHandles);
    } catch {
      patch.social_handles = {};
    }
  }

  const { error } = await db
    .from('brand_profiles')
    .upsert({ id: randomUUID(), ...patch }, { onConflict: 'brand_id' });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/profile`);
  revalidatePath(`/brands/${brandId}`);
}
