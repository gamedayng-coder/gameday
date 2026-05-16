'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import type { ContentReviewStatus } from '../db/schema';

export async function createReview(
  brandId: string,
  itemId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const review_status = formData.get('review_status') as ContentReviewStatus | null;
  if (!review_status) return;

  const db = createSupabaseServiceClient();
  const { error } = await db.from('content_reviews').insert({
    id: randomUUID(),
    content_item_id: itemId,
    reviewer_agent: user.email ?? user.id,
    review_status,
    notes: (formData.get('notes') as string | null)?.trim() || null,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/content/${itemId}`);
  revalidatePath(`/brands/${brandId}/content/reviews`);
}
