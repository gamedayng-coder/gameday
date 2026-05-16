'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

const VOICE_FIELDS = [
  'tone', 'style', 'platform_guidelines',
  'dos_and_donts', 'sample_copy', 'competitor_differentiation',
] as const;

export async function upsertBrandVoice(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const patch: Record<string, unknown> = {
    brand_id: brandId,
    updated_at: new Date().toISOString(),
  };
  for (const field of VOICE_FIELDS) {
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

  revalidatePath(`/brands/${brandId}/voice`);
}
