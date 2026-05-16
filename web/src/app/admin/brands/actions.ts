'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getUser } from '../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../lib/supabase/service';

export async function setBrandIsDemo(brandId: string, isDemo: boolean) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { error } = await db
    .from('brands')
    .update({ is_demo: isDemo, updated_at: new Date().toISOString() })
    .eq('id', brandId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/brands');
}
