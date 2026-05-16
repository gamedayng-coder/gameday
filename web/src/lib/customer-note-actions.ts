'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createNote(
  brandId: string,
  customerId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const note_text = (formData.get('note_text') as string | null)?.trim();
  if (!note_text) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { error } = await db.from('customer_notes').insert({
    id: randomUUID(),
    customer_record_id: customerId,
    note_text,
    created_by_agent: user.email ?? user.id,
    is_internal: true,
    metadata: {},
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/customers/${customerId}`);
}

export async function deleteNote(brandId: string, customerId: string, noteId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('customer_notes')
    .delete()
    .eq('id', noteId)
    .eq('customer_record_id', customerId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/customers/${customerId}`);
}
