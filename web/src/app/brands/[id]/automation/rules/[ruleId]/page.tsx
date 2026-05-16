import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import type { ContentAutomationRule } from '../../../../../../db/schema';
import { updateAutomationRule, setRuleActive } from '../../../../../../lib/automation-rule-actions';
import type { TriggerType } from '../../../../../../lib/automation-rule-constants';
import AutomationRuleForm from '../AutomationRuleForm';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; ruleId: string } };

export default async function AutomationRuleDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: ruleData }, { data: templatesData }, { data: competitionsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('content_automation_rules')
      .select('*')
      .eq('id', params.ruleId)
      .eq('brand_id', params.id)
      .maybeSingle(),
    db.from('brand_templates')
      .select('id, name, template_type')
      .eq('brand_id', params.id)
      .order('name'),
    db.from('sports_competitions')
      .select('id, name, season_label')
      .eq('brand_id', params.id)
      .order('name'),
  ]);

  if (!brandData) redirect('/brands');
  if (!ruleData) redirect(`/brands/${params.id}/automation/rules`);

  const rule = ruleData as ContentAutomationRule;
  const templates = (templatesData ?? []) as { id: string; name: string; template_type: string }[];
  const competitions = (competitionsData ?? []) as { id: string; name: string; season_label: string | null }[];

  const updateAction = updateAutomationRule.bind(null, params.id, params.ruleId);
  const activateAction = setRuleActive.bind(null, params.id, params.ruleId, true);
  const deactivateAction = setRuleActive.bind(null, params.id, params.ruleId, false);

  const existingConfig = rule.config as {
    hours_before_kickoff?: number;
    lookback_hours?: number;
    competition_id?: string;
    output_content_type?: string;
  };

  return (
    <div className="px-8 py-8 max-w-2xl">
      <Link
        href={`/brands/${params.id}/automation/rules`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Automation Rules
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              rule.is_active ? 'bg-green-900/40 text-green-300' : 'bg-slate-700 text-slate-500'
            }`}>
              {rule.is_active ? 'active' : 'inactive'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">{rule.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {rule.trigger_type} · {rule.source_type}
          </p>
        </div>

        <form action={rule.is_active ? deactivateAction : activateAction}>
          <button
            type="submit"
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              rule.is_active
                ? 'bg-yellow-900/60 text-yellow-300 hover:bg-yellow-900'
                : 'bg-green-800 text-green-200 hover:bg-green-700'
            }`}
          >
            {rule.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </form>
      </div>

      {/* Edit form */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-5 mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Rule configuration
        </h2>
        <AutomationRuleForm
          action={updateAction}
          submitLabel="Save"
          templates={templates}
          competitions={competitions}
          defaultValues={{
            name: rule.name,
            triggerType: rule.trigger_type as TriggerType,
            templateId: rule.template_id,
            config: existingConfig,
          }}
          cancelHref={`/brands/${params.id}/automation/rules`}
        />
      </section>

      {/* Metadata */}
      <section className="text-xs text-slate-700 space-y-0.5">
        <p>ID: <span className="font-mono">{rule.id}</span></p>
        <p>Created: {new Date(rule.created_at).toLocaleString()}</p>
        <p>Updated: {new Date(rule.updated_at).toLocaleString()}</p>
      </section>
    </div>
  );
}
