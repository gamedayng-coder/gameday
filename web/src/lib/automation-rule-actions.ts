'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUser } from './supabase/server';
import { createSupabaseServiceClient } from './supabase/service';
import {
  SOURCE_TYPE_BY_TRIGGER,
  TRIGGER_TYPES,
  type TriggerType,
} from './automation-rule-constants';

const ALLOWED_TRIGGER_TYPES = new Set(TRIGGER_TYPES.map((t) => t.value));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildConfig(formData: FormData, triggerType: TriggerType): Record<string, unknown> {
  const cfg: Record<string, unknown> = {};

  const competitionId = (formData.get('config_competition_id') as string | null)?.trim();
  // Only store competition_id when it looks like a UUID (dropdown value) or is non-empty (text fallback)
  if (competitionId && UUID_RE.test(competitionId)) cfg.competition_id = competitionId;

  const outputContentType = (formData.get('config_output_content_type') as string | null)?.trim();
  if (outputContentType) cfg.output_content_type = outputContentType;

  if (triggerType === 'fixture_scheduled') {
    const raw = formData.get('config_hours_before_kickoff');
    if (raw !== null && raw !== '') cfg.hours_before_kickoff = Number(raw);
  }

  if (triggerType === 'standings_updated') {
    const raw = formData.get('config_lookback_hours');
    if (raw !== null && raw !== '') cfg.lookback_hours = Number(raw);
  }

  return cfg;
}

export async function createAutomationRule(brandId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect('/login');

  const name = (formData.get('name') as string | null)?.trim();
  const trigger_type = (formData.get('trigger_type') as string | null)?.trim() as TriggerType | undefined;
  const template_id = (formData.get('template_id') as string | null) || null;

  if (!name || !trigger_type || !ALLOWED_TRIGGER_TYPES.has(trigger_type)) return;

  const source_type = SOURCE_TYPE_BY_TRIGGER[trigger_type];
  const config = buildConfig(formData, trigger_type);

  const db = createSupabaseServiceClient();

  const { data: rule } = await db
    .from('content_automation_rules')
    .insert({
      brand_id: brandId,
      name,
      trigger_type,
      source_type,
      template_id,
      config,
      is_active: false,
    })
    .select('id')
    .single();

  if (!rule) return;

  revalidatePath(`/brands/${brandId}/automation/rules`);
  redirect(`/brands/${brandId}/automation/rules/${rule.id}`);
}

export async function updateAutomationRule(
  brandId: string,
  ruleId: string,
  formData: FormData,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: existing } = await db
    .from('content_automation_rules')
    .select('id')
    .eq('id', ruleId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!existing) return;

  const name = (formData.get('name') as string | null)?.trim();
  const trigger_type = (formData.get('trigger_type') as string | null)?.trim() as TriggerType | undefined;
  const template_id = (formData.get('template_id') as string | null) || null;

  if (!name || !trigger_type || !ALLOWED_TRIGGER_TYPES.has(trigger_type)) return;

  const source_type = SOURCE_TYPE_BY_TRIGGER[trigger_type];
  const config = buildConfig(formData, trigger_type);

  await db
    .from('content_automation_rules')
    .update({
      name,
      trigger_type,
      source_type,
      config,
      template_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ruleId)
    .eq('brand_id', brandId);

  revalidatePath(`/brands/${brandId}/automation/rules/${ruleId}`);
  revalidatePath(`/brands/${brandId}/automation/rules`);
}

export async function setRuleActive(
  brandId: string,
  ruleId: string,
  isActive: boolean,
) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const { data: existing } = await db
    .from('content_automation_rules')
    .select('id')
    .eq('id', ruleId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!existing) return;

  await db
    .from('content_automation_rules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', ruleId)
    .eq('brand_id', brandId);

  revalidatePath(`/brands/${brandId}/automation/rules/${ruleId}`);
  revalidatePath(`/brands/${brandId}/automation/rules`);
}
