'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getUser } from '../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../lib/supabase/service';

const DEMO_EMAIL = 'demo@gamedayng.com';
const DEMO_PASSWORD = 'GameDay2026!';

export type DemoUserResult =
  | { status: 'created'; userId: string }
  | { status: 'reset'; userId: string }
  | { status: 'error'; message: string };

export async function getDemoUserState(): Promise<{ exists: boolean; userId?: string; emailConfirmed?: boolean }> {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const { data: { users }, error } = await db.auth.admin.listUsers();
  if (error) return { exists: false };

  const found = users.find((u) => u.email === DEMO_EMAIL);
  return found
    ? { exists: true, userId: found.id, emailConfirmed: !!found.email_confirmed_at }
    : { exists: false };
}

export async function ensureDemoUser(): Promise<DemoUserResult> {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: { users }, error: listErr } = await db.auth.admin.listUsers();
  if (listErr) return { status: 'error', message: listErr.message };

  const existing = users.find((u) => u.email === DEMO_EMAIL);

  if (existing) {
    const { error } = await db.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
    });
    if (error) return { status: 'error', message: error.message };
    revalidatePath('/admin/auth');
    return { status: 'reset', userId: existing.id };
  }

  const { data, error: createErr } = await db.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (createErr) return { status: 'error', message: createErr.message };
  revalidatePath('/admin/auth');
  return { status: 'created', userId: data.user.id };
}
