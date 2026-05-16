'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

export async function createReplyDraft(
  brandId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const draft_text = (formData.get('draft_text') as string | null)?.trim();
  const reply_channel = (formData.get('reply_channel') as string | null)?.trim();
  if (!draft_text || !reply_channel) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { error } = await db.from('reply_drafts').insert({
    id: randomUUID(),
    brand_id: brandId,
    thread_id: (formData.get('thread_id') as string | null)?.trim() || null,
    social_interaction_id: (formData.get('social_interaction_id') as string | null)?.trim() || null,
    draft_text,
    reply_channel,
    status: 'draft',
    created_by_agent: user.email ?? user.id,
    metadata: {},
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);

  const enquiryId = (formData.get('enquiry_id') as string | null)?.trim();
  const interactionId = (formData.get('social_interaction_id') as string | null)?.trim();
  if (enquiryId) revalidatePath(`/brands/${brandId}/inbox/${enquiryId}`);
  if (interactionId) revalidatePath(`/brands/${brandId}/inbox/social/${interactionId}`);
}

export async function updateReplyDraft(
  brandId: string,
  draftId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('reply_drafts')
    .update({
      draft_text: (formData.get('draft_text') as string | null)?.trim() || undefined,
      reply_channel: (formData.get('reply_channel') as string | null)?.trim() || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('brand_id', brandId)
    .in('status', ['draft', 'in_review']);
  if (error) throw new Error(error.message);

  const enquiryId = (formData.get('enquiry_id') as string | null)?.trim();
  const interactionId = (formData.get('social_interaction_id') as string | null)?.trim();
  if (enquiryId) revalidatePath(`/brands/${brandId}/inbox/${enquiryId}`);
  if (interactionId) revalidatePath(`/brands/${brandId}/inbox/social/${interactionId}`);
}

export async function approveReplyDraft(brandId: string, draftId: string, enquiryId?: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('reply_drafts')
    .update({
      status: 'approved',
      approved_by_agent: user.email ?? user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('brand_id', brandId)
    .eq('status', 'in_review');
  if (error) throw new Error(error.message);

  if (enquiryId) revalidatePath(`/brands/${brandId}/inbox/${enquiryId}`);
}

export async function discardReplyDraft(brandId: string, draftId: string, enquiryId?: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('reply_drafts')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('brand_id', brandId)
    .in('status', ['draft', 'in_review']);
  if (error) throw new Error(error.message);

  if (enquiryId) revalidatePath(`/brands/${brandId}/inbox/${enquiryId}`);
}
