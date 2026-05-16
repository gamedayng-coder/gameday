'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createAsset(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const asset_type = (formData.get('asset_type') as string | null)?.trim();
  const title = (formData.get('title') as string | null)?.trim();
  if (!asset_type || !title) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('creative_assets')
    .insert({
      id: randomUUID(),
      brand_id: brandId,
      content_item_id: (formData.get('content_item_id') as string | null)?.trim() || null,
      campaign_id: (formData.get('campaign_id') as string | null)?.trim() || null,
      asset_type,
      title,
      file_url: (formData.get('file_url') as string | null)?.trim() || null,
      file_path: (formData.get('file_path') as string | null)?.trim() || null,
      mime_type: (formData.get('mime_type') as string | null)?.trim() || null,
      generation_source: (formData.get('generation_source') as string | null)?.trim() || null,
      status: 'draft',
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/creative/assets`);
  redirect(`/brands/${brandId}/creative/assets/${data.id}`);
}

export async function updateAsset(
  brandId: string,
  assetId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('creative_assets')
    .update({
      title: (formData.get('title') as string | null)?.trim() || undefined,
      asset_type: (formData.get('asset_type') as string | null)?.trim() || undefined,
      file_url: (formData.get('file_url') as string | null)?.trim() || null,
      file_path: (formData.get('file_path') as string | null)?.trim() || null,
      mime_type: (formData.get('mime_type') as string | null)?.trim() || null,
      status: (formData.get('status') as string | null)?.trim() || undefined,
      campaign_id: (formData.get('campaign_id') as string | null)?.trim() || null,
      content_item_id: (formData.get('content_item_id') as string | null)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/creative/assets`);
  revalidatePath(`/brands/${brandId}/creative/assets/${assetId}`);
}

export async function deleteAsset(brandId: string, assetId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('creative_assets')
    .delete()
    .eq('id', assetId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/creative/assets`);
  redirect(`/brands/${brandId}/creative/assets`);
}
