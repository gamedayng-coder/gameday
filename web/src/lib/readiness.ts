import { createSupabaseServiceClient } from './supabase/service';

export interface CheckResult {
  pass: boolean;
  value: number;
}

export type ReadinessScope = 'publishing' | 'draft';

export interface BrandReadiness {
  isReady: boolean;
  checks: {
    brandExists: CheckResult;
    profileComplete: CheckResult;
    voiceConfigured: CheckResult;
    templatePresent: CheckResult;
    credentialConnected: CheckResult;
    platformAccountActive: CheckResult | null; // null when scope = 'draft'
    usageBudgetSet: CheckResult;
    dataSourceConnected: CheckResult;
    automationRulesActive: CheckResult;
    contentAttempted: CheckResult;
  };
}

export async function computeBrandReadiness(
  brandId: string,
  scope: ReadinessScope = 'publishing',
): Promise<BrandReadiness> {
  const db = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const [
    brandResult,
    profileResult,
    voiceResult,
    templateResult,
    credentialResult,
    budgetResult,
    dataSourceResult,
    automationResult,
    contentResult,
  ] = await Promise.all([
    // Brand exists + name for profile check
    db.from('brands').select('name').eq('id', brandId).maybeSingle(),

    // Profile completeness fields
    db
      .from('brand_profiles')
      .select('industry, core_values, target_audience, tone_of_voice')
      .eq('brand_id', brandId)
      .maybeSingle(),

    // Voice configured — row exists with at least one non-empty field
    db
      .from('brand_voice')
      .select('tone, style, platform_guidelines, dos_and_donts, sample_copy, competitor_differentiation')
      .eq('brand_id', brandId)
      .maybeSingle(),

    // Template present — at least 1 active template
    db
      .from('brand_templates')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('is_active', true),

    // Credential connected — at least 1 active, non-expired credential
    db
      .from('credentials')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`),

    // Usage budget set
    db
      .from('usage_budgets')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('is_active', true),

    // Data source connected (non-archived)
    db
      .from('data_sources')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .neq('status', 'archived'),

    // Automation rules active
    db
      .from('content_automation_rules')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('is_active', true),

    // Content attempted — any post prepared for or sent to a channel
    db
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .in('status', ['queued', 'scheduled', 'publishing', 'published']),
  ]);

  // Platform account check is scope-conditional — only enforce for publishing scope
  const platformAccountCount =
    scope === 'publishing'
      ? (
          await db
            .from('platform_accounts')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', brandId)
            .eq('is_active', true)
        ).count ?? 0
      : null;

  // Profile: count non-null/non-empty among name + 4 profile fields
  const profileRow = profileResult.data;
  const brandName = brandResult.data?.name ?? null;
  const profileFilledCount = [
    brandName,
    profileRow?.industry ?? null,
    profileRow?.core_values ?? null,
    profileRow?.target_audience ?? null,
    profileRow?.tone_of_voice ?? null,
  ].filter((v) => v !== null && v.trim() !== '').length;

  // Voice: row exists and at least one field is non-empty
  const voiceRow = voiceResult.data;
  const voiceHasContent =
    voiceRow !== null &&
    [
      voiceRow.tone,
      voiceRow.style,
      voiceRow.platform_guidelines,
      voiceRow.dos_and_donts,
      voiceRow.sample_copy,
      voiceRow.competitor_differentiation,
    ].some((v) => v !== null && v.trim() !== '');

  const checks: BrandReadiness['checks'] = {
    brandExists: {
      pass: brandResult.data !== null,
      value: brandResult.data !== null ? 1 : 0,
    },
    profileComplete: {
      pass: profileFilledCount >= 5,
      value: profileFilledCount,
    },
    voiceConfigured: {
      pass: voiceHasContent,
      value: voiceHasContent ? 1 : 0,
    },
    templatePresent: {
      pass: (templateResult.count ?? 0) > 0,
      value: templateResult.count ?? 0,
    },
    credentialConnected: {
      pass: (credentialResult.count ?? 0) > 0,
      value: credentialResult.count ?? 0,
    },
    platformAccountActive:
      platformAccountCount !== null
        ? { pass: platformAccountCount > 0, value: platformAccountCount }
        : null,
    usageBudgetSet: {
      pass: (budgetResult.count ?? 0) > 0,
      value: budgetResult.count ?? 0,
    },
    dataSourceConnected: {
      pass: (dataSourceResult.count ?? 0) > 0,
      value: dataSourceResult.count ?? 0,
    },
    automationRulesActive: {
      pass: (automationResult.count ?? 0) > 0,
      value: automationResult.count ?? 0,
    },
    contentAttempted: {
      pass: (contentResult.count ?? 0) > 0,
      value: contentResult.count ?? 0,
    },
  };

  const requiredChecks: CheckResult[] = [
    checks.brandExists,
    checks.profileComplete,
    checks.voiceConfigured,
    checks.templatePresent,
    checks.credentialConnected,
    ...(checks.platformAccountActive ? [checks.platformAccountActive] : []),
  ];

  return {
    isReady: requiredChecks.every((c) => c.pass),
    checks,
  };
}
