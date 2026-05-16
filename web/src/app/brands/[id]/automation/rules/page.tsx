import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { ContentAutomationRule } from '../../../../../db/schema';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function AutomationRulesPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: brandData }, { data: rulesData }] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    db.from('content_automation_rules')
      .select('*')
      .eq('brand_id', params.id)
      .order('name', { ascending: true }),
  ]);

  if (!brandData) redirect('/brands');

  const rules = (rulesData ?? []) as ContentAutomationRule[];
  const active = rules.filter((r) => r.is_active);
  const inactive = rules.filter((r) => !r.is_active);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Automation Rules</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {brandData.name} · {rules.length} rule{rules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href={`/brands/${params.id}/automation/rules/new`}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          New rule
        </Link>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-slate-500">No automation rules configured.</p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active</h2>
              <div className="space-y-2">
                {active.map((r) => <RuleRow key={r.id} rule={r} brandId={params.id} />)}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Inactive</h2>
              <div className="space-y-2">
                {inactive.map((r) => <RuleRow key={r.id} rule={r} brandId={params.id} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RuleRow({ rule, brandId }: { rule: ContentAutomationRule; brandId: string }) {
  return (
    <Link
      href={`/brands/${brandId}/automation/rules/${rule.id}`}
      className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-5 py-4 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              rule.is_active ? 'bg-green-900/40 text-green-300' : 'bg-slate-700 text-slate-500'
            }`}>
              {rule.is_active ? 'active' : 'inactive'}
            </span>
            <span className="text-xs text-slate-500">{rule.trigger_type}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-600">{rule.source_type}</span>
          </div>
          <p className="text-sm font-medium text-slate-200">{rule.name}</p>
        </div>
        <span className="text-xs text-slate-600 shrink-0">→</span>
      </div>
    </Link>
  );
}
