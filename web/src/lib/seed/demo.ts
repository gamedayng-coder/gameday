'use server';

import { randomUUID } from 'crypto';
import { createSupabaseServiceClient } from '../supabase/service';
import {
  DEMO_PROFILE,
  DEMO_VOICE,
  DEMO_TEMPLATES,
  DEMO_AUTOMATION_RULE,
  DEMO_DATA_SOURCE,
} from './fixtures';

export type SeedCategory = 'profile' | 'voice' | 'templates' | 'automation' | 'dataSource';

export type SeedResult = {
  category: SeedCategory;
  skipped: boolean;
  reason?: string;
};

// ── Seed functions ─────────────────────────────────────────────────────

export async function seedDemoProfile(brandId: string): Promise<SeedResult> {
  const db = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const { error } = await db.from('brand_profiles').upsert(
    {
      id: randomUUID(),
      brand_id: brandId,
      ...DEMO_PROFILE,
      updated_at: now,
    },
    { onConflict: 'brand_id' },
  );

  if (error) throw new Error(`seedDemoProfile: ${error.message}`);
  return { category: 'profile', skipped: false };
}

export async function seedDemoVoice(brandId: string): Promise<SeedResult> {
  const db = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const { error } = await db.from('brand_voice').upsert(
    {
      id: randomUUID(),
      brand_id: brandId,
      ...DEMO_VOICE,
      updated_at: now,
    },
    { onConflict: 'brand_id' },
  );

  if (error) throw new Error(`seedDemoVoice: ${error.message}`);
  return { category: 'voice', skipped: false };
}

export async function seedDemoTemplates(brandId: string): Promise<SeedResult> {
  const db = createSupabaseServiceClient();

  // Idempotent: skip if demo templates already exist for this brand
  const { count } = await db
    .from('brand_templates')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .like('name', '[Demo]%');

  if ((count ?? 0) > 0) {
    return { category: 'templates', skipped: true, reason: 'demo templates already present' };
  }

  const rows = DEMO_TEMPLATES.map((t) => ({
    id: randomUUID(),
    brand_id: brandId,
    ...t,
  }));

  const { error } = await db.from('brand_templates').insert(rows);
  if (error) throw new Error(`seedDemoTemplates: ${error.message}`);
  return { category: 'templates', skipped: false };
}

export async function seedDemoAutomation(brandId: string): Promise<SeedResult> {
  const db = createSupabaseServiceClient();

  const { count } = await db
    .from('content_automation_rules')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .like('name', '[Demo]%');

  if ((count ?? 0) > 0) {
    return { category: 'automation', skipped: true, reason: 'demo automation rule already present' };
  }

  const { error } = await db.from('content_automation_rules').insert({
    brand_id: brandId,
    ...DEMO_AUTOMATION_RULE,
    metadata: {},
  });

  if (error) throw new Error(`seedDemoAutomation: ${error.message}`);
  return { category: 'automation', skipped: false };
}

export async function seedDemoDataSource(brandId: string): Promise<SeedResult> {
  const db = createSupabaseServiceClient();

  const { count } = await db
    .from('data_sources')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .like('name', '[Demo]%');

  if ((count ?? 0) > 0) {
    return { category: 'dataSource', skipped: true, reason: 'demo data source already present' };
  }

  const { error } = await db.from('data_sources').insert({
    brand_id: brandId,
    ...DEMO_DATA_SOURCE,
    priority: 0,
    is_primary: false,
    config: {},
    metadata: {},
  });

  if (error) throw new Error(`seedDemoDataSource: ${error.message}`);
  return { category: 'dataSource', skipped: false };
}

// ── Seed all categories ────────────────────────────────────────────────

export async function seedAllDemo(brandId: string): Promise<SeedResult[]> {
  return Promise.all([
    seedDemoProfile(brandId),
    seedDemoVoice(brandId),
    seedDemoTemplates(brandId),
    seedDemoAutomation(brandId),
    seedDemoDataSource(brandId),
  ]);
}

// ── Current seed state (for the admin seed page) ───────────────────────

export type SeedState = {
  profile: boolean;
  voice: boolean;
  templates: number;
  automation: number;
  dataSource: number;
};

export async function getDemoSeedState(brandId: string): Promise<SeedState> {
  const db = createSupabaseServiceClient();

  const [profile, voice, templates, automation, dataSource] = await Promise.all([
    db.from('brand_profiles').select('id', { count: 'exact', head: true }).eq('brand_id', brandId),
    db.from('brand_voice').select('id', { count: 'exact', head: true }).eq('brand_id', brandId),
    db
      .from('brand_templates')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .like('name', '[Demo]%'),
    db
      .from('content_automation_rules')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .like('name', '[Demo]%'),
    db
      .from('data_sources')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .like('name', '[Demo]%'),
  ]);

  return {
    profile: (profile.count ?? 0) > 0,
    voice: (voice.count ?? 0) > 0,
    templates: templates.count ?? 0,
    automation: automation.count ?? 0,
    dataSource: dataSource.count ?? 0,
  };
}
