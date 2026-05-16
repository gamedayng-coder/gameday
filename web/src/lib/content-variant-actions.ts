'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createVariant(
  brandId: string,
  itemId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const variant_label = (formData.get('variant_label') as string | null)?.trim();
  if (!variant_label) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { error } = await db.from('content_variants').insert({
    id: randomUUID(),
    content_item_id: itemId,
    variant_label,
    title: (formData.get('title') as string | null)?.trim() || null,
    body: (formData.get('body') as string | null)?.trim() || null,
    status: 'draft',
    metadata: {},
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/content/${itemId}`);
}

export async function updateVariant(
  brandId: string,
  itemId: string,
  variantId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('content_variants')
    .update({
      variant_label: (formData.get('variant_label') as string | null)?.trim() || undefined,
      title: (formData.get('title') as string | null)?.trim() || null,
      body: (formData.get('body') as string | null)?.trim() || null,
      status: (formData.get('status') as string | null)?.trim() || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', variantId)
    .eq('content_item_id', itemId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/content/${itemId}`);
  revalidatePath(`/brands/${brandId}/content/${itemId}/variants/${variantId}`);
}

export async function deleteVariant(
  brandId: string,
  itemId: string,
  variantId: string,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('content_variants')
    .delete()
    .eq('id', variantId)
    .eq('content_item_id', itemId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/content/${itemId}`);
  redirect(`/brands/${brandId}/content/${itemId}`);
}
