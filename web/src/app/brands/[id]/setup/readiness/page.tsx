import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import { computeBrandReadiness, CheckResult } from '../../../../../lib/readiness';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

function StatusDot({ pass, optional = false }: { pass: boolean; optional?: boolean }) {
  if (pass) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Done
      </span>
    );
  }
  if (optional) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Recommended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
      <span className="w-2 h-2 rounded-full bg-red-500" />
      Incomplete
    </span>
  );
}

function CheckRow({
  label,
  description,
  check,
  actionHref,
  actionLabel,
  optional = false,
}: {
  label: string;
  description: string;
  check: CheckResult | null;
  actionHref?: string;
  actionLabel?: string;
  optional?: boolean;
}) {
  if (check === null) return null;
  return (
    <li className="flex items-start justify-between gap-4 py-3 border-b border-slate-800 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <StatusDot pass={check.pass} optional={optional} />
          <span className="text-sm font-medium text-slate-200">{label}</span>
        </div>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {!check.pass && actionHref && (
        <Link
          href={actionHref}
          className="flex-shrink-0 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {actionLabel ?? 'Fix →'}
        </Link>
      )}
    </li>
  );
}

export default async function ReadinessPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();
  const [{ data: brand }, readiness] = await Promise.all([
    db.from('brands').select('id, name').eq('id', params.id).maybeSingle(),
    computeBrandReadiness(params.id),
  ]);
  if (!brand) notFound();

  const { checks, isReady } = readiness;
  const base = `/brands/${brand.id}`;

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`${base}/setup`}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Setup
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Readiness</h1>
          <p className="text-sm text-slate-400 mt-0.5">{brand.name}</p>
        </div>
        {isReady ? (
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-emerald-900 text-emerald-300">
            Go-live ready
          </span>
        ) : (
          <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-red-950 text-red-400">
            Not ready
          </span>
        )}
      </div>

      {/* Required checks */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Required
        </h2>
        <ul className="bg-slate-800/50 rounded-xl px-4 divide-y divide-slate-800">
          <CheckRow
            label="Brand exists"
            description="A brand record is present in the system."
            check={checks.brandExists}
          />
          <CheckRow
            label="Profile complete"
            description={`At least 5 core fields filled (name, industry, core values, target audience, tone of voice). Current: ${checks.profileComplete.value}/5.`}
            check={checks.profileComplete}
            actionHref={`${base}/profile`}
            actionLabel="Edit profile →"
          />
          <CheckRow
            label="Voice configured"
            description="Brand voice document exists with at least one field completed."
            check={checks.voiceConfigured}
            actionHref={`${base}/voice`}
            actionLabel="Add voice →"
          />
          <CheckRow
            label="Template present"
            description={`At least one active template. Current: ${checks.templatePresent.value} active.`}
            check={checks.templatePresent}
            actionHref={`${base}/knowledge/templates`}
            actionLabel="Add template →"
          />
          <CheckRow
            label="Credential connected"
            description={`At least one active, non-expired credential. Current: ${checks.credentialConnected.value} active.`}
            check={checks.credentialConnected}
            actionHref={`${base}/settings/credentials`}
            actionLabel="Add credential →"
          />
          {checks.platformAccountActive !== null && (
            <CheckRow
              label="Platform account active"
              description={`At least one active platform account (required for publishing). Current: ${checks.platformAccountActive.value} active.`}
              check={checks.platformAccountActive}
              actionHref={`${base}/settings/accounts`}
              actionLabel="Add account →"
            />
          )}
        </ul>
      </section>

      {/* Recommended checks */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Recommended
        </h2>
        <ul className="bg-slate-800/50 rounded-xl px-4 divide-y divide-slate-800">
          <CheckRow
            label="Usage budget set"
            description={`At least one active usage budget prevents runaway cost. Current: ${checks.usageBudgetSet.value} active.`}
            check={checks.usageBudgetSet}
            optional
          />
          <CheckRow
            label="Data source connected"
            description={`At least one non-archived data source. Required if a vertical (e.g. sports) is configured. Current: ${checks.dataSourceConnected.value}.`}
            check={checks.dataSourceConnected}
            actionHref={`${base}/data-sources`}
            actionLabel="Add source →"
            optional
          />
          <CheckRow
            label="Automation rules active"
            description={`At least one active automation rule. Needed if the brand uses automated posting. Current: ${checks.automationRulesActive.value} active.`}
            check={checks.automationRulesActive}
            actionHref={`${base}/automation/rules`}
            actionLabel="Add rule →"
            optional
          />
          <CheckRow
            label="Content attempted"
            description={`At least one post queued, scheduled, or published — confirms the publishing flow has been tested. Current: ${checks.contentAttempted.value}.`}
            check={checks.contentAttempted}
            actionHref={`${base}/publishing/queue`}
            actionLabel="Go to queue →"
            optional
          />
        </ul>
      </section>
    </div>
  );
}
