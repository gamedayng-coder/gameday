'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createPolicy(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const title = (formData.get('title') as string | null)?.trim();
  const category = ((formData.get('category') as string | null)?.trim()) || 'general';
  const body = (formData.get('body') as string | null)?.trim();

  if (!title || !body) return;

  const db = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await db.from('brand_policies').insert({
    id: randomUUID(),
    brand_id: brandId,
    title,
    category,
    body,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/policies`);
}

export async function updatePolicy(
  brandId: string,
  policyId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const title = (formData.get('title') as string | null)?.trim();
  const category = (formData.get('category') as string | null)?.trim();
  const body = (formData.get('body') as string | null)?.trim();
  const is_active = formData.get('is_active');

  if (title) patch.title = title;
  if (category) patch.category = category;
  if (body) patch.body = body;
  if (is_active !== null) patch.is_active = is_active === 'true';

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_policies')
    .update(patch)
    .eq('id', policyId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/policies`);
}

export async function deletePolicy(brandId: string, policyId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_policies')
    .delete()
    .eq('id', policyId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/policies`);
}
