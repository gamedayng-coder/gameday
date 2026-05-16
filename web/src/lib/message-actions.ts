'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

// Outbound messages only — inbound messages are written by the ingestion system.
export async function sendMessage(
  brandId: string,
  enquiryId: string,
  threadId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const message_text = (formData.get('message_text') as string | null)?.trim();
  if (!message_text) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { error } = await db.from('messages').insert({
    id: randomUUID(),
    thread_id: threadId,
    direction: 'outbound',
    message_text,
    sent_by_agent: user.email ?? user.id,
    sender_name: user.email ?? user.id,
    recipient_name: (formData.get('recipient_name') as string | null)?.trim() || null,
    recipient_address: (formData.get('recipient_address') as string | null)?.trim() || null,
    status: 'sent',
    sent_at: now,
    metadata: {},
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/inbox/${enquiryId}`);
}
