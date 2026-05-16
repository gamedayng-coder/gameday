'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import type { SocialInteractionStatus } from '../db/schema';

export async function updateInteractionStatus(
  brandId: string,
  interactionId: string,
  status: SocialInteractionStatus,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('social_interactions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', interactionId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/inbox/social`);
  revalidatePath(`/brands/${brandId}/inbox/social/${interactionId}`);
}

// Product workflow: link a social interaction to an existing or new conversation thread.
// This is a deliberate UI action, not an automatic schema behavior.
export async function linkInteractionToThread(
  brandId: string,
  interactionId: string,
  threadId: string,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('social_interactions')
    .update({ linked_thread_id: threadId, updated_at: new Date().toISOString() })
    .eq('id', interactionId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/inbox/social/${interactionId}`);
}
