'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import type { DataSourceStatus } from '../db/schema';

export async function createDataSource(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const name          = (formData.get('name') as string | null)?.trim();
  const source_type   = (formData.get('source_type') as string | null)?.trim();
  const provider      = (formData.get('provider') as string | null)?.trim();
  const source_purpose = (formData.get('source_purpose') as string | null)?.trim() || null;
  const base_url      = (formData.get('base_url') as string | null)?.trim() || null;
  const credential_id = (formData.get('credential_id') as string | null) || null;

  if (!name || !source_type || !provider) return;

  const db = createSupabaseServiceClient();

  const { data: ds } = await db
    .from('data_sources')
    .insert({
      brand_id: brandId,
      name,
      source_type,
      source_purpose,
      provider,
      credential_id,
      base_url,
      status: 'draft',
    })
    .select('id')
    .single();

  if (!ds) return;

  revalidatePath(`/brands/${brandId}/data-sources`);
  redirect(`/brands/${brandId}/data-sources/${ds.id}`);
}

export async function updateDataSource(
  brandId: string,
  sourceId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: existing } = await db
    .from('data_sources')
    .select('id')
    .eq('id', sourceId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!existing) return;

  const name           = (formData.get('name') as string | null)?.trim();
  const source_purpose = (formData.get('source_purpose') as string | null)?.trim() || null;
  const base_url       = (formData.get('base_url') as string | null)?.trim() || null;
  const credential_id  = (formData.get('credential_id') as string | null) || null;
  const status         = (formData.get('status') as DataSourceStatus | null);

  if (!name) return;

  await db
    .from('data_sources')
    .update({
      name,
      source_purpose,
      base_url,
      credential_id,
      ...(status ? { status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)
    .eq('brand_id', brandId);

  revalidatePath(`/brands/${brandId}/data-sources/${sourceId}`);
  revalidatePath(`/brands/${brandId}/data-sources`);
}

export async function setDataSourceStatus(
  brandId: string,
  sourceId: string,
  status: DataSourceStatus,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: existing } = await db
    .from('data_sources')
    .select('id')
    .eq('id', sourceId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!existing) return;

  await db
    .from('data_sources')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', sourceId)
    .eq('brand_id', brandId);

  revalidatePath(`/brands/${brandId}/data-sources/${sourceId}`);
  revalidatePath(`/brands/${brandId}/data-sources`);
}

export async function triggerManualSync(brandId: string, sourceId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: existing } = await db
    .from('data_sources')
    .select('id', )
    .eq('id', sourceId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!existing) return;

  // Create a pending run row only — actual sync is worker-driven
  await db.from('data_source_runs').insert({
    brand_id:      brandId,
    data_source_id: sourceId,
    run_type:      'manual',
    status:        'pending',
    metadata:      {},
  });

  revalidatePath(`/brands/${brandId}/data-sources/${sourceId}`);
}
