'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import type { EnquiryStatus } from '../db/schema';

export async function createEnquiry(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const channel = (formData.get('channel') as string | null)?.trim();
  if (!channel) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('enquiries')
    .insert({
      id: randomUUID(),
      brand_id: brandId,
      customer_record_id: (formData.get('customer_record_id') as string | null)?.trim() || null,
      channel,
      subject: (formData.get('subject') as string | null)?.trim() || null,
      message_body: (formData.get('message_body') as string | null)?.trim() || null,
      enquiry_type: (formData.get('enquiry_type') as string | null)?.trim() || null,
      status: 'new',
      assigned_to_agent: user.email ?? user.id,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/inbox`);
  redirect(`/brands/${brandId}/inbox/${data.id}`);
}

export async function updateEnquiry(
  brandId: string,
  enquiryId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('enquiries')
    .update({
      subject: (formData.get('subject') as string | null)?.trim() || null,
      enquiry_type: (formData.get('enquiry_type') as string | null)?.trim() || null,
      customer_record_id: (formData.get('customer_record_id') as string | null)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enquiryId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/inbox`);
  revalidatePath(`/brands/${brandId}/inbox/${enquiryId}`);
}

export async function assignEnquiry(
  brandId: string,
  enquiryId: string,
  agentRef: string,
  status: EnquiryStatus = 'routed',
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('enquiries')
    .update({ assigned_to_agent: agentRef, status, updated_at: new Date().toISOString() })
    .eq('id', enquiryId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/inbox`);
  revalidatePath(`/brands/${brandId}/inbox/${enquiryId}`);
}

export async function closeEnquiry(brandId: string, enquiryId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('enquiries')
    .update({
      status: 'closed',
      handled_by_agent: user.email ?? user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enquiryId)
    .eq('brand_id', brandId)
    .not('status', 'eq', 'closed');
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/inbox`);
  revalidatePath(`/brands/${brandId}/inbox/${enquiryId}`);
}
