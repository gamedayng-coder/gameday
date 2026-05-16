'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';

// ── Knowledge items ────────────────────────────────────────────────────────────

export async function createKnowledgeItem(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const title = (formData.get('title') as string | null)?.trim();
  const body = (formData.get('body') as string | null)?.trim();
  if (!title || !body) return;

  const category = ((formData.get('category') as string | null)?.trim()) || 'general';
  const rawTags = (formData.get('tags') as string | null)?.trim() || '';
  const tags = rawTags
    ? rawTags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const db = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await db.from('brand_knowledge_items').insert({
    id: randomUUID(),
    brand_id: brandId,
    title,
    body,
    category,
    tags,
    source: (formData.get('source') as string | null)?.trim() || null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/knowledge`);
  redirect(`/brands/${brandId}/knowledge`);
}

export async function updateKnowledgeItem(
  brandId: string,
  itemId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const rawTags = (formData.get('tags') as string | null)?.trim() || '';
  const tags = rawTags
    ? rawTags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_knowledge_items')
    .update({
      title: (formData.get('title') as string | null)?.trim() || undefined,
      body: (formData.get('body') as string | null)?.trim() || undefined,
      category: (formData.get('category') as string | null)?.trim() || 'general',
      tags,
      source: (formData.get('source') as string | null)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/knowledge`);
  revalidatePath(`/brands/${brandId}/knowledge/${itemId}`);
}

export async function deleteKnowledgeItem(brandId: string, itemId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_knowledge_items')
    .delete()
    .eq('id', itemId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/knowledge`);
  redirect(`/brands/${brandId}/knowledge`);
}

// ── Knowledge summaries ────────────────────────────────────────────────────────

export async function createSummary(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const title = (formData.get('title') as string | null)?.trim();
  const body = (formData.get('body') as string | null)?.trim();
  if (!title || !body) return;

  const rawIds = (formData.get('source_item_ids') as string | null)?.trim() || '';
  const source_item_ids = rawIds
    ? rawIds.split(',').map((id) => id.trim()).filter(Boolean)
    : [];

  const db = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await db.from('brand_knowledge_summaries').insert({
    id: randomUUID(),
    brand_id: brandId,
    title,
    body,
    source_item_ids,
    generated_at: null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/knowledge/summaries`);
  redirect(`/brands/${brandId}/knowledge/summaries`);
}

export async function updateSummary(
  brandId: string,
  summaryId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const rawIds = (formData.get('source_item_ids') as string | null)?.trim() || '';
  const source_item_ids = rawIds
    ? rawIds.split(',').map((id) => id.trim()).filter(Boolean)
    : [];

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_knowledge_summaries')
    .update({
      title: (formData.get('title') as string | null)?.trim() || undefined,
      body: (formData.get('body') as string | null)?.trim() || undefined,
      source_item_ids,
      updated_at: new Date().toISOString(),
    })
    .eq('id', summaryId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/knowledge/summaries`);
}

export async function deleteSummary(brandId: string, summaryId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brand_knowledge_summaries')
    .delete()
    .eq('id', summaryId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/knowledge/summaries`);
}
