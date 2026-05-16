'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function updateSalesNotes(
  brandId: string,
  recordId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const notes = (formData.get('notes') as string | null)?.trim() || null;

  const db = createSupabaseServiceClient();
  await db
    .from('sales_records')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', recordId)
    .eq('brand_id', brandId);

  revalidatePath(`/brands/${brandId}/sales/${recordId}`);
}
