#!/usr/bin/env node
/**
 * Create or reset the demo auth user in Supabase.
 *
 * Usage:
 *   npx tsx scripts/create-demo-user.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * If demo@gamedayng.com already exists its password is reset to GameDay2026!.
 * If it does not exist it is created with email confirmation suppressed.
 */

import { createClient } from '@supabase/supabase-js';

const DEMO_EMAIL = 'demo@gamedayng.com';
const DEMO_PASSWORD = 'GameDay2026!';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  console.log(`Checking for auth user ${DEMO_EMAIL}...\n`);

  // List all users and find the demo user (admin API paginates at 1000)
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }

  const existing = users.find((u) => u.email === DEMO_EMAIL);

  if (existing) {
    console.log(`User exists (id: ${existing.id}). Resetting password...`);
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
    });
    if (error) {
      console.error('Failed to reset password:', error.message);
      process.exit(1);
    }
    console.log(`\n  Password reset to GameDay2026!`);
  } else {
    console.log('User not found. Creating...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error('Failed to create user:', error.message);
      process.exit(1);
    }
    console.log(`\n  Created user (id: ${data.user.id})`);
  }

  console.log(`\nDone. Login at https://gameday-wheat.vercel.app/login`);
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
