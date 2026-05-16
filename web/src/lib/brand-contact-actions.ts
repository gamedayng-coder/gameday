'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createContact(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return;

  const db = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await db.from('brand_staff_contacts').insert({
    id: randomUUID(),
    brand_id: brandId,
    name,
    role: (formData.get('role') as string | null)?.trim() || null,
    email: (formData.get('email') as string | null)?.trim() || null,
    phone: (formData.get('phone') as string | null)?.trim() || null,
    notes: (formData.get('notes') as string | null)?.trim() || null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/contacts`);
}

export async function updateContact(
  brandId: string,
  contactId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_staff_contacts')
    .update({
      name: (formData.get('name') as string | null)?.trim() || undefined,
      role: (formData.get('role') as string | null)?.trim() || null,
      email: (formData.get('email') as string | null)?.trim() || null,
      phone: (formData.get('phone') as string | null)?.trim() || null,
      notes: (formData.get('notes') as string | null)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/contacts`);
}

export async function deleteContact(brandId: string, contactId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_staff_contacts')
    .delete()
    .eq('id', contactId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/contacts`);
}
