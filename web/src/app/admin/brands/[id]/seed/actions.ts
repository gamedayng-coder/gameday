'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getUser } from '../../../../../lib/supabase/server';
import {
  seedDemoProfile,
  seedDemoVoice,
  seedDemoTemplates,
  seedDemoAutomation,
  seedDemoDataSource,
  seedAllDemo,
} from '../../../../../lib/seed/demo';

async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

function revalidate(brandId: string) {
  revalidatePath(`/admin/brands/${brandId}/seed`);
}

export async function seedProfile(brandId: string) {
  await requireUser();
  await seedDemoProfile(brandId);
  revalidate(brandId);
}

export async function seedVoice(brandId: string) {
  await requireUser();
  await seedDemoVoice(brandId);
  revalidate(brandId);
}

export async function seedTemplates(brandId: string) {
  await requireUser();
  await seedDemoTemplates(brandId);
  revalidate(brandId);
}

export async function seedAutomation(brandId: string) {
  await requireUser();
  await seedDemoAutomation(brandId);
  revalidate(brandId);
}

export async function seedDataSource(brandId: string) {
  await requireUser();
  await seedDemoDataSource(brandId);
  revalidate(brandId);
}

export async function seedAll(brandId: string) {
  await requireUser();
  await seedAllDemo(brandId);
  revalidate(brandId);
}
