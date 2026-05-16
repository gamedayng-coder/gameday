'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import type { CadenceType } from '../db/schema';

export async function createSchedule(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const platform = (formData.get('platform') as string | null)?.trim();
  const name = (formData.get('name') as string | null)?.trim();
  const cadence_type = (formData.get('cadence_type') as CadenceType | null);
  if (!platform || !name || !cadence_type) return;

  const now = new Date().toISOString();
  const db = createSupabaseServiceClient();
  const { data, error } = await db
    .from('publishing_schedules')
    .insert({
      id: randomUUID(),
      brand_id: brandId,
      platform,
      name,
      timezone: (formData.get('timezone') as string | null)?.trim() || 'Europe/London',
      cadence_type,
      recurrence_rule: (formData.get('recurrence_rule') as string | null)?.trim() || null,
      preferred_times: [],
      content_types: [],
      is_active: true,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/publishing/schedules`);
  redirect(`/brands/${brandId}/publishing/schedules/${data.id}`);
}

export async function updateSchedule(
  brandId: string,
  scheduleId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('publishing_schedules')
    .update({
      name: (formData.get('name') as string | null)?.trim() || undefined,
      platform: (formData.get('platform') as string | null)?.trim() || undefined,
      timezone: (formData.get('timezone') as string | null)?.trim() || undefined,
      cadence_type: (formData.get('cadence_type') as CadenceType | null) || undefined,
      recurrence_rule: (formData.get('recurrence_rule') as string | null)?.trim() || null,
      is_active: formData.get('is_active') === 'true' ? true : formData.get('is_active') === 'false' ? false : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/publishing/schedules`);
  revalidatePath(`/brands/${brandId}/publishing/schedules/${scheduleId}`);
}

export async function deleteSchedule(brandId: string, scheduleId: string) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('publishing_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('brand_id', brandId);
  if (error) throw new Error(error.message);

  revalidatePath(`/brands/${brandId}/publishing/schedules`);
  redirect(`/brands/${brandId}/publishing/schedules`);
}
