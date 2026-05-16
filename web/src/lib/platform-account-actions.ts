'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createPlatformAccount(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const platform = (formData.get('platform') as string | null)?.trim();
  const account_name = (formData.get('account_name') as string | null)?.trim();
  if (!platform || !account_name) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('platform_accounts')
    .insert({
      id: randomUUID(),
      brand_id: brandId,
      platform,
      account_name,
      account_handle: (formData.get('account_handle') as string | null)?.trim() || null,
      external_account_id: (formData.get('external_account_id') as string | null)?.trim() || null,
      credential_id: (formData.get('credential_id') as string | null)?.trim() || null,
      is_primary: formData.get('is_primary') === 'true',
      is_active: true,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/settings/accounts`);
  redirect(`/brands/${brandId}/settings/accounts`);
}

export async function updatePlatformAccount(
  brandId: string,
  accountId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('platform_accounts')
    .update({
      account_name: (formData.get('account_name') as string | null)?.trim() || undefined,
      account_handle: (formData.get('account_handle') as string | null)?.trim() || null,
      external_account_id: (formData.get('external_account_id') as string | null)?.trim() || null,
      credential_id: (formData.get('credential_id') as string | null)?.trim() || null,
      is_primary: formData.get('is_primary') === 'true' ? true : formData.get('is_primary') === 'false' ? false : undefined,
      is_active: formData.get('is_active') === 'true' ? true : formData.get('is_active') === 'false' ? false : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/settings/accounts`);
}

export async function deletePlatformAccount(brandId: string, accountId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('platform_accounts')
    .delete()
    .eq('id', accountId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/settings/accounts`);
  redirect(`/brands/${brandId}/settings/accounts`);
}
