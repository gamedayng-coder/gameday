'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function upsertCredential(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const platform = (formData.get('platform') as string | null)?.trim();
  const credential_type = (formData.get('credential_type') as string | null)?.trim();
  if (!platform || !credential_type) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('credentials')
    .upsert(
      {
        id: randomUUID(),
        brand_id: brandId,
        platform,
        credential_type,
        account_identifier: (formData.get('account_identifier') as string | null)?.trim() || null,
        secret_ref: (formData.get('secret_ref') as string | null)?.trim() || null,
        status: 'active',
        metadata: {},
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'brand_id,platform,credential_type,account_identifier' },
    );
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/settings/credentials`);
}

export async function deleteCredential(brandId: string, credentialId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('credentials')
    .delete()
    .eq('id', credentialId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/settings/credentials`);
}
