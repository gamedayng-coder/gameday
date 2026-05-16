import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../../lib/supabase/service';
import { createAutomationRule } from '../../../../../../lib/automation-rule-actions';
import AutomationRuleForm from '../AutomationRuleForm';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function NewAutomationRulePage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: templatesData }, { data: competitionsData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
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

  const templates = (templatesData ?? []) as { id: string; name: string; template_type: string }[];
  const competitions = (competitionsData ?? []) as { id: string; name: string; season_label: string | null }[];
  const action = createAutomationRule.bind(null, params.id);

  return (
    <div className="px-8 py-8 max-w-2xl">
      <Link
        href={`/brands/${params.id}/automation/rules`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Automation Rules
      </Link>

      <h1 className="text-xl font-bold text-slate-100 mb-6">New automation rule</h1>

      <AutomationRuleForm
        action={action}
        submitLabel="Create rule"
        templates={templates}
        competitions={competitions}
        cancelHref={`/brands/${params.id}/automation/rules`}
      />
    </div>
  );
}
