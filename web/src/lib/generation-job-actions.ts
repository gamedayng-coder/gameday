'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createJob(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const target_asset_type = (formData.get('target_asset_type') as string | null)?.trim();
  if (!target_asset_type) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('creative_generation_jobs')
    .insert({
      id: randomUUID(),
      brand_id: brandId,
      content_item_id: (formData.get('content_item_id') as string | null)?.trim() || null,
      campaign_id: (formData.get('campaign_id') as string | null)?.trim() || null,
      target_asset_type,
      prompt_text: (formData.get('prompt_text') as string | null)?.trim() || null,
      tool_name: (formData.get('tool_name') as string | null)?.trim() || null,
      status: 'pending',
      requested_by_agent: user.email ?? user.id,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/creative/jobs`);
  redirect(`/brands/${brandId}/creative/jobs/${data.id}`);
}

export async function cancelJob(brandId: string, jobId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('creative_generation_jobs')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('brand_id', brandId)
    .in('status', ['pending', 'blocked']); // only cancel non-active jobs
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/creative/jobs`);
  revalidatePath(`/brands/${brandId}/creative/jobs/${jobId}`);
}
