'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import type { PostV2Status } from '../db/schema';

// Allowed manual status transitions for operator use via updatePost.
// System-managed statuses (publishing, published, cancelled, failed) are not
// reachable here — use cancelPost / retryPost / the scheduler for those.
const MANUAL_ALLOWED_FROM: Partial<Record<PostV2Status, PostV2Status[]>> = {
  draft:     ['queued'],
  queued:    ['draft', 'scheduled'],
  scheduled: ['queued'],
};

export async function createPost(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const platform = (formData.get('platform') as string | null)?.trim();
  if (!platform) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('posts')
    .insert({
      id: randomUUID(),
      brand_id: brandId,
      content_item_id: (formData.get('content_item_id') as string | null)?.trim() || null,
      platform,
      status: 'draft',
      approval_status: 'pending',
      scheduled_for: (formData.get('scheduled_for') as string | null)?.trim() || null,
      platform_account_id: (formData.get('platform_account_id') as string | null)?.trim() || null,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/publishing/queue`);
  redirect(`/brands/${brandId}/publishing/queue/${data.id}`);
}

export async function updatePost(brandId: string, postId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const requestedStatus = (formData.get('status') as PostV2Status | null) || undefined;

  if (requestedStatus !== undefined) {
    const allowedFrom = MANUAL_ALLOWED_FROM[requestedStatus];
    if (!allowedFrom) {
      throw new Error(`Status '${requestedStatus}' cannot be set via manual edit.`);
    }

    const db = createSupabaseServiceClient();
    const { error } = await db
      .from('posts')
      .update({
        platform: (formData.get('platform') as string | null)?.trim() || undefined,
        status: requestedStatus,
        scheduled_for: (formData.get('scheduled_for') as string | null)?.trim() || null,
        platform_account_id: (formData.get('platform_account_id') as string | null)?.trim() || null,
        content_item_id: (formData.get('content_item_id') as string | null)?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('brand_id', brandId)
      .in('status', allowedFrom);
    if (error) throw new Error(error.message);
  } else {
    const db = createSupabaseServiceClient();
    const { error } = await db
      .from('posts')
      .update({
        platform: (formData.get('platform') as string | null)?.trim() || undefined,
        scheduled_for: (formData.get('scheduled_for') as string | null)?.trim() || null,
        platform_account_id: (formData.get('platform_account_id') as string | null)?.trim() || null,
        content_item_id: (formData.get('content_item_id') as string | null)?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('brand_id', brandId);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/brands/${brandId}/publishing/queue`);
  revalidatePath(`/brands/${brandId}/publishing/queue/${postId}`);
}

export async function cancelPost(brandId: string, postId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('posts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('brand_id', brandId)
    .in('status', ['draft', 'queued', 'scheduled', 'failed']);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/publishing/queue`);
  revalidatePath(`/brands/${brandId}/publishing/queue/${postId}`);
}

export async function retryPost(brandId: string, postId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('posts')
    .update({ status: 'queued', error_message: null, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('brand_id', brandId)
    .eq('status', 'failed');
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/publishing/queue`);
  revalidatePath(`/brands/${brandId}/publishing/queue/${postId}`);
}
