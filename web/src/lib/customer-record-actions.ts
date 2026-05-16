'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createCustomerRecord(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('customer_records')
    .insert({
      id: randomUUID(),
      brand_id: brandId,
      full_name: (formData.get('full_name') as string | null)?.trim() || null,
      email: (formData.get('email') as string | null)?.trim() || null,
      phone: (formData.get('phone') as string | null)?.trim() || null,
      notes: (formData.get('notes') as string | null)?.trim() || null,
      booking_count: 0,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/customers`);
  redirect(`/brands/${brandId}/customers/${data.id}`);
}

export async function updateCustomerRecord(
  brandId: string,
  customerId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('customer_records')
    .update({
      full_name: (formData.get('full_name') as string | null)?.trim() || null,
      email: (formData.get('email') as string | null)?.trim() || null,
      phone: (formData.get('phone') as string | null)?.trim() || null,
      notes: (formData.get('notes') as string | null)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/customers`);
  revalidatePath(`/brands/${brandId}/customers/${customerId}`);
}
