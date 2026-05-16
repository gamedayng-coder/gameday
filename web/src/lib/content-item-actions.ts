'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import type { ContentItemStatus } from '../db/schema';

const FIELDS = [
  'content_type', 'platform', 'title', 'body',
  'source_type', 'source_ref', 'campaign_name',
] as const;

export async function createContentItem(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const content_type = (formData.get('content_type') as string | null)?.trim();
  if (!content_type) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('content_items')
    .insert({
      id: randomUUID(),
      brand_id: brandId,
      content_type,
      platform: (formData.get('platform') as string | null)?.trim() || null,
      title: (formData.get('title') as string | null)?.trim() || null,
      body: (formData.get('body') as string | null)?.trim() || null,
      status: 'draft',
      source_type: (formData.get('source_type') as string | null)?.trim() || 'manual',
      source_ref: (formData.get('source_ref') as string | null)?.trim() || null,
      campaign_name: (formData.get('campaign_name') as string | null)?.trim() || null,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/content`);
  redirect(`/brands/${brandId}/content/${data.id}`);
}

export async function updateContentItem(
  brandId: string,
  itemId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of FIELDS) {
    const val = formData.get(field);
    if (val !== null) {
      patch[field] = (val as string).trim() || null;
    }
  }

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('content_items')
    .update(patch)
    .eq('id', itemId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/content`);
  revalidatePath(`/brands/${brandId}/content/${itemId}`);
  revalidatePath(`/brands/${brandId}/content/${itemId}/edit`);
}

export async function updateContentItemStatus(
  brandId: string,
  itemId: string,
  status: ContentItemStatus,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('content_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/content`);
  revalidatePath(`/brands/${brandId}/content/${itemId}`);
  revalidatePath(`/brands/${brandId}/content/reviews`);
}

export async function deleteContentItem(brandId: string, itemId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('content_items')
    .delete()
    .eq('id', itemId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/content`);
  redirect(`/brands/${brandId}/content`);
}
