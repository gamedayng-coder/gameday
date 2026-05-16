#!/usr/bin/env node
/**
 * Seed demo fixtures into a brand.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-brand.ts <brandId>
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: re-running is safe. Profile and voice are upserted;
 * templates, automation rules, and data sources are skipped if [Demo]
 * entries already exist for this brand.
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  DEMO_PROFILE,
  DEMO_VOICE,
  DEMO_TEMPLATES,
  DEMO_AUTOMATION_RULE,
  DEMO_DATA_SOURCE,
} from '../src/lib/seed/fixtures';

const brandId = process.argv[2];
if (!brandId) {
  console.error('Usage: npx tsx scripts/seed-demo-brand.ts <brandId>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

function ok(category: string) {
  console.log(`  ✓ ${category}`);
}
function skipped(category: string, reason: string) {
  console.log(`  – ${category} (skipped: ${reason})`);
}
function fail(category: string, err: unknown) {
  console.error(`  ✗ ${category}:`, err);
}

async function run() {
  console.log(`Seeding demo fixtures for brand ${brandId}...\n`);
  const now = new Date().toISOString();

  // Profile (upsert — always applies latest fixture)
  try {
    const { error } = await db.from('brand_profiles').upsert(
      { id: randomUUID(), brand_id: brandId, ...DEMO_PROFILE, updated_at: now },
      { onConflict: 'brand_id' },
    );
    if (error) throw error;
    ok('profile');
  } catch (e) {
    fail('profile', e);
  }

  // Voice (upsert)
  try {
    const { error } = await db.from('brand_voice').upsert(
      { id: randomUUID(), brand_id: brandId, ...DEMO_VOICE, updated_at: now },
      { onConflict: 'brand_id' },
    );
    if (error) throw error;
    ok('voice');
  } catch (e) {
    fail('voice', e);
  }

  // Templates
  try {
    const { count } = await db
      .from('brand_templates')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .like('name', '[Demo]%');
    if ((count ?? 0) > 0) {
      skipped('templates', 'demo templates already present');
    } else {
      const rows = DEMO_TEMPLATES.map((t) => ({ id: randomUUID(), brand_id: brandId, ...t }));
      const { error } = await db.from('brand_templates').insert(rows);
      if (error) throw error;
      ok('templates');
    }
  } catch (e) {
    fail('templates', e);
  }

  // Automation rule
  try {
    const { count } = await db
      .from('content_automation_rules')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .like('name', '[Demo]%');
    if ((count ?? 0) > 0) {
      skipped('automation', 'demo rule already present');
    } else {
      const { error } = await db
        .from('content_automation_rules')
        .insert({ brand_id: brandId, ...DEMO_AUTOMATION_RULE, metadata: {} });
      if (error) throw error;
      ok('automation');
    }
  } catch (e) {
    fail('automation', e);
  }

  // Data source
  try {
    const { count } = await db
      .from('data_sources')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .like('name', '[Demo]%');
    if ((count ?? 0) > 0) {
      skipped('dataSource', 'demo source already present');
    } else {
      const { error } = await db.from('data_sources').insert({
        brand_id: brandId,
        ...DEMO_DATA_SOURCE,
        priority: 0,
        is_primary: false,
        config: {},
        metadata: {},
      });
      if (error) throw error;
      ok('dataSource');
    }
  } catch (e) {
    fail('dataSource', e);
  }

  console.log('\nDone.');
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
