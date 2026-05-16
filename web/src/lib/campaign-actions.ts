'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createCampaign(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('campaigns')
    .insert({
      id: randomUUID(),
      brand_id: brandId,
      name,
      objective: (formData.get('objective') as string | null)?.trim() || null,
      description: (formData.get('description') as string | null)?.trim() || null,
      status: 'draft',
      start_date: (formData.get('start_date') as string | null)?.trim() || null,
      end_date: (formData.get('end_date') as string | null)?.trim() || null,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/creative`);
  redirect(`/brands/${brandId}/creative/campaigns/${data.id}`);
}

export async function updateCampaign(
  brandId: string,
  campaignId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('campaigns')
    .update({
      name: (formData.get('name') as string | null)?.trim() || undefined,
      objective: (formData.get('objective') as string | null)?.trim() || null,
      description: (formData.get('description') as string | null)?.trim() || null,
      status: (formData.get('status') as string | null)?.trim() || undefined,
      start_date: (formData.get('start_date') as string | null)?.trim() || null,
      end_date: (formData.get('end_date') as string | null)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/creative`);
  revalidatePath(`/brands/${brandId}/creative/campaigns/${campaignId}`);
}

export async function deleteCampaign(brandId: string, campaignId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/creative`);
  redirect(`/brands/${brandId}/creative`);
}
